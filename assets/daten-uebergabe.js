// Übergabe der Browser-Daten der Werkzeuge von robin.vision an smartformular.ai (Umzug 20.11.2026, PR B; Plan UMZUG_WERKZEUGE.md, Punkt 1).
// Gegenstück: smartformular.ai/daten-mitnehmen/ bzw. /en/bring-your-data/ (quelle/uebergabe.js). Protokoll, Version 1:
//   1. Klick hier „Meine Daten mitnehmen“ → öffnet smartformular.ai in einem Fenster (mit opener, sonst kann es nicht antworten).
//   2. Dort Klick „Daten empfangen“ → { typ: "sf-uebergabe-bereit", v: 1 } an https://robin.vision.
//   3. Erst dann, nur an dieses Fenster und nur an https://smartformular.ai: { typ: "rv-uebergabe-daten", v: 1, eintraege: {schlüssel: text} }.
//   4. Antwort { typ: "sf-uebergabe-ergebnis", v: 1, uebernommen: [schlüssel], abgelehnt: n } → Anzeige, danach Knopf „Alte Kopie löschen“.
// Regeln: nur postMessage, Zielherkunft fest (nie "*"), Herkunft und Fenster jeder Nachricht geprüft, nur die benannten Schlüssel,
// nie Daten in der Adresse (location wird nicht gelesen), kein Server, nichts ohne Klick. Gelöscht wird nur auf eigenen Klick mit Rückfrage.
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
    fertig: function (n, a) { return n + (n === 1 ? " entry has" : " entries have") + " arrived on smartformular.ai." + (a ? " " + a + " not taken over." : ""); },
    nichts: "smartformular.ai has taken over nothing (cancelled there or no space).",
    frageLoeschen: "Delete the old copy on robin.vision? The entries on smartformular.ai stay. This cannot be undone.",
    geloescht: "The old copy on robin.vision has been deleted.",
    weiter: "Continue to smartformular.ai"
  } : {
    keine: "In diesem Browser liegen keine Werkzeug-Daten von robin.vision. Es gibt nichts mitzunehmen.",
    da: function (n) { return n + (n === 1 ? " Eintrag" : " Einträge") + " in diesem Browser gefunden."; },
    offen: "Ein Fenster von smartformular.ai ist offen. Wählen Sie dort „Daten empfangen“.",
    blockiert: "Das Fenster ließ sich nicht öffnen. Bitte Pop-ups für robin.vision erlauben und noch einmal versuchen.",
    gesendet: "Daten gesendet. Warte auf die Bestätigung von smartformular.ai …",
    fertig: function (n, a) { return n + (n === 1 ? " Eintrag ist" : " Einträge sind") + " auf smartformular.ai angekommen." + (a ? " " + a + " nicht übernommen." : ""); },
    nichts: "smartformular.ai hat nichts übernommen (dort abgebrochen oder kein Platz).",
    frageLoeschen: "Alte Kopie auf robin.vision löschen? Die Einträge auf smartformular.ai bleiben. Das lässt sich nicht rückgängig machen.",
    geloescht: "Die alte Kopie auf robin.vision ist gelöscht.",
    weiter: "Weiter zu smartformular.ai"
  };
  var q = function (s) { return wurzel.querySelector(s); };
  var status = q("[data-ue-status]"), mitnehmen = q("[data-ue-mitnehmen]"), loeschen = q("[data-ue-loeschen]");
  var lies = function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
  var vorhanden = function () { return SCHLUESSEL.filter(function (k) { return lies(k) !== null; }); };
  var fenster = null, geklickt = false, gesendet = false;
  var zeige = function (text) { status.textContent = text; };

  var start = vorhanden();
  if (!start.length) { zeige(T.keine); mitnehmen.hidden = true; return; }
  zeige(T.da(start.length));
  mitnehmen.hidden = false;

  mitnehmen.addEventListener("click", function () {
    geklickt = true; gesendet = false;
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
      gesendet = true;
      fenster.postMessage({ typ: "rv-uebergabe-daten", v: 1, eintraege: eintraege }, ZIEL);
      zeige(T.gesendet);
    } else if (d.typ === "sf-uebergabe-ergebnis" && gesendet) {
      var n = Array.isArray(d.uebernommen) ? d.uebernommen.length : 0;
      zeige(n ? T.fertig(n, +d.abgelehnt || 0) : T.nichts);
      gesendet = false; geklickt = false;
      if (n) { loeschen.hidden = false; try { window.sessionStorage.setItem("rv-uebergabe-gezeigt", "1"); } catch (e) {} }
    }
  });

  loeschen.addEventListener("click", function () {
    if (!window.confirm(T.frageLoeschen)) return;
    SCHLUESSEL.concat(["rv-regeln", "rv-beispiele", "rverechnung:probe"]).forEach(function (k) { try { window.localStorage.removeItem(k); } catch (e) {} });
    loeschen.hidden = true; mitnehmen.hidden = true;
    zeige(T.geloescht);
  });
})();
