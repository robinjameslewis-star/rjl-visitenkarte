#!/usr/bin/env python3
"""Krone und Ferne für Frühling und Sommer aus den Herbstbildern umfärben (vorläufig, 12.11.2026).

Gemalt sind nur Herbst und Winter. Bis gemalte Bilder über die Redaktion kommen, entstehen Frühling und Sommer hier aus
dem Herbst: Nur die warmen, farbigen Töne (Laub, Hänge) wandern ins Grün; Ast, Zweige, Burg und Dunst bleiben. Die
Deckkraft bleibt wie im Herbstbild, die beiden frei fallenden Blätter der Krone entfallen (im Frühling fallen Blüten,
im Sommer nichts). Schreibt je Bild zwei WebP-Breiten und trägt sie in landschaft.json ein (ohne AVIF, wie die Redaktion).

Python 3.10+, Pillow und NumPy. Vom Repository-Stamm aus:
  python3 tools/landschaft-umfaerben.py [satz]        Standard: burgberg-herbst
Gleiche Eingaben ergeben gleiche Bilder.
"""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
PAPIER = np.array([243, 239, 229], np.float32) / 255
GROESSEN = {'krone': ((1000, 560), 120_000), 'ferne': ((1400, 800), 150_000)}  # wie LAYERS in landscape.js
# Zielton in Grad, Spreizung des Herbsttons um die Mitte (35°), Sättigung, Helligkeit
TON = {
    'fruehling': {'krone': (86, .5, .6, 1.0), 'ferne': (84, .4, .55, 1.0)},
    'sommer': {'krone': (104, .5, .68, .8), 'ferne': (100, .4, .62, .96)},
}


def hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    v, m = rgb.max(-1), rgb.min(-1)
    d = v - m
    s = np.where(v > 0, d / np.maximum(v, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    h = np.where(v == r, ((g - b) / dd) % 6, np.where(v == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d > 0, h, 0), s, v


def rgb(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    k = lambda n: (n + h / 60) % 6
    f = lambda n: v - v * s * np.clip(np.minimum(k(n), 4 - k(n)), 0, 1)
    return np.stack([f(5), f(3), f(1)], -1)


def stufe(x: np.ndarray, a: float, b: float) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def lose_blaetter(alpha: np.ndarray) -> np.ndarray:
    """Maske der Flächen, die nicht mit dem Baum zusammenhängen (die frei fallenden Blätter)."""
    fest = alpha > 40
    marke = np.zeros(alpha.shape, np.int32)
    groessen = [0]
    for y, x in zip(*np.nonzero(fest)):
        if marke[y, x]:
            continue
        nr, stapel, n = len(groessen), [(y, x)], 0
        marke[y, x] = nr
        while stapel:
            cy, cx = stapel.pop()
            n += 1
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < alpha.shape[0] and 0 <= nx < alpha.shape[1] and fest[ny, nx] and not marke[ny, nx]:
                    marke[ny, nx] = nr
                    stapel.append((ny, nx))
        groessen.append(n)
    baum = int(np.argmax(groessen))
    lose = np.isin(marke, [i for i, n in enumerate(groessen) if i and i != baum and n > 400])
    # etwas aufweiten, damit kein Saum stehen bleibt
    for _ in range(6):
        lose = lose | np.roll(lose, 1, 0) | np.roll(lose, -1, 0) | np.roll(lose, 1, 1) | np.roll(lose, -1, 1)
    return lose


def umfaerben(bild: Image.Image, art: str, jahr: str) -> Image.Image:
    a = np.asarray(bild.convert('RGBA'), np.float32) / 255
    farbe, alpha = a[..., :3], a[..., 3].copy()
    ziel, spreizung, saett, hell = TON[jahr][art]
    h, s, v = hsv(farbe)
    warm = stufe(h, 0, 12) * (1 - stufe(h, 70, 95))  # Rot über Orange bis Gelbgrün
    if art == 'krone':
        # Die Bilder sind Farbe-zu-Alpha (volle Sättigung, Papier scheint durch): Erst auf Papier gelegt zeigt sich, was
        # kräftig gefärbt ist (Laub, Blattadern) und was graubraun bleibt (Ast, Zweige).
        # hell (Blattflächen) oder kräftig gefärbt (Blattadern, dunkle Blätter); der Ast ist dunkel und graubraun.
        _, satt, hell_p = hsv(farbe * alpha[..., None] + PAPIER * (1 - alpha[..., None]))
        gewicht = warm * np.maximum(stufe(hell_p, .62, .74), stufe(satt, .55, .68))
    else:
        hoehe = np.arange(a.shape[0], dtype=np.float32)[:, None] / a.shape[0]
        gewicht = warm * stufe(s, .05, .14) * stufe(hoehe, .165, .2)  # die Burg oben bleibt, wie sie ist
    neu = rgb((ziel + (h - 35) * spreizung) % 360, np.clip(s * saett, 0, 1), np.clip(v * hell, 0, 1))
    farbe = farbe + (neu - farbe) * gewicht[..., None]
    if art == 'krone':
        alpha[lose_blaetter((alpha * 255).astype(np.uint8))] = 0
    return Image.fromarray((np.dstack([farbe, alpha]) * 255 + .5).astype(np.uint8), 'RGBA')


def webp(bild: Image.Image, grenze: int, alpha_guete: int) -> bytes:
    for guete in (83, 76, 70, 62, 55, 48):
        puffer = io.BytesIO()
        bild.save(puffer, 'WEBP', quality=guete, method=6, alpha_quality=alpha_guete)
        if puffer.tell() <= grenze:
            return puffer.getvalue()
    raise SystemExit(f'Auch stark verdichtet über {grenze} Bytes.')


def main() -> None:
    satz = sys.argv[1] if len(sys.argv) > 1 else 'burgberg-herbst'
    ordner = REPO / 'assets' / 'landschaften' / satz
    beschreibung = ordner / 'landschaft.json'
    daten = json.loads(beschreibung.read_text(encoding='utf8'))
    for jahr in TON:
        for art, ((gross, klein), grenze) in GROESSEN.items():
            quelle = Image.open(ordner / f'{art}-herbst-{gross}.webp')
            # Nicht schwerer als der Herbst: Krone und Ferne laden vor dem load-Ereignis.
            grenze = min(grenze, daten['ebenen']['herbst'][art]['bytes'])
            bild = umfaerben(quelle, art, jahr)
            for breite in (gross, klein):
                fassung = bild if breite == gross else bild.resize((breite, round(bild.height * breite / gross)), Image.LANCZOS)
                inhalt = webp(fassung, grenze, 40 if art == 'krone' else 100)
                (ordner / f'{art}-{jahr}-{breite}.webp').write_bytes(inhalt)
                print(f'{art}-{jahr}-{breite}.webp  {len(inhalt) // 1024:4d} KB')
                if breite == gross:
                    daten['ebenen'].setdefault(jahr, {})[art] = {'avif': False, 'bytes': len(inhalt)}
    for jahr in TON:  # Reihenfolge der Ebenen wie im Herbst
        daten['ebenen'][jahr] = {k: daten['ebenen'][jahr][k] for k in daten['ebenen']['herbst'] if k in daten['ebenen'][jahr]}
    beschreibung.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
    print('landschaft.json aktualisiert')


if __name__ == '__main__':
    main()
