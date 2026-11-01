#!/usr/bin/env python3
"""Drehbücher für einen Vortrag mit Goch (Robin, 24.10.2026): aus einem Skript (Markdown, Kapitel „## N. Titel“, Absätze
durch Leerzeilen getrennt) und den Folien (HTML, je Folie `data-bloecke="N.A …"` – Kapitel N, Absatz A, „N.0“ =
Kapitelanfang) entsteht je Kapitel ein Drehbuch für tools/goch-clip.py im Layout „vortrag“ (1920 × 1080).

Je Satz: Untertitel wie im Skript, Sprechtext mit Aussprachehilfen (Paragraf, Absatz, Artikel, Gesetzesnamen
ausgeschrieben, robin punkt vision), als Karte die Folie zum Absatz – gehören mehrere Folien zu einem Absatz, teilen sie
sich seine Sätze der Reihe nach. Jedes Kapitel ab 1 beginnt mit „Kapitel N: Titel“ auf der Abschnittsfolie. Merksätze
spricht Goch mit. Zwischen Absätzen eine längere Pause.

  python3 tools/goch-vortrag.py <skript.md> <folien.html> <png-ordner> <ziel-ordner> [--stimme http://localhost:8798]
  → <ziel-ordner>/kapitel-NN/drehbuch.json; danach je Kapitel:
    python3 tools/goch-clip.py <ziel-ordner>/kapitel-NN/drehbuch.json <ziel-ordner>/Kapitel_NN.mp4
"""
import argparse, html, json, os, re

ZAHLEN = 'null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn'.split()
ZEHNER = {2: 'zwanzig', 3: 'dreißig', 4: 'vierzig', 5: 'fünfzig', 6: 'sechzig', 7: 'siebzig', 8: 'achtzig', 9: 'neunzig'}

def in_worten(n):
    """Ganze Zahl 0–999 als deutsches Zahlwort (für Paragrafen und Artikel)."""
    if n < 20: return ZAHLEN[n]
    if n < 100:
        z, e = divmod(n, 10)
        return ZEHNER[z] if e == 0 else ('ein' if e == 1 else ZAHLEN[e]) + 'und' + ZEHNER[z]
    h, r = divmod(n, 100)
    return ('ein' if h == 1 else ZAHLEN[h]) + 'hundert' + (in_worten(r) if r else '')

WOERTER = [  # Reihenfolge zählt: längere Formen zuerst
    (r'\bz\. B\.', 'zum Beispiel'), (r'\bd\. h\.', 'das heißt'), (r'\bbzw\.', 'beziehungsweise'),
    (r'\bff\.', 'und folgende'), (r'\blit\. ([a-z])\b', r'Buchstabe \1'),
    (r'\bStBerG\b', 'Steuerberatungsgesetz'), (r'\bStGB\b', 'Strafgesetzbuch'), (r'\bDSGVO\b', 'Datenschutz-Grundverordnung'),
    (r'\bGeschGehG\b', 'Geschäftsgeheimnisgesetz'), (r'\bBStBK\b', 'Bundessteuerberaterkammer'), (r'\bKI-VO\b', 'KI-Verordnung'),
    (r'\bSteuer-ID\b', 'Steuer-I-D'), (r'robin\.vision', 'robin punkt vision'),
    (r'\bII\b', 'zwei'), (r'\bI\b(?=:)', 'eins'),  # „Klardaten I: …“
]
NUMMERN = [(r'§\s*(\d+)([a-z]?)', 'Paragraf'), (r'\bArt\.\s*(\d+)([a-z]?)', 'Artikel'), (r'\bAbs\.\s*(\d+)([a-z]?)', 'Absatz'),
           (r'\bNr\.\s*(\d+)([a-z]?)', 'Nummer'), (r'\bSatz\s+(\d+)([a-z]?)', 'Satz'), (r'\bParagraf\s+(\d+)([a-z]?)', 'Paragraf')]

def sprechen(text):
    """Aussprachehilfen für die Stimme; der Untertitel behält den Wortlaut des Skripts."""
    t = text
    for muster, wort in NUMMERN:
        t = re.sub(muster, lambda m, w=wort: f'{w} {in_worten(int(m.group(1)))}{" " + m.group(2) if m.group(2) else ""}', t)
    for muster, ersatz in WOERTER: t = re.sub(muster, ersatz, t)
    return t

SCHUTZ = ['z. B.', 'd. h.', 'Abs.', 'Art.', 'Nr.', 'lit.', 'ff.', 'bzw.', 'ca.', 'S.']

def saetze(absatz):
    """Absatz in Sätze; Abkürzungen und schließende Anführungszeichen bleiben beim Satz."""
    t = absatz
    for i, a in enumerate(SCHUTZ): t = t.replace(a, f'\x00{i}\x00')
    teile, anfang = [], 0
    for m in re.finditer(r'[.?!][“”"]?\s+(?=[„"A-ZÄÖÜ0-9])', t):
        teile.append(t[anfang:m.end()].strip()); anfang = m.end()
    teile.append(t[anfang:].strip())
    def zurueck(s):
        for i, a in enumerate(SCHUTZ): s = s.replace(f'\x00{i}\x00', a)
        return s
    return [zurueck(s) for s in teile if s]

def markdown_text(block):
    """Absatz aus dem Skript → gesprochener Text: Fett und Kursiv weg, Aufzählungsnummern weg, Zeilen zusammen."""
    zeilen = []
    for z in block.split('\n'):
        z = re.sub(r'^\s*\d+\.\s+', '', z)  # „1. …“ einer Liste
        zeilen.append(z.strip())
    t = ' '.join(zeilen)
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', t); t = re.sub(r'\*(.+?)\*', r'\1', t)
    return re.sub(r'\s+', ' ', t).strip()

def folien_lesen(pfad):
    s = open(pfad, encoding='utf-8').read()
    zuordnung = {}
    for i, m in enumerate(re.finditer(r'<section class="slide[^"]*"([^>]*)>', s), 1):
        b = re.search(r'data-bloecke="([^"]*)"', m.group(1))
        for kennung in (b.group(1).split() if b else []): zuordnung.setdefault(kennung, []).append(i)
    return zuordnung

def skript_lesen(pfad):
    s = open(pfad, encoding='utf-8').read()
    s = s.split('---', 2)[2] if s.startswith('---') else s
    s = s.split('\n### Anhang')[0]
    kapitel = []
    for t in re.split(r'\n## ', s)[1:]:
        kopf, rest = t.split('\n', 1)
        m = re.match(r'(\d+)\.\s+(.+?)(?:\s+\(\d+ Minuten?\))?$', kopf.strip())
        bloecke = [b.strip() for b in re.split(r'\n\s*\n', rest) if b.strip() and b.strip() != '---']
        kapitel.append((int(m.group(1)), m.group(2), bloecke))
    return kapitel

def main():
    a = argparse.ArgumentParser()
    a.add_argument('skript'); a.add_argument('folien'); a.add_argument('png'); a.add_argument('ziel')
    a.add_argument('--stimme', default='http://localhost:8798')
    arg = a.parse_args()
    zuordnung = folien_lesen(arg.folien)
    dateien = os.listdir(arg.png)
    def folienbild(n):  # folie-NN.png oder .jpg
        return next(d for d in sorted(dateien) if re.fullmatch(rf'folie-{n:02d}\.(png|jpe?g)', d))
    kapitel = skript_lesen(arg.skript)
    letztes = kapitel[-1][0]
    for nr, titel, bloecke in kapitel:
        eintraege, folie = [], None
        def dazu(text, folie_nr, pause=.35, kopf=-2):
            eintraege.append({'text': text, 'sprechen': sprechen(text), 'kopf': kopf, 'pause': pause,
                              'karte': {'art': 'folie', 'src': folienbild(folie_nr)}})
        if nr > 0 and f'{nr}.0' in zuordnung:
            folie = zuordnung[f'{nr}.0'][0]
            dazu(f'Kapitel {in_worten(nr)}: {titel}.', folie, pause=.7, kopf=1)
        for i, block in enumerate(bloecke, 1):
            ss = saetze(markdown_text(block))
            folien = zuordnung.get(f'{nr}.{i}') or ([folie] if folie else [1])
            for k, satz in enumerate(ss):
                folie = folien[min(len(folien) - 1, k * len(folien) // len(ss))]
                dazu(satz, folie, pause=.65 if k == len(ss) - 1 else .3)
        genutzt = sorted({e['karte']['src'] for e in eintraege})
        db = {'titel': f'Kapitel {nr}: {titel}', 'layout': 'vortrag', 'breite': 1920, 'hoehe': 1080, 'fps': 30,
              'stimme': arg.stimme, 'sprache': 'de', 'vorlauf': .7, 'nachlauf': 1.2, 'zwitschern': .3,
              'zwitschern_anfang': nr == 0, 'zwitschern_ende': nr == letztes, 'vorschau': 6,
              'kapitel': f'Kapitel {nr}' if nr else 'Begrüßung', 'kapiteltitel': titel, 'saetze': eintraege,
              'bilder': {f: {'quelle': os.path.join(os.path.abspath(arg.png), f)} for f in genutzt}}
        ordner = os.path.join(arg.ziel, f'kapitel-{nr:02d}'); os.makedirs(ordner, exist_ok=True)
        json.dump(db, open(os.path.join(ordner, 'drehbuch.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        zeichen = sum(len(e['sprechen']) for e in eintraege)
        print(f'Kapitel {nr}: {len(eintraege)} Sätze, {zeichen} Zeichen, Folien {[g[6:8] for g in genutzt]}')

if __name__ == '__main__':
    main()
