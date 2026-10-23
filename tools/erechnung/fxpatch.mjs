// fontoxpath rechnet xs:decimal mit JS-Gleitkommazahlen (336.9 + 0.01 = 336.90999999999997). Die Regeln von CEN und KoSIT vergleichen
// Beträge exakt; Saxon rechnet mit echten Dezimalzahlen. Der Patch rundet jedes Dezimal-Ergebnis von +, -, *, mod und sum() auf die
// exakte Stellenzahl der Operanden (bei Division auf 15 signifikante Stellen). Jede Ersetzung muss genau einmal greifen.
import { readFileSync } from "node:fs";
const HELFER = `const __rvSkala=x=>{if(!isFinite(x)||Math.floor(x)===x)return 0;let s=String(Math.abs(x)),e=0;const m=/e([+-]\\d+)$/i.exec(s);if(m){e=+m[1];s=s.slice(0,m.index)}const i=s.indexOf(".");return Math.max(0,(i<0?0:s.length-i-1)-e)};
const __rvRund=(r,k)=>!isFinite(r)||k>20?r:Number(r.toFixed(k));
const __rvDec=(op,n,r,x,y)=>{if(4!==n||!isFinite(r))return r;if("addOp"===op||"subtractOp"===op||"modOp"===op)return __rvRund(r,Math.max(__rvSkala(x),__rvSkala(y)));if("multiplyOp"===op)return __rvRund(r,__rvSkala(x)+__rvSkala(y));if("divOp"===op)return Number(r.toPrecision(15));return r};
const __rvSumme=w=>w.reduce((s,x)=>__rvRund(s+x,Math.max(__rvSkala(s),__rvSkala(x))),0);
`;
const ERSETZUNGEN = [
  ["return g(l(z.value,y.value),n)}}", "return g(__rvDec(a,n,l(z.value,y.value),z.value,y.value),n)}}"],
  ["b=a.reduce((f,h)=>f+h.value,0);return a.every(f=>v(f.type,5))", "b=a.reduce((f,h)=>f+h.value,0);a.every(f=>v(f.type,4)||v(f.type,5))&&(b=__rvSumme(a.map(f=>f.value)));return a.every(f=>v(f.type,5))"],
];
export function patchen(quelle) {
  let t = quelle;
  for (const [alt, neu] of ERSETZUNGEN) {
    const n = t.split(alt).length - 1;
    if (n !== 1) throw new Error(`fontoxpath-Patch: „${alt.slice(0, 40)}…“ ${n}-mal gefunden (erwartet 1) – fontoxpath-Fassung prüfen`);
    t = t.replace(alt, () => neu);
  }
  const anker = "const VERSION=";
  if (!t.includes(anker)) throw new Error("fontoxpath-Patch: Anker fehlt");
  return t.replace(anker, () => HELFER + anker);
}
if (process.argv[1] && process.argv[1].endsWith("fxpatch.mjs")) {
  const { writeFileSync } = await import("node:fs");
  const [, , ein, aus] = process.argv;
  writeFileSync(aus, patchen(readFileSync(ein, "utf8")));
  console.log("gepatcht:", aus);
}
