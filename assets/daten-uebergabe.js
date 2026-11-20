// Übergabe der Browser-Daten der Werkzeuge von robin.vision an smartformular.ai (Umzug 20.11.2026, PR B; Plan UMZUG_WERKZEUGE.md, Punkt 1).
// Gegenstück: smartformular.ai/daten-mitnehmen/ bzw. /en/bring-your-data/ (quelle/uebergabe.js). Protokoll, Version 1:
//   1. Klick hier „Meine Daten mitnehmen“ → öffnet smartformular.ai in einem Fenster (mit opener, sonst kann es nicht antworten).
//   2. Dort Klick „Daten empfangen“ → { typ: "sf-uebergabe-bereit", v: 1 } an https://robin.vision.
//   3. Erst dann, nur an dieses Fenster und nur an https://smartformular.ai: { typ: "rv-uebergabe-daten", v: 1, eintraege: {schlüssel: text} }.
//   4. Antwort { typ: "sf-uebergabe-ergebnis", v: 1, uebernommen: [schlüssel], abgelehnt: n } → Anzeige, danach Knopf „Alte Kopie löschen“.
// Regeln: nur postMessage, Zielherkunft fest (nie "*"), Herkunft und Fenster jeder Nachricht geprüft, nur die benannten Schlüssel,
// nie Daten in der Adresse (location wird nicht gelesen), kein Server, nichts ohne Klick. Gelöscht wird nur auf eigenen Klick mit Rückfrage
// und nur, was gesendet wurde und dort als übernommen gemeldet ist; abgelehnte Einträge bleiben hier.
(function () {
  "use strict";
  var wurzel = document.querySelector("[data-rv-uebergabe]");
  if (!wurzel) return;
  var ZIEL = "https://smartformular.ai";
  var SCHLUESSEL = ["rverechnung:firma", "rverechnung:nummer", "rverechnung:empfaenger", "rverechnung:katalog", "rverechnung:rechnungen",
    "rvlizenz:erechnung", "rvlizenz:fibu", "buchungsstapel-browser-1"];
  var en = document.documentElement.lang === "en";
  var T = en ? {
    keine: "There is no tool data from robin.vision in this browser. Nothing to take with you.",
    da: function (n) { return n + (n === 1 ? " entry" : " entries") + " found in this browser."; },
    offen: "A window of smartformular.ai has opened. Choose “Receive data” there.",
    blockiert: "The window could not open. Please allow pop-ups for robin.vision and try again.",
    gesendet: "Data sent. Waiting for confirmation from smartformular.ai …",
    fertig: function (n, a) { return n + (n === 1 ? " entry has" : " entries have") + " arrived on smartformular.ai." + (a ? " " + a + (a === 1 ? " entry was" : " entries were") + " not taken over and stay" + (a === 1 ? "s" : "") + " here; “Delete old copy” leaves " + (a === 1 ? "it" : "them") + " untouched." : ""); },
    nichts: "smartformular.ai has taken over nothing (cancelled there or no space).",
    frageLoeschen: function (n) { return "Delete the " + n + (n === 1 ? " entry" : " entries") + " that arrived on smartformular.ai from robin.vision? They stay on smartformular.ai. This cannot be undone."; },
    geloescht: "The old copy on robin.vision has been deleted.",
    weiter: "Continue to smartformular.ai"
  } : {
    keine: "In diesem Browser liegen keine Werkzeug-Daten von robin.vision. Es gibt nichts mitzunehmen.",
    da: function (n) { return n + (n === 1 ? " Eintrag" : " Einträge") + " in diesem Browser gefunden."; },
    offen: "Ein Fenster von smartformular.ai ist offen. Wählen Sie dort „Daten empfangen“.",
    blockiert: "Das Fenster ließ sich nicht öffnen. Bitte Pop-ups für robin.vision erlauben und noch einmal versuchen.",
    gesendet: "Daten gesendet. Warte auf die Bestätigung von smartformular.ai …",
    fertig: function (n, a) { return n + (n === 1 ? " Eintrag ist" : " Einträge sind") + " auf smartformular.ai angekommen." + (a ? " " + a + (a === 1 ? " Eintrag wurde" : " Einträge wurden") + " nicht übernommen und " + (a === 1 ? "bleibt" : "bleiben") + " hier; „Alte Kopie löschen“ lässt " + (a === 1 ? "ihn" : "sie") + " unberührt." : ""); },
    nichts: "smartformular.ai hat nichts übernommen (dort abgebrochen oder kein Platz).",
    frageLoeschen: function (n) { return "Die " + n + (n === 1 ? " Eintrag, der" : " Einträge, die") + " auf smartformular.ai angekommen " + (n === 1 ? "ist" : "sind") + ", auf robin.vision löschen? Auf smartformular.ai " + (n === 1 ? "bleibt er" : "bleiben sie") + ". Das lässt sich nicht rückgängig machen."; },
    geloescht: "Die alte Kopie auf robin.vision ist gelöscht.",
    weiter: "Weiter zu smartformular.ai"
  };
  var q = function (s) { return wurzel.querySelector(s); };
  var status = q("[data-ue-status]"), mitnehmen = q("[data-ue-mitnehmen]"), loeschen = q("[data-ue-loeschen]");
  var lies = function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
  var vorhanden = function () { return SCHLUESSEL.filter(function (k) { return lies(k) !== null; }); };
  var fenster = null, geklickt = false, gesendet = false, gesendeteSchluessel = [], angekommen = [];
  // Merker für die Weiterleitung (assets/umzug-weiter.js): erst setzen, wenn der Nutzer sich entschieden hat (mitnehmen oder weiter ohne)
  var entschieden = function () { try { window.localStorage.setItem("rv-uebergabe-angeboten", "1"); } catch (e) {} };
  var weiter = document.querySelector("[data-ue-weiter]");
  if (weiter) weiter.addEventListener("click", entschieden);
  var zeige = function (text) { status.textContent = text; };

  var start = vorhanden();
  if (!start.length) { zeige(T.keine); mitnehmen.hidden = true; return; }
  zeige(T.da(start.length));
  mitnehmen.hidden = false;

  mitnehmen.addEventListener("click", function () {
    geklickt = true; gesendet = false; entschieden();
    fenster = window.open(ZIEL + (en ? "/en/bring-your-data/" : "/daten-mitnehmen/"), "sf-uebergabe");
    zeige(fenster ? T.offen : T.blockiert);
  });

  window.addEventListener("message", function (ev) {
    if (ev.origin !== ZIEL || !fenster || ev.source !== fenster) return;
    var d = ev.data;
    if (!d || typeof d !== "object" || d.v !== 1) return;
    if (d.typ === "sf-uebergabe-bereit" && geklickt && !gesendet) {
      var eintraege = {};
      vorhanden().forEach(function (k) { var w = lies(k); if (typeof w === "string") eintraege[k] = w; });
      gesendeteSchluessel = Object.keys(eintraege);
      gesendet = true;
      fenster.postMessage({ typ: "rv-uebergabe-daten", v: 1, eintraege: eintraege }, ZIEL);
      zeige(T.gesendet);
    } else if (d.typ === "sf-uebergabe-ergebnis" && gesendet) {
      // Nur Einträge, die wir gesendet haben und die smartformular.ai als übernommen meldet, kommen später für „Löschen“ in Frage
      angekommen = (Array.isArray(d.uebernommen) ? d.uebernommen : []).filter(function (k) { return gesendeteSchluessel.indexOf(k) >= 0; });
      var n = angekommen.length, rest = gesendeteSchluessel.length - n;
      zeige(n ? T.fertig(n, rest) : T.nichts);
      gesendet = false; geklickt = false;
      loeschen.hidden = !n;
    }
  });

  loeschen.addEventListener("click", function () {
    if (!angekommen.length || !window.confirm(T.frageLoeschen(angekommen.length))) return;
    angekommen.forEach(function (k) { try { window.localStorage.removeItem(k); } catch (e) {} });
    angekommen = []; loeschen.hidden = true;
    var uebrig = vorhanden();
    mitnehmen.hidden = !uebrig.length;
    zeige(T.geloescht + (uebrig.length ? " " + T.da(uebrig.length) : ""));
  });
})();
