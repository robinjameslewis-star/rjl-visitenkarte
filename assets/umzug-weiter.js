// Weiterleitung alter Werkzeug-Adressen nach smartformular.ai (Umzug 20.11.2026, W1 als Rückfall; mit 301 an der Kante nie erreicht).
// Liegen in diesem Browser Daten der Werkzeuge und wurde die Übergabe noch nie angeboten, zeigt die Seite einmal die Übergabe-Seite.
// Keine Daten in der Adresse: Ziel ist fest im Attribut data-ziel, die Übergabe-Seite bekommt keinen Parameter.
(function () {
  "use strict";
  var s = document.currentScript, ziel = s && s.getAttribute("data-ziel"), uebergabe = s && s.getAttribute("data-uebergabe");
  if (!ziel || ziel.indexOf("https://smartformular.ai/") !== 0) return;
  var SCHLUESSEL = ["rverechnung:firma", "rverechnung:nummer", "rverechnung:empfaenger", "rverechnung:katalog", "rverechnung:rechnungen",
    "rvlizenz:erechnung", "rvlizenz:fibu", "buchungsstapel-browser-1"];
  var daten = false, angeboten = true;
  try {
    daten = SCHLUESSEL.some(function (k) { return window.localStorage.getItem(k) !== null; });
    angeboten = window.localStorage.getItem("rv-uebergabe-angeboten") === "1";
    if (daten && !angeboten) window.localStorage.setItem("rv-uebergabe-angeboten", "1");
  } catch (e) { daten = false; }
  window.location.replace(daten && !angeboten && uebergabe ? uebergabe : ziel);
})();
