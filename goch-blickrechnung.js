// Rechnung für Gochs Blickkontakt (Robin, 23.10.2026): aus den Gesichtspunkten von MediaPipe nur Lage, Größe,
// Kopfrichtung und ungefähre Blickrichtung – kein Bild, keine Mimik, keine Wiedererkennung. Reine Funktionen, damit sie
// sich ohne Kamera prüfen lassen (tests/goch_blick_test.mjs). Genutzt von goch-kamera.js.

// Kopfrichtung aus der 4×4-Transformationsmatrix (spaltenweise): gier = links/rechts, nick = hoch/runter, in Grad.
export function kopfrichtung(m) {
  const r02 = m[8], r12 = m[9], r22 = m[10];
  return { gier: Math.atan2(r02, r22) * 180 / Math.PI, nick: Math.atan2(-r12, Math.hypot(r02, r22)) * 180 / Math.PI };
}

// Ungefähre Blickrichtung: Lage der Iris zwischen den Augenwinkeln, beide Augen gemittelt (−0,5 … 0,5; 0 = geradeaus).
// Punkte im 478er-Netz von MediaPipe: Augenwinkel 33/133 und 362/263, Irismitte 468 und 473.
export function blick(p) {
  const auge = (aussen, innen, iris) => {
    const breite = Math.hypot(p[innen].x - p[aussen].x, p[innen].y - p[aussen].y) || 1;
    const mitte = { x: (p[innen].x + p[aussen].x) / 2, y: (p[innen].y + p[aussen].y) / 2 };
    return { x: (p[iris].x - mitte.x) / breite, y: (p[iris].y - mitte.y) / breite };
  };
  if (!p || p.length < 478) return { x: 0, y: 0 };
  const a = auge(33, 133, 468), b = auge(263, 362, 473);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Zusammenfassung je Bild: da, Lage (0…1, aus Sicht des Besuchers: 0 = links), Größe, schaut her.
export function auswerten(punkte, matrix) {
  if (!punkte || !punkte.length) return { da: false };
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (const q of punkte) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
  const k = matrix ? kopfrichtung(matrix) : { gier: 0, nick: 0 }, g = blick(punkte);
  const schautHer = Math.abs(k.gier) < 22 && Math.abs(k.nick) < 22 && Math.abs(g.x) < .18;
  return { da: true, x: 1 - (x0 + x1) / 2, y: (y0 + y1) / 2, groesse: x1 - x0, gier: Math.round(k.gier), nick: Math.round(k.nick), schautHer };
}
