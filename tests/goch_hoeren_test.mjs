// Prüft die Sprecherkennung im Browser (goch-audio.js, erkenner; Robin, 23.10.2026: Gespräch ohne Knopf) mit künstlichen
// Blöcken: Beginn nach kurzer Lautheit, Ende nach einer Pause von 0,9 s, kurze Geräusche verworfen, Grundrauschen
// als leisester Block der letzten 1,5 s, höchstens 20 s, „Fertig“ beendet sofort. Aufruf: node tests/goch_hoeren_test.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fenster = {};
vm.runInNewContext(readFileSync(new URL("../goch-audio.js", import.meta.url), "utf8"), { window: fenster, performance, navigator: {}, matchMedia: () => ({ matches: false }) });
const { erkenner } = fenster.GochAudio;

let fehler = 0;
const check = (ok, text, info) => { console.log((ok ? "  ok   " : "  FAIL ") + text + (info !== undefined ? " (" + info + ")" : "")); if (!ok) fehler++; };

const RATE = 48000, BLOCK = 2048, MS = BLOCK / RATE * 1000; // ≈ 42,7 ms je Block
let phase = 0;
const block = (laut, rauschen = .002) => {
  const d = new Float32Array(BLOCK);
  for (let i = 0; i < BLOCK; i++) { phase += 2 * Math.PI * 180 / RATE; d[i] = laut * Math.sin(phase) * (.6 + .4 * Math.sin(phase / 40)) + rauschen * (Math.random() * 2 - 1); }
  return d;
};
// Spielt eine Folge [ms, Lautstärke, Rauschen] ab und sammelt, was der Erkenner meldet
function abspielen(e, folge) {
  const ereignisse = []; let zeit = 0;
  for (const [ms, laut, rauschen] of folge) {
    for (let t = 0; t < ms; t += MS, zeit += MS) {
      const r = e.block(block(laut, rauschen));
      if (r.start) ereignisse.push({ start: Math.round(zeit) });
      if (r.ende) ereignisse.push({ ende: Math.round(zeit), sprechMs: Math.round(r.sprechMs), teile: r.teile.length, zuKurz: r.zuKurz });
    }
  }
  return ereignisse;
}

console.log("1. Frage mit Pause");
let e = erkenner({ rate: RATE });
let ev = abspielen(e, [[1500, 0], [2000, .15], [1500, 0]]);
const start = ev.find(x => "start" in x), ende = ev.find(x => "ende" in x);
check(start && start.start >= 1500 && start.start <= 1700, "Beginn kurz nach dem ersten Laut", start && start.start);
check(ende && ende.ende >= 3500 + 850 && ende.ende <= 3500 + 1000, "Ende nach knapp einer Sekunde Pause", ende && ende.ende);
check(ende && !ende.zuKurz && Math.abs(ende.sprechMs - 2300) < 200, "gesprochene Dauer mit Vorlauf (gut 2 s)", ende && ende.sprechMs);
// Vorlauf 0,3 s vor dem erkannten Beginn (der 0,12 s nach dem ersten Laut liegt), Rede, 0,25 s Nachlauf
check(ende && Math.abs(ende.teile * MS - (300 + 2000 - 120 + 250)) < 160, "Abschnitt: Vorlauf, Rede, kurzer Nachlauf – lange Stille abgeschnitten", ende && Math.round(ende.teile * MS));
check(ev.filter(x => "ende" in x).length === 1 && !e.spricht, "genau ein Abschnitt, danach wieder bereit");

console.log("2. Kurze Geräusche und Atempausen");
e = erkenner({ rate: RATE });
ev = abspielen(e, [[1000, 0], [60, .3], [1500, 0]]);
check(!ev.length, "Klick unter 0,1 s: kein Beginn");
ev = abspielen(e, [[150, .3], [1200, 0]]);
check(ev.length === 2 && ev[1].zuKurz, "kurzes Räuspern: Beginn, aber als zu kurz verworfen", JSON.stringify(ev[1]));
e = erkenner({ rate: RATE });
ev = abspielen(e, [[1000, 0], [1200, .15], [500, 0], [1200, .15], [1200, 0]]);
check(ev.filter(x => "ende" in x).length === 1 && ev.find(x => "ende" in x).sprechMs > 2600, "Atempause von 0,5 s beendet die Frage nicht", JSON.stringify(ev));

console.log("3. Grundrauschen");
e = erkenner({ rate: RATE });
ev = abspielen(e, [[4000, 0, .03]]);
check(!ev.length, "gleichmäßiges Rauschen (Lüfter) gilt nicht als Sprache");
ev = abspielen(e, [[1500, .2, .03], [1500, 0, .03]]);
check(ev.some(x => "start" in x) && ev.some(x => "ende" in x && !x.zuKurz), "Rede über dem Rauschen wird erkannt und beendet", JSON.stringify(ev));

console.log("4. Höchstens 20 Sekunden, „Fertig“");
e = erkenner({ rate: RATE });
ev = abspielen(e, [[500, 0], [25000, .15]]);
const lang = ev.find(x => "ende" in x);
check(lang && lang.ende >= 500 + 19500 && lang.ende <= 500 + 20200, "nach 20 s abgeschlossen, auch ohne Pause", lang && lang.ende);
e = erkenner({ rate: RATE });
abspielen(e, [[500, 0], [1000, .15]]);
const f = e.fertig();
check(f && f.ende && !f.zuKurz && !e.spricht, "„Fertig“ beendet den laufenden Abschnitt sofort", f && Math.round(f.sprechMs));
check(e.fertig() === null, "„Fertig“ ohne laufenden Abschnitt: nichts");
e.block(block(.2)); e.block(block(.2)); e.block(block(.2)); e.block(block(.2)); e.zuruecksetzen();
check(!e.spricht, "zurücksetzen verwirft einen begonnenen Abschnitt (z. B. wenn Goch zu sprechen beginnt)");

console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : "\nSprecherkennung in Ordnung.");
process.exit(fehler ? 1 : 0);
