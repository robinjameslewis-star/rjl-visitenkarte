// „Was ist neu“ einer Werkzeugseite (Robin, 16.10.2026: jede neue Fassung wird auf der Website angekündigt und beschrieben; der
// neueste Eintrag steht auch im Newsletter). Feld `neuigkeiten` der Seite: Markdown mit einer Überschrift je Fassung, neueste
// zuerst – deutsch „### Fassung a1b2c3d vom 15.10.2026“, englisch „### Version a1b2c3d, 15 October 2026“ –, darunter Stichpunkte.
// Keine Abhängigkeiten: werkzeug.js (Seite) und blog.js (Newsletter-Feed) lesen beide hiermit.
const MONATE_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// Einträge in der Reihenfolge des Textes: { fassung (7 Zeichen oder ""), datum (ISO oder ""), titel (Überschrift ohne ###), text (Markdown) }
export function neuigkeiten(text) {
  const teile = String(text || "").replace(/\r\n?/g, "\n").split(/\n(?=### )/).map(t => t.trim()).filter(t => t.startsWith("### "));
  return teile.map(t => {
    const [kopf, ...rest] = t.split("\n");
    const fassung = (kopf.match(/\b([0-9a-f]{7})\b/) || [])[1] || "";
    let datum = "";
    const de = kopf.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/), en = kopf.match(/(\d{1,2})\.? ([A-Za-z]+) (\d{4})/);
    if (de) datum = `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
    else if (en && MONATE_EN.includes(en[2].toLowerCase())) datum = `${en[3]}-${String(MONATE_EN.indexOf(en[2].toLowerCase()) + 1).padStart(2, "0")}-${en[1].padStart(2, "0")}`;
    return { fassung, datum, titel: kopf.replace(/^###\s*/, "").trim(), text: rest.join("\n").trim() };
  });
}

// Überschrift für eine neue Fassung in der Sprache der Seite
export function neuigkeitKopf(fassung, datumIso, lang) {
  const [j, m, d] = datumIso.split("-");
  if (lang === "en") return `### Version ${fassung}, ${+d} ${MONATE_EN[+m - 1].replace(/^./, c => c.toUpperCase())} ${j}`;
  return `### Fassung ${fassung} vom ${+d}.${+m}.${j}`;
}
