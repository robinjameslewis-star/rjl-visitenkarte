// fontoxpath rechnet xs:decimal mit JS-Gleitkommazahlen (336.9 + 0.01 = 336.90999999999997). Die Regeln von CEN und KoSIT vergleichen
// Beträge exakt; Saxon rechnet mit echten Dezimalzahlen. Der Patch rundet jedes Dezimal-Ergebnis von +, -, *, mod und sum() auf die
// exakte Stellenzahl der Operanden (bei Division auf 15 signifikante Stellen). Außerdem lehnt fontoxpath Kalenderdaten wie 2026-02-30
// nicht ab (Saxon schon: „Non-existent date“); der Patch prüft den Tag gegen den Monat. Und wie Saxon werten and/or „nachsichtig“ aus
// (XPath 3.1, 3.8: Reihenfolge implementierungsabhängig): Wirft ein Operand einen Fehler, entscheidet ein anderer, der false (and)
// bzw. true (or) ergibt; sonst gilt der Fehler. Allgemeine Vergleiche (=, < …) laufen wie bei Saxon: rechter Operand außen, linker
// innen, Ende beim ersten Treffer. Und eine zwischengespeicherte Variable, deren Auswertung scheiterte, meldet den Fehler bei jedem
// weiteren Zugriff erneut (sonst wäre sie beim zweiten Mal leer). Jede Ersetzung muss genau einmal greifen.
import { readFileSync } from "node:fs";
const HELFER = `const __rvSkala=x=>{if(!isFinite(x)||Math.floor(x)===x)return 0;let s=String(Math.abs(x)),e=0;const m=/e([+-]\\d+)$/i.exec(s);if(m){e=+m[1];s=s.slice(0,m.index)}const i=s.indexOf(".");return Math.max(0,(i<0?0:s.length-i-1)-e)};
const __rvRund=(r,k)=>!isFinite(r)||k>20?r:Number(r.toFixed(k));
const __rvDec=(op,n,r,x,y)=>{if(4!==n||!isFinite(r))return r;if("addOp"===op||"subtractOp"===op||"modOp"===op)return __rvRund(r,Math.max(__rvSkala(x),__rvSkala(y)));if("multiplyOp"===op)return __rvRund(r,__rvSkala(x)+__rvSkala(y));if("divOp"===op)return Number(r.toPrecision(15));return r};
const __rvSumme=w=>w.reduce((s,x)=>__rvRund(s+x,Math.max(__rvSkala(s),__rvSkala(x))),0);
`;
const ERSETZUNGEN = [
  ["function Ra(a){const b=[],c=a.value;return()=>{let d=0;return w.create({next:()=>{if(void 0!==b[d])return b[d++];const e=c.next(0);return e.done?e:b[d++]=e}})}}", "function Ra(a){const b=[],c=a.value;let __e=null;return()=>{let d=0;return w.create({next:()=>{if(void 0!==b[d])return b[d++];if(__e)throw __e;let e;try{e=c.next(0)}catch(__x){__e=__x;throw __x}return e.done?e:b[d++]=e}})}}"],
  ["function xi(a,b,c,d){a=wi[a];return c.M(e=>b.filter(f=>{for(let l=0,n=e.length;l<n;++l){let t=e[l],u=void 0,z=void 0;var h=f.type,k=t.type;if(v(h,19)||v(k,19))v(h,2)?u=3:v(k,2)?z=3:v(h,17)?u=17:v(k,17)?z=17:v(h,16)?u=16:v(k,16)?z=16:v(h,19)?z=k:v(k,19)&&(u=h);const [y,F]=[z,u];h=y;k=F;h?f=kd(f,h):k&&(t=kd(t,k));if(ui(a,f.type,t.type)(f,t,d))return!0}return!1}).X({default:()=>w.$(),empty:()=>w.S()}))}", "function xi(a,b,c,d){a=wi[a];return c.M(e=>b.M(g=>{for(let l=0,n=e.length;l<n;++l)for(let m=0,o=g.length;m<o;++m){let f=g[m],t=e[l],u=void 0,z=void 0;var h=f.type,k=t.type;if(v(h,19)||v(k,19))v(h,2)?u=3:v(k,2)?z=3:v(h,17)?u=17:v(k,17)?z=17:v(h,16)?u=16:v(k,16)?z=16:v(h,19)?z=k:v(k,19)&&(u=h);const [y,F]=[z,u];h=y;k=F;h?f=kd(f,h):k&&(t=kd(t,k));if(ui(a,f.type,t.type)(f,t,d))return w.$()}return w.S()}))}"],
  ["return w.create({next:()=>{if(!e){for(;c<this.l.length;){if(!d){const h=this.l[c];if(null!==f&&null!==h.D()&&!f.includes(h.D()))return c++,e=!0,q(wa);d=A(h,a,b)}if(!1===d.ea())return e=!0,q(wa);d=null;c++}e=!0;return q(va)}return p}})", "return w.create({next:()=>{if(!e){let __f=null;for(;c<this.l.length;){const h=this.l[c];if(null!==f&&null!==h.D()&&!f.includes(h.D()))return c++,e=!0,q(wa);let __w;try{__w=A(h,a,b).ea()}catch(__x){__f||(__f=__x);c++;continue}if(!1===__w)return e=!0,q(wa);c++}e=!0;if(__f)throw __f;return q(va)}return p}})"],
  ["return w.create({next:()=>{if(!e){for(;c<this.l.length;){if(!d){const h=this.l[c];if(null!==f&&null!==h.D()&&!f.includes(h.D())){c++;continue}d=A(h,a,b)}if(!0===d.ea())return e=\n!0,q(va);d=null;c++}e=!0;return q(wa)}return p}})", "return w.create({next:()=>{if(!e){let __f=null;for(;c<this.l.length;){const h=this.l[c];if(null!==f&&null!==h.D()&&!f.includes(h.D())){c++;continue}let __w;try{__w=A(h,a,b).ea()}catch(__x){__f||(__f=__x);c++;continue}if(!0===__w)return e=!0,q(va);c++}e=!0;if(__f)throw __f;return q(wa)}return p}})"],
  ["b=b[9]?Cb(b[9]):null;", "b=b[9]?Cb(b[9]):null;if(null!==a&&null!==c&&null!==d&&(1>c||12<c||1>d||d>new Date(Date.UTC(2000+(a%400+400)%400,c,0)).getUTCDate()))throw Error(\"FORG0001: Invalid date: non-existent date\");"],
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
