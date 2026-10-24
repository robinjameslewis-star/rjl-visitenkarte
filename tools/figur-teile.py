#!/usr/bin/env python3
"""Teile einer Figur aus ihrer Sitzpose schneiden (Robin, 24.10.2026): Körper, Kopf und Schwanz als eigene Bilder auf
derselben Leinwand, damit die Seite sie einzeln bewegen kann (goch-leben.js) – Kopf neigen, Schwanz zucken, Knicksen –,
fast ohne zusätzliche Daten und im exakt gleichen Strich.

Der Schnitt steht in figur.json unter animation.teile: beim Kopf eine Linie quer durch den Hals (Punkte von links nach
rechts, oberhalb ist Kopf), beim Schwanz eine Gerade über die Schwanzwurzel. An der Linie blendet das Teil über
`rampe` Pixel weich aus; der Körper reicht `rand` Pixel weiter unter das Teil, damit beim Drehen keine Lücke entsteht.
Die Deckkraft ist so verteilt, dass Körper + Teile ohne Drehung genau die Sitzpose ergeben (auch an Kanten mit
Halbtransparenz). Der Kopf entsteht für jede Pose in teile.kopf.posen (Schnabel, Blinzeln) aus der gleichnamigen Pose.

Quelle ist die freigestellte Fassung (animation.fassungen „mit-landschaft“); die Teile gelten für beide Fassungen.
Braucht Python mit numpy und Pillow.

  python3 tools/figur-teile.py figuren/goch          # schreibt bilder/teile/*.webp und prüft das Ergebnis
"""
import json, os, sys
import numpy as np
from PIL import Image

QUALITAET = 86

def laden(pfad):
    return np.array(Image.open(pfad).convert('RGBA')).astype(np.float32)

def rampe(abstand, breite):
    return np.clip((abstand + breite / 2) / breite, 0, 1)

def schnitt_kopf(cfg, w, h):
    """Vorzeichenbehafteter Abstand zur Halslinie (senkrecht gemessen): > 0 oberhalb, also Kopf."""
    xs, ys = zip(*cfg['schnitt'])
    ylinie = np.interp(np.arange(w), xs, ys).astype(np.float32)
    return ylinie[None, :] - np.mgrid[0:h, 0:w][0].astype(np.float32)

def schnitt_gerade(cfg, w, h, spitze):
    """Abstand zur Geraden durch die zwei Punkte, positiv auf der Seite von `spitze` (z. B. Schwanzspitze)."""
    (x1, y1), (x2, y2) = cfg['schnitt']
    n = np.array([y2 - y1, -(x2 - x1)], dtype=np.float32); n /= np.hypot(*n)
    if (spitze[0] - x1) * n[0] + (spitze[1] - y1) * n[1] < 0: n = -n
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return (xx - x1) * n[0] + (yy - y1) * n[1]

def speichern(rgba, pfad):
    Image.fromarray(np.clip(rgba + .5, 0, 255).astype(np.uint8)).save(pfad, 'WEBP', quality=QUALITAET, method=6)
    return os.path.getsize(pfad)

def main(paket):
    figur = json.load(open(os.path.join(paket, 'figur.json')))
    a = figur['animation']; t = a['teile']
    quelle = os.path.join(paket, a['fassungen'].get('mit-landschaft', 'bilder/'))
    ziel = os.path.join(paket, t['ordner']); os.makedirs(ziel, exist_ok=True)
    sitz = laden(os.path.join(quelle, a['posen'][t.get('quelle', 'sitzend')]['datei']))
    h, w = sitz.shape[:2]
    alpha = sitz[:, :, 3] / 255

    k, s = t['kopf'], t['schwanz']
    ak = schnitt_kopf(k, w, h)
    # Schwanzspitze: der am weitesten vom Drehpunkt entfernte deckende Punkt auf der Schwanzseite der Geraden
    ys, xs = np.nonzero(alpha > .5)
    d = np.hypot(xs - s['drehpunkt'][0], ys - s['drehpunkt'][1]); i = np.argmax(np.where(xs > s['drehpunkt'][0], d, 0))
    ast = schnitt_gerade(s, w, h, (xs[i], ys[i]))
    rk = rampe(ak, k['rampe']) * (ast < 0)
    rs = rampe(ast, s['rampe']) * (ak < 0)
    r = np.maximum(rk, rs)
    # Körper: unter den Teilen `rand` Pixel weiter; Deckkraft so, dass Körper + Teil genau die Sitzpose ergeben
    im_rand = (ak <= k['rand']) & (ast <= s['rand'])
    koerper_a = np.where(alpha >= .999, 1.0, alpha * (1 - r) / np.maximum(1 - alpha * r, 1e-6)) * im_rand
    groessen = {}
    koerper = sitz.copy(); koerper[:, :, 3] = 255 * koerper_a
    groessen[t['koerper']] = speichern(koerper, os.path.join(ziel, t['koerper']))
    schwanz = sitz.copy(); schwanz[:, :, 3] = 255 * alpha * rs
    groessen[s['datei']] = speichern(schwanz, os.path.join(ziel, s['datei']))
    koepfe = {}
    for pose, datei in k['posen'].items():
        bild = sitz if pose == t.get('quelle', 'sitzend') else laden(os.path.join(quelle, a['posen'][pose]['datei']))
        if bild.shape[:2] != (h, w): sys.exit(f'{pose}: andere Maße als die Sitzpose')
        kopf = bild.copy(); kopf[:, :, 3] = bild[:, :, 3] * rk
        groessen[datei] = speichern(kopf, os.path.join(ziel, datei)); koepfe[pose] = kopf

    # Probe: aus den gespeicherten Dateien zusammengesetzt, ohne Drehung, muss die Sitzpose herauskommen
    def zusammen(*dateien):
        c = Image.new('RGBA', (w, h), (255, 255, 255, 255))
        for f in dateien: c.alpha_composite(Image.open(os.path.join(ziel, f)).convert('RGBA'))
        return np.array(c).astype(int)
    vorlage = Image.new('RGBA', (w, h), (255, 255, 255, 255)); vorlage.alpha_composite(Image.fromarray(sitz.astype(np.uint8)))
    diff = np.abs(zusammen(t['koerper'], s['datei'], k['posen'][t.get('quelle', 'sitzend')]) - np.array(vorlage).astype(int))[:, :, :3]
    print(f'Zusammengesetzt gegen Sitzpose: mittlere Abweichung {diff.mean():.2f}, 99,9 % unter {np.percentile(diff, 99.9):.0f} (von 255)')
    for f, g in groessen.items(): print(f'  {t["ordner"]}{f}: {g / 1024:.1f} KB')
    print(f'  zusammen: {sum(groessen.values()) / 1024:.1f} KB')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'figuren/goch')
