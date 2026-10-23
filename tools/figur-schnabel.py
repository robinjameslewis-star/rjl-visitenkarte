#!/usr/bin/env python3
"""Schnabelposen aus der Sitzpose ableiten (Robin, 23.10.2026): Der Unterschnabel wird um den Schnabelwinkel
heruntergeklappt, die Öffnung zeigt hinten den dunklen Rachen, vorn die Zunge, an den Spitzen den Hintergrund.
Zwischenlösung, bis gezeichnete Posen da sind (FIGUREN.md, Prompt-Vorlage); Kehle und Kopf bewegen sich nicht mit.
Die Lage von Schnabelwinkel und Trennlinie gilt für Gochs Sitzpose (1153 × 637, figuren/goch/bilder/…/vogel.webp).

Vom Repository-Stamm aus (Pillow):
  python3 tools/figur-schnabel.py            # erzeugt halb (7°) und offen (14°) für beide Fassungen
"""
import math, sys
from PIL import Image, ImageDraw, ImageFilter

SS = 4  # Überabtastung für weiche Kanten
SCHARNIER = (346.0, 112.0)
OBERKANTE = [(276, 107.6), (290, 107.8), (305, 108.2), (322, 108.8), (335, 110.0), (346, 112.0)]  # Trennlinie (Oberkante Unterschnabel)
UNTERKANTE = [(346, 113.5), (338, 119.0), (326, 121.2), (313, 121.0), (300, 117.2), (289, 113.2), (280, 110.0), (276, 108.4)]
RACHEN = (58, 40, 37)

def drehen(p, grad):
    a = math.radians(-grad); cx, cy = SCHARNIER; x, y = p[0] - cx, p[1] - cy
    return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))

def maske(groesse, poly):
    m = Image.new('L', (groesse[0] * SS, groesse[1] * SS), 0)
    ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    return m.resize(groesse, Image.LANCZOS)

def oeffnen(im, grad):
    rgba = im.convert('RGBA')
    unterschnabel = OBERKANTE + UNTERKANTE
    m = maske(im.size, unterschnabel)
    teil = Image.new('RGBA', im.size, (0, 0, 0, 0)); teil.paste(rgba, (0, 0), m)
    # Unterschnabel um das Scharnier drehen (PIL dreht gegen den Uhrzeigersinn um center)
    gedreht = teil.rotate(grad, resample=Image.BICUBIC, center=SCHARNIER)
    # Rachen: Fläche zwischen Trennlinie und gedrehter Oberkante. Hinten dunkel, nach vorn rötliche Zunge, an den Spitzen
    # Hintergrund (von der Seite sieht man zwischen den Spitzen durch).
    keil = OBERKANTE + [drehen(p, grad) for p in reversed(OBERKANTE)]
    km = maske(im.size, keil).filter(ImageFilter.GaussianBlur(0.5))
    rachen = Image.new('RGBA', im.size, (0, 0, 0, 0))
    px = rachen.load()
    x_hinten, x_spitze = SCHARNIER[0], OBERKANTE[0][0]
    for x in range(int(x_spitze) - 2, int(x_hinten) + 3):
        t = max(0.0, min(1.0, (x_hinten - x) / (x_hinten - x_spitze)))  # 0 am Schnabelwinkel, 1 an der Spitze
        if t < 0.55:   # Rachen → Zunge
            u = t / 0.55; farbe = tuple(round(a + (b - a) * u) for a, b in zip((44, 28, 27), (132, 70, 64)))
        else:          # Zunge → Spitze
            u = (t - 0.55) / 0.45; farbe = tuple(round(a + (b - a) * u) for a, b in zip((132, 70, 64), (168, 104, 96)))
        deck = 255 if t < 0.9 else round(255 * max(0.0, 1 - (t - 0.9) / 0.1))  # erst ganz vorn ausblenden
        for y in range(80, 145):
            px[x, y] = farbe + (deck,)
    rachen.putalpha(Image.composite(rachen.getchannel('A'), Image.new('L', im.size, 0), km))
    aus = rgba.copy()
    # alten Unterschnabel entfernen: mit Hintergrund (Weiß bzw. transparent) überdecken, dann Rachen und neuen Unterschnabel
    hinter = Image.new('RGBA', im.size, (255, 255, 255, 255) if im.mode == 'RGB' else (0, 0, 0, 0))
    aus.paste(hinter, (0, 0), m.point(lambda v: 255 if v > 128 else v * 2))
    aus.alpha_composite(rachen)
    # feine dunkle Innenkanten an Ober- und Unterschnabel, wie gezeichnet
    kante = Image.new('RGBA', (im.size[0] * SS, im.size[1] * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(kante)
    d.line([(x * SS, y * SS) for x, y in OBERKANTE], fill=(30, 22, 22, 150), width=SS)
    d.line([(x * SS, y * SS) for x, y in (drehen(p, grad) for p in OBERKANTE)], fill=(30, 22, 22, 120), width=SS)
    aus.alpha_composite(kante.resize(im.size, Image.LANCZOS))
    aus.alpha_composite(gedreht)
    return aus.convert(im.mode) if im.mode == 'RGB' else aus

STUFEN = {'halb': 7.0, 'offen': 14.0}

if __name__ == '__main__':
    from pathlib import Path
    ordner = Path(__file__).resolve().parent.parent / 'figuren' / 'goch' / 'bilder'
    for fassung, art in ((ordner / 'bestand', 'weiss'), (ordner, 'frei')):
        quelle = Image.open(fassung / 'vogel.webp')
        for name, grad in STUFEN.items():
            ziel = fassung / f'vogel-schnabel-{name}.webp'
            bild = oeffnen(quelle, grad)
            if art == 'weiss':
                bild.save(ziel, 'WEBP', quality=92, method=6)
            else:  # deckend freigestellt wie tools/landschaft-bilder.py
                bild.save(ziel, 'WEBP', quality=82, alpha_quality=90, method=6)
            print(ziel.relative_to(ordner.parent.parent.parent), round(ziel.stat().st_size / 1024), 'KB')
