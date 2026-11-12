#!/usr/bin/env python3
"""Flugposen in einer Handy-Fassung (1024 px breit) neben die Originale legen – beide Fassungen (mit und ohne Landschaft).

Am Handy laden bird-flight.js und die Preloads im <head> diese Fassung (bis 720 px Fensterbreite): Der Flug ist kurz im
Bild, der Erstaufruf wird rund 240 KB leichter. Pillow. Vom Repository-Stamm aus:
  python3 tools/figur-flug-klein.py [figur]        Standard: goch
"""
import sys
from pathlib import Path

from PIL import Image

BREITE = 1024
paket = Path(__file__).resolve().parent.parent / 'figuren' / (sys.argv[1] if len(sys.argv) > 1 else 'goch') / 'bilder'
for ordner in (paket, paket / 'bestand'):
    for quelle in sorted(ordner.glob('flugpose-*.webp')):
        if quelle.stem.endswith(f'-{BREITE}'):
            continue
        bild = Image.open(quelle)
        ziel = quelle.with_name(f'{quelle.stem}-{BREITE}.webp')
        bild.resize((BREITE, round(bild.height * BREITE / bild.width)), Image.LANCZOS).save(ziel, 'WEBP', quality=82, method=6, alpha_quality=90)
        print(f'{ziel.relative_to(paket)}  {quelle.stat().st_size // 1024} KB -> {ziel.stat().st_size // 1024} KB')
