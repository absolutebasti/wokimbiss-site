// Nur Bedienung: Öffnungsstatus, heutiger Tag, Suche und Filter, aktive Kategorie, Einblenden.
// Ohne JavaScript bleibt alles sichtbar.
(function () {
  "use strict";

  var cfg = window.__WOK__ || { zeiten: [], zu: [] };
  var TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  // ---------- Öffnungsstatus (Uhrzeit in Deutschland, egal wo das Handy eingestellt ist) ----------
  function jetztBerlin() {
    var teile = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    var o = {};
    teile.forEach(function (t) { o[t.type] = t.value; });
    return { datum: new Date(Date.UTC(+o.year, +o.month - 1, +o.day)), minuten: (+o.hour % 24) * 60 + +o.minute };
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function plusTage(d, n) { var x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
  function ostern(j) {
    var a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451), monat = Math.floor((h + l - 7 * m + 114) / 31),
      tag = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(j, monat - 1, tag));
  }
  // Gesetzliche Feiertage in Bayern (ohne Mariä Himmelfahrt und Friedensfest, die nur örtlich gelten)
  function feiertage(j) {
    var o = ostern(j);
    return [j + "-01-01", j + "-01-06", iso(plusTage(o, -2)), iso(plusTage(o, 1)), j + "-05-01",
      iso(plusTage(o, 39)), iso(plusTage(o, 50)), iso(plusTage(o, 60)), j + "-10-03", j + "-11-01", j + "-12-25", j + "-12-26"];
  }
  function istFeiertag(d) { return feiertage(d.getUTCFullYear()).indexOf(iso(d)) !== -1; }
  function zeitenAm(d) {
    if (istFeiertag(d) || cfg.zu.indexOf(iso(d)) !== -1) return null;
    for (var i = 0; i < cfg.zeiten.length; i++) if (cfg.zeiten[i].tag === d.getUTCDay()) return cfg.zeiten[i];
    return null;
  }
  function min(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }
  function status() {
    var n = jetztBerlin(), heute = zeitenAm(n.datum);
    if (heute && n.minuten >= min(heute.von) && n.minuten < min(heute.bis)) return { offen: true, text: "Jetzt geöffnet · bis " + heute.bis + " Uhr" };
    if (heute && n.minuten < min(heute.von)) return { offen: false, text: "Geschlossen · öffnet heute um " + heute.von + " Uhr" };
    for (var t = 1; t <= 14; t++) {
      var d = plusTage(n.datum, t), z = zeitenAm(d);
      if (z) {
        var wann = t === 1 ? "morgen" : "am " + TAGE[d.getUTCDay()];
        return { offen: false, text: (istFeiertag(n.datum) ? "Heute Feiertag" : "Geschlossen") + " · öffnet " + wann + " um " + z.von + " Uhr" };
      }
    }
    return null;
  }
  var s = status();
  if (s) document.querySelectorAll("[data-status]").forEach(function (el) { el.textContent = s.text; el.setAttribute("data-open", String(s.offen)); });
  var wochentag = jetztBerlin().datum.getUTCDay();
  document.querySelectorAll('[data-tag="' + wochentag + '"]').forEach(function (el) { el.classList.add("today"); });

  // ---------- Hintergrund-Video im Kopfbereich (nicht bei reduzierter Bewegung oder Datensparmodus) ----------
  var heroBild = document.querySelector("[data-video-gross]");
  var spart = navigator.connection && navigator.connection.saveData;
  var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroBild && !spart && !ruhig) {
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.preload = "auto";
    v.src = window.matchMedia("(min-width: 700px)").matches ? heroBild.getAttribute("data-video-gross") : heroBild.getAttribute("data-video-klein");
    v.addEventListener("playing", function () { v.classList.add("spielt"); });
    heroBild.appendChild(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* Autoplay blockiert: Standbild bleibt */ });
    // Video nur abspielen, solange der Kopfbereich sichtbar ist
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause(); });
      }).observe(heroBild);
    }
  }

  // ---------- Einblenden beim Scrollen (einmal) ----------
  var reveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(function (el) { rv.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add("in"); });
  }

  // ---------- Speisekarte: aktive Kategorie ----------
  var leiste = document.querySelector(".chips ul");
  var abschnitte = Array.prototype.slice.call(document.querySelectorAll(".cat[id]"));
  var links = {};
  if (leiste) leiste.querySelectorAll("a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var aktiv = null;
  function setze(id) {
    if (id === aktiv || !links[id]) return;
    if (aktiv && links[aktiv]) links[aktiv].removeAttribute("aria-current");
    aktiv = id;
    var a = links[id];
    a.setAttribute("aria-current", "true");
    var li = a.parentElement;
    if (leiste.scrollWidth > leiste.clientWidth) {
      var ziel = li.offsetLeft - 16;
      if (ziel < leiste.scrollLeft || li.offsetLeft + li.offsetWidth > leiste.scrollLeft + leiste.clientWidth - 28) {
        leiste.scrollTo({ left: Math.max(0, ziel), behavior: "smooth" });
      }
    }
  }
  if (leiste && abschnitte.length && "IntersectionObserver" in window) {
    var sichtbar = {};
    var beob = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { sichtbar[e.target.id] = e.isIntersecting; });
      for (var i = 0; i < abschnitte.length; i++) {
        if (sichtbar[abschnitte[i].id] && !abschnitte[i].hidden) { setze(abschnitte[i].id); return; }
      }
      if (!aktiv) setze(abschnitte[0].id);
    }, { rootMargin: "-80px 0px -55% 0px" });
    abschnitte.forEach(function (a) { beob.observe(a); });
  }

  // ---------- Speisekarte: Suche und Filter ----------
  var werkzeuge = document.querySelector("[data-tools]");
  if (!werkzeuge) return;
  werkzeuge.hidden = false;
  var feld = werkzeuge.querySelector("[data-suche]");
  var knoepfe = werkzeuge.querySelectorAll("[data-filter]");
  var leer = document.querySelector("[data-leer]");
  var anzahl = document.querySelector("[data-anzahl]");
  var reis = document.querySelector(".rice-note");
  var hinweise = document.querySelector(".legal-notes");
  var filter = { veg: false, mild: false };

  function norm(t) { return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").trim(); }

  function anwenden() {
    var q = norm(feld.value);
    var nurNummer = /^e?\d{1,2}[ab]?$/.test(q) && document.querySelector('.dish[data-nr="' + q + '"]');
    var woerter = q.split(/\s+/).filter(Boolean);
    var aktivGesamt = q || filter.veg || filter.mild;
    var treffer = 0;
    abschnitte.forEach(function (sec) {
      var erstes = null, n = 0;
      sec.querySelectorAll(".dish").forEach(function (li) {
        var ok = true;
        if (nurNummer) ok = li.getAttribute("data-nr") === q;
        else if (woerter.length) ok = woerter.every(function (w) { return li.getAttribute("data-such").indexOf(w) !== -1; });
        if (ok && filter.veg) ok = li.getAttribute("data-veg") === "1";
        if (ok && filter.mild) ok = li.getAttribute("data-scharf") === "0";
        li.hidden = !ok;
        li.classList.remove("erst");
        if (ok) { n++; if (!erstes) erstes = li; }
      });
      if (erstes) erstes.classList.add("erst");
      var unter = sec.querySelector(".cat-head p");
      if (unter) {
        if (!unter.hasAttribute("data-text")) unter.setAttribute("data-text", unter.textContent);
        unter.textContent = aktivGesamt ? n + " Treffer" : unter.getAttribute("data-text");
      }
      var note = sec.querySelector(".cat-note");
      if (note) note.hidden = Boolean(aktivGesamt);
      sec.hidden = n === 0;
      if (links[sec.id]) links[sec.id].parentElement.hidden = n === 0;
      treffer += n;
    });
    leer.hidden = treffer > 0;
    if (reis) reis.hidden = Boolean(aktivGesamt);
    if (hinweise) hinweise.hidden = false;
    anzahl.textContent = aktivGesamt ? treffer + (treffer === 1 ? " Gericht gefunden" : " Gerichte gefunden") : "";
  }

  // ?suche=... in der Adresse füllt die Suche vor (zum Teilen und Testen)
  try {
    var vorgabe = new URLSearchParams(location.search).get("suche");
    if (vorgabe) { feld.value = vorgabe; anwenden(); }
  } catch (e) { /* alte Browser */ }

  var timer;
  feld.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(anwenden, 90); });
  feld.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      feld.blur();
      var erster = document.querySelector(".cat:not([hidden])");
      if (erster && feld.value) erster.scrollIntoView({ block: "start" });
    }
  });
  knoepfe.forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-filter");
      filter[k] = !filter[k];
      b.setAttribute("aria-pressed", String(filter[k]));
      anwenden();
    });
  });
  document.querySelector("[data-reset]").addEventListener("click", function () {
    feld.value = "";
    filter.veg = filter.mild = false;
    knoepfe.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    anwenden();
    feld.focus();
  });
})();

// Anruf-Knopf unten: sichtbar, sobald der Knopf in der Kopfzeile aus dem Bild ist.
(function () {
  var dock = document.querySelector(".call-dock-bar");
  var kopf = document.querySelector(".head .btn-call");
  if (!dock || !kopf) return;
  function sichtbar() {
    var r = kopf.getBoundingClientRect();
    return r.bottom > 8 && r.top < window.innerHeight - 8;
  }
  function setzen() { dock.classList.toggle("weg", sichtbar()); }
  setzen();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(setzen, { threshold: [0, 1] }).observe(kopf);
  }
  window.addEventListener("scroll", setzen, { passive: true });
  window.addEventListener("resize", setzen);
})();
