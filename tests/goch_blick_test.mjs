// Prüft die Rechnung für Gochs Blickkontakt (goch-blickrechnung.js; Robin, 23.10.2026): Kopfrichtung aus der Matrix,
// ungefähre Blickrichtung aus Iris und Augenwinkeln, Zusammenfassung (da, Lage aus Sicht des Besuchers, schaut her).
// Aufruf: node tests/goch_blick_test.mjs
import { kopfrichtung, blick, auswerten } from "../goch-blickrechnung.js";

let fehler = 0;
const check = (ok, text, info) => { console.log((ok ? "  ok   " : "  FAIL ") + text + (info !== undefined ? " (" + info + ")" : "")); if (!ok) fehler++; };
const nahe = (a, b, d = 1) => Math.abs(a - b) <= d;
const grad = g => g * Math.PI / 180;
// Spaltenweise 4×4-Matrizen wie bei MediaPipe
const drehY = g => [Math.cos(grad(g)), 0, -Math.sin(grad(g)), 0, 0, 1, 0, 0, Math.sin(grad(g)), 0, Math.cos(grad(g)), 0, 0, 0, 0, 1];
const drehX = g => [1, 0, 0, 0, 0, Math.cos(grad(g)), Math.sin(grad(g)), 0, 0, -Math.sin(grad(g)), Math.cos(grad(g)), 0, 0, 0, 0, 1];

console.log("1. Kopfrichtung");
let k = kopfrichtung(drehY(0));
check(nahe(k.gier, 0) && nahe(k.nick, 0), "gerade: 0° / 0°", `${k.gier} / ${k.nick}`);
k = kopfrichtung(drehY(30));
check(nahe(k.gier, 30) && nahe(k.nick, 0), "zur Seite gedreht: 30°", k.gier);
k = kopfrichtung(drehX(-20));
check(nahe(k.gier, 0) && nahe(k.nick, -20), "gesenkt: −20°", k.nick);

// Gesicht aus 478 Punkten: Augenwinkel 33/133 und 263/362, Iris 468/473
function gesicht({ mitte = .5, iris = 0, breite = .3 } = {}) {
  const p = Array.from({ length: 478 }, (_, i) => ({ x: mitte + (i % 2 ? 1 : -1) * breite / 2 * ((i % 7) / 7), y: .45 + ((i % 5) - 2) * .04, z: 0 }));
  const auge = (aussen, innen, ir, x0, x1) => { p[aussen] = { x: x0, y: .4, z: 0 }; p[innen] = { x: x1, y: .4, z: 0 }; p[ir] = { x: (x0 + x1) / 2 + iris * Math.abs(x1 - x0), y: .4, z: 0 }; }; // beide Iris in dieselbe Richtung
  auge(33, 133, 468, mitte - .12, mitte - .04); auge(263, 362, 473, mitte + .12, mitte + .04);
  p[0] = { x: mitte - breite / 2, y: .3, z: 0 }; p[1] = { x: mitte + breite / 2, y: .7, z: 0 };
  return p;
}

console.log("2. Blickrichtung");
check(nahe(blick(gesicht()).x, 0, .01), "Iris mittig: geradeaus");
check(Math.abs(blick(gesicht({ iris: .3 })).x) > .2, "Iris seitlich: schaut weg", blick(gesicht({ iris: .3 })).x.toFixed(2));
check(blick([]).x === 0, "zu wenige Punkte: neutral");

console.log("3. Zusammenfassung");
check(auswerten([], null).da === false && auswerten(null, null).da === false, "kein Gesicht: da = false");
let a = auswerten(gesicht({ mitte: .3 }), drehY(5));
check(a.da && nahe(a.x, .7, .02) && a.schautHer, "Gesicht links im Kamerabild = rechts vom Besucher aus gesehen, schaut her", JSON.stringify(a));
check(!auswerten(gesicht(), drehY(40)).schautHer, "Kopf weggedreht: schaut nicht her");
check(!auswerten(gesicht({ iris: .3 }), drehY(0)).schautHer, "Augen zur Seite: schaut nicht her");
check(Object.keys(a).sort().join() === "da,gier,groesse,nick,schautHer,x,y", "nur diese Zahlen – keine Punkte, kein Bild, keine Ausdruckswerte", Object.keys(a).join());

console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : "\nBlickkontakt-Rechnung in Ordnung.");
process.exit(fehler ? 1 : 0);
