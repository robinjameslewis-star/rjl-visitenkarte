#!/usr/bin/env python3
"""Blinzeln aus der Sitzpose ableiten (Robin, 23.10.2026: Goch soll lebendiger wirken, Posen leite ich selbst ab):
Das Auge wird mit orangen Federn aus der Umgebung abgedeckt (links vor dem Auge und unten von der Wange, weich ineinander)
und darüber ein geschlossenes Lid gezeichnet – ein leicht nach unten gebogener dunkler Strich mit hellem Rand, im Strich der Zeichnung.
Zwischenlösung wie tools/figur-schnabel.py, bis gezeichnete Posen da sind. Lage des Auges für Gochs Sitzpose
(1153 × 637, figuren/goch/bilder/…/vogel.webp; Augenpunkt in figur.json: 400, 100).

Vom Repository-Stamm aus (Pillow):
  python3 tools/figur-augen.py            # erzeugt vogel-blinzeln.webp für beide Fassungen
"""
from PIL import Image, ImageDraw, ImageFilter

SS = 4
MITTE = (398.8, 99.3)   # Mitte des dunklen Auges
RADIUS = 19.5           # Auge samt Goldring und etwas Rand
LINKS = (-32, 3)        # Federstück vor dem Auge (orange, wie um das Auge)
UNTEN = (-3, 31)        # Federstück unter dem Auge

def kreis(groesse, r, weich=2.2):
    m = Image.new('L', (groesse[0] * SS, groesse[1] * SS), 0)
    cx, cy = MITTE
    ImageDraw.Draw(m).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=255)
    return m.resize(groesse, Image.LANCZOS).filter(ImageFilter.GaussianBlur(weich))

def blinzeln(im):
    rgba = im.convert('RGBA')
    cx, cy = round(MITTE[0]), round(MITTE[1])
    s = int(RADIUS) + 4
    # Federn: vor dem Auge und unter dem Auge, schräg weich übergeblendet
    stueck = lambda d: rgba.crop((cx + d[0] - s, cy + d[1] - s, cx + d[0] + s, cy + d[1] + s))
    verlauf = Image.linear_gradient('L').rotate(45, resample=Image.BICUBIC, expand=False).resize((2 * s, 2 * s))
    federn = Image.composite(stueck(UNTEN), stueck(LINKS), verlauf)
    lage = Image.new('RGBA', im.size, (0, 0, 0, 0)); lage.paste(federn, (cx - s, cy - s))
    aus = rgba.copy()
    aus.paste(lage, (0, 0), kreis(im.size, RADIUS))
    # Lid: dunkler, leicht nach unten gebogener Strich, darüber ein heller Rand
    zeichnung = Image.new('RGBA', (im.size[0] * SS, im.size[1] * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(zeichnung)
    # gewölbtes Lid: zarter Umriss, wo das Auge war
    r = RADIUS - 5.5
    d.ellipse([(MITTE[0] - r) * SS, (MITTE[1] - r) * SS, (MITTE[0] + r) * SS, (MITTE[1] + r) * SS], outline=(110, 52, 22, 70), width=round(1.0 * SS))
    b = RADIUS - 4
    box = [(MITTE[0] - b) * SS, (MITTE[1] - 7) * SS, (MITTE[0] + b) * SS, (MITTE[1] + 6) * SS]
    d.arc([box[0], box[1] - 1.2 * SS, box[2], box[3] - 1.2 * SS], 15, 165, fill=(238, 178, 112, 200), width=round(1.1 * SS))
    d.arc(box, 12, 168, fill=(40, 26, 18, 235), width=round(2.2 * SS))
    aus.alpha_composite(zeichnung.resize(im.size, Image.LANCZOS))
    return aus.convert(im.mode) if im.mode == 'RGB' else aus

if __name__ == '__main__':
    from pathlib import Path
    ordner = Path(__file__).resolve().parent.parent / 'figuren' / 'goch' / 'bilder'
    for fassung, art in ((ordner / 'bestand', 'weiss'), (ordner, 'frei')):
        ziel = fassung / 'vogel-blinzeln.webp'
        bild = blinzeln(Image.open(fassung / 'vogel.webp'))
        if art == 'weiss':
            bild.save(ziel, 'WEBP', quality=92, method=6)
        else:
            bild.save(ziel, 'WEBP', quality=82, alpha_quality=90, method=6)
        print(ziel.relative_to(ordner.parent.parent.parent), round(ziel.stat().st_size / 1024), 'KB')
