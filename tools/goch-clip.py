#!/usr/bin/env python3
"""Clip mit Goch (Robin, 24.10.2026): aus einem Drehbuch (JSON) ein Video im Format 4:5 – Goch spricht mit seiner
Stimme, Schnabel, Kopf und Körper folgen dem Ton wie auf der Website (Teile aus figur.json), dazu Untertitel, Karten
mit Bildern aus dem Werkzeug und Gochs Zwitschern am Anfang und am Ende.

Ablauf: Jeder Satz wird einzeln vertont (POST <stimme>/_vertonen der Attrappe, tests/goch_fake_worker.py mit
--stimme elevenlabs; der Schlüssel bleibt dort) und zwischengespeichert, damit ein neuer Schnitt keine Zeichen kostet.
Aus dem Ton entsteht ein Zeitplan je Bild (30 je Sekunde); Chrome zeigt jedes Bild auf tools/goch-clip/clip.html an,
das Skript macht ein Bildschirmfoto und setzt Bilder und Ton zu MP4 zusammen (H.264, AAC, 1080 × 1350).
Layout „vortrag“ (Workshops, 24.10.2026): 1920 × 1080, Karten der Art „folie“ (Folienbilder), Kapitelangabe rechts; die
Drehbücher dafür schreibt tools/goch-vortrag.py aus Skript und Folien.
In den Pausen zwischen den Sätzen knickst, blinzelt oder zuckt Goch – fest gewählt, damit jeder Lauf gleich aussieht.

Braucht Google Chrome und Python mit numpy, Pillow, websockets und PyAV (`pip install av numpy pillow websockets`).

  python3 tools/goch-clip.py <drehbuch.json> <ausgabe.mp4>
  python3 tools/goch-clip.py <drehbuch.json> <ausgabe.mp4> --nur-marken [--stimme-id <id>]   # nur die Absatzmarken

Tragen die Sätze ein Feld „absatz“ (tools/goch-vortrag.py), entsteht neben dem Video <ausgabe>.marken.json, erst wenn
das Video fertig ist: je Absatz Anfang, Ende, Text, Folie (des ersten Satzes) und die Sätze mit Anfang, Ende und eigener
Folie, dazu die Stimmen-ID – für die Workshop-Bühne (buehne.html, Robin 24.10.2026).
--nur-marken nimmt den Ton nur aus dem Zwischenspeicher und vertont nie: fehlt ein Satz, bricht es ab, ohne etwas zu
schreiben. Die Stimmen-ID (Teil des Schlüssels im Zwischenspeicher) kommt aus --stimme-id oder aus den bisherigen Marken
neben dem Video – nie vom Stimmdienst; zur Gegenprobe muss der Ton so lang sein wie das Video (±0,2 s).
Beim Rendern nennt die Attrappe zu jedem Satz die Stimme; wechselt sie während des Laufs, bricht er ab. Tragen die Sätze
kein „absatz“ mehr, werden alte Marken neben dem Video beiseitegelegt (.alt).
"""
import asyncio, base64, hashlib, io, json, os, re, subprocess, sys, tempfile, threading, time, urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import av
import numpy as np
import websockets
from PIL import Image

WZ = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RATE = 48000

def ton(quelle):
    """Datei oder Bytes → Mono-Float bei 48 kHz."""
    c = av.open(io.BytesIO(quelle) if isinstance(quelle, bytes) else quelle)
    r = av.AudioResampler(format='flt', layout='mono', rate=RATE)
    teile = [f.to_ndarray().reshape(-1) for fr in c.decode(audio=0) for f in r.resample(fr)]
    c.close()
    return np.concatenate(teile).astype(np.float32)

def stimme_ermitteln(db, ausgabe, nur_marken, stimme_id=None):
    """Stimmen-ID einmal je Lauf. Mit --nur-marken nur --stimme-id oder die der bisherigen Marken – nie die gerade
    eingestellte Stimme, die nicht die des Videos sein muss; beim Rendern immer die Stimme, die auch vertont."""
    if nur_marken:
        if stimme_id is None:
            try: stimme_id = json.load(open(os.path.splitext(ausgabe)[0] + '.marken.json', encoding='utf-8'))['stimme']
            except (OSError, ValueError, KeyError, TypeError): pass
        if not stimme_id: sys.exit('Keine Stimmen-ID in den bisherigen Marken – --stimme-id <Voice ID des Videos> angeben. Nichts geschrieben.')
        return stimme_id
    try: return json.load(urllib.request.urlopen(db['stimme'] + '/_stimme', timeout=10)).get('voice', '')
    except OSError as fehler:
        sys.exit(f'Stimme {db["stimme"]} nicht erreichbar ({fehler})' + (' – mit --stimme-id <id> geht es ohne' if nur_marken else ''))

def vertonen(endpunkt, stimme, text, lang, ablage, nur_ablage=False):
    """Ton eines Satzes aus dem Zwischenspeicher (Schlüssel: Stimme, Sprache, Text), sonst von der Stimme. Mit `nur_ablage`
    (--nur-marken) nie die Stimme: fehlt der Ton, bricht der Lauf ab, bevor etwas geschrieben ist."""
    schluessel = hashlib.sha1(f'{stimme}|{lang}|{text}'.encode()).hexdigest()[:16]
    pfad = os.path.join(ablage, f'satz-{schluessel}.mp3')
    if not os.path.exists(pfad):
        if nur_ablage:
            raise SystemExit(f'Kein Ton im Zwischenspeicher {ablage} für Stimme „{stimme}“, Satz: „{text}“ – Stimmen-ID '
                             'prüfen (--stimme-id) oder ohne --nur-marken neu vertonen. Nichts geschrieben.')
        os.makedirs(ablage, exist_ok=True)
        anfrage = urllib.request.Request(endpunkt + '/_vertonen', data=json.dumps({'text': text, 'lang': lang}).encode(),
                                         headers={'content-type': 'application/json'}, method='POST')
        for versuch in range(5):  # vorübergehende Fehler bei ElevenLabs (502 über die Attrappe): kurz warten, erneut
            try: d = json.load(urllib.request.urlopen(anfrage, timeout=60)); break
            except urllib.error.HTTPError as fehler:
                if fehler.code not in (429, 500, 502, 503) or versuch == 4: raise
                print(f'  Stimme vorübergehend nicht da ({fehler.code}), neuer Versuch in {5 * 2 ** versuch} s', flush=True)
                time.sleep(5 * 2 ** versuch)
        if d.get('voice', stimme) != stimme:  # Stimme während des Laufs gewechselt: nicht unter falschem Schlüssel ablegen
            raise SystemExit(f'Stimme während des Laufs gewechselt ({stimme} → {d["voice"]}) – Satz nicht gespeichert: „{text}“')
        open(pfad, 'wb').write(base64.b64decode(d['daten']))
        print(f'  vertont ({stimme}): {text[:60]}', flush=True)
    return pfad

def teilen(text, laenge=58):
    """Untertitel in Stücke von höchstens etwa `laenge` Zeichen, an Satzzeichen getrennt."""
    stuecke, rest = [], text.strip()
    while len(rest) > laenge:
        stellen = [m.end() for m in re.finditer(r'[,:;.?]\s|\s–\s', rest) if 12 <= m.end() <= laenge + 8]
        schnitt = max(stellen) if stellen else rest.rfind(' ', 0, laenge)
        stuecke.append(rest[:schnitt].strip()); rest = rest[schnitt:].strip()
    return stuecke + [rest]

def bild_vorbereiten(name, cfg, basis, ziel):
    q = cfg['quelle'] if os.path.isabs(cfg['quelle']) else os.path.join(basis, cfg['quelle'])
    if 'zeit' in cfg:  # Einzelbild aus einem Video
        c = av.open(q); st = c.streams.video[0]
        im = next(f.to_image() for f in c.decode(st) if float(f.pts * st.time_base) >= cfg['zeit']); c.close()
    else: im = Image.open(q).convert('RGB')
    if 'ausschnitt' in cfg: im = im.crop(tuple(cfg['ausschnitt']))
    im.save(os.path.join(ziel, name))

def zeitplan(db, saetze_ton, fps):
    """Ton zusammensetzen und je Bild Kopf, Schwanz, Knicks, Schnabel, Neigung und Streckung berechnen."""
    vorlauf, nachlauf, pause = db.get('vorlauf', .9), db.get('nachlauf', 1.6), db.get('pause', .32)
    stimme, zeiten, t = [np.zeros(int(vorlauf * RATE), np.float32)], [], vorlauf
    for i, y in enumerate(saetze_ton):
        zeiten.append((t, t + len(y) / RATE)); stimme.append(y); t += len(y) / RATE
        p = db['saetze'][i].get('pause', pause) if i < len(saetze_ton) - 1 else nachlauf
        stimme.append(np.zeros(int(p * RATE), np.float32)); t += p
    stimme = np.concatenate(stimme)
    n = int(np.ceil(len(stimme) / RATE * fps)); fenster = RATE // fps
    rms = [float(np.sqrt(np.mean(stimme[i * fenster:(i + 1) * fenster] ** 2) + 1e-12)) for i in range(n)]
    rng = np.random.default_rng(int(db.get('zufall', 7)))
    # Ereignisse in den Pausen: Anfang Zwitschern und Knicks, dazwischen abwechselnd, am Ende Zwitschern und Knicks
    ereignisse = [(.15, 'knicks')]
    folge = ['blinzeln', 'schwanz', 'kopf', 'blinzeln', 'knicks', 'schwanz', 'blinzeln', 'kopf']
    for i in range(len(zeiten) - 1):
        ereignisse.append((zeiten[i][1] + .08, folge[i % len(folge)]))
    ende_stimme = zeiten[-1][1]
    ereignisse += [(ende_stimme + .45, 'knicks'), (ende_stimme + .9, 'blinzeln')]
    rahmen, weich, pegel, huelle, haltung, leise = [], 0.0, 0.0, 0.0, 0.0, 0
    for i in range(n):
        zeit = i / fps
        satz = next((j for j, (a, b) in enumerate(zeiten) if a - .2 <= zeit < (zeiten[j + 1][0] - .2 if j + 1 < len(zeiten) else 1e9)), 0)
        basis = db['saetze'][satz].get('kopf', 0)
        spricht = any(a <= zeit < b for a, b in zeiten)
        r = rms[i]
        weich = weich * .5 + r * .5
        mund = 'offen' if weich > .09 else 'halb' if weich > .025 else 'zu'
        pegel = pegel * .6 + r * .4; huelle = huelle * .7 + r * .3
        if r < .02: leise += 1
        else:
            if leise * 1000 / fps > 250: haltung = float(rng.uniform(-1.1, 1.1))
            leise = 0
        kopf = basis - min(2.5, pegel * 14) if spricht else basis
        schwanz = knicks = 0.0
        for (te, art) in ereignisse:
            d = zeit - te
            if art == 'knicks' and 0 <= d < .3:
                knicks = min(1, d / .1) if d < .1 else max(0, 1 - (d - .1) / .17)
                schwanz = -8 * (min(1, d / .09) if d < .17 else max(0, 1 - (d - .17) / .22))
            elif art == 'schwanz' and 0 <= d < .5:
                schwanz = -7 * (min(1, d / .07) if d < .11 else max(0, 1 - (d - .11) / .17)) if d < .28 else \
                          -5 * (min(1, (d - .28) / .07) if d < .39 else max(0, 1 - (d - .39) / .11))
            elif art == 'blinzeln' and 0 <= d < .11 and not spricht:
                mund = 'blinzeln'
            elif art == 'kopf' and 0 <= d < .9 and not spricht:
                kopf = basis + (-4 if int(te * 10) % 2 else 3) * min(1, d / .07)
        neigung = haltung - min(1.4, huelle * 9) if spricht else 0.0
        streck = 1 + min(.5, huelle * 3) * .015 if spricht else 1.0
        rahmen.append([round(float(kopf), 2), round(float(schwanz), 2), round(float(knicks), 3), mund, round(float(neigung), 2), round(float(streck), 4)])
    return stimme, zeiten, rahmen

class Server(SimpleHTTPRequestHandler):
    def __init__(self, *a, clip=None, **k): self.clip = clip; super().__init__(*a, directory=WZ, **k)
    def translate_path(self, path):
        if path.startswith('/_clip/'): return os.path.join(self.clip, os.path.basename(path.split('?')[0]))
        return super().translate_path(path)
    def log_message(self, *a): pass

class Warteschlange(ThreadingHTTPServer):
    request_queue_size = 64  # Chrome holt ein Dutzend Bilder auf einmal; mit der Voreinstellung 5 brechen einige ab
    daemon_threads = True

async def aufnehmen(url, n, schreiben, breite=1080, hoehe=1350):
    port = int(os.environ.get("GOCH_CLIP_PORT", 9371))
    w, h = breite // 2, hoehe // 2  # aufgenommen bei Pixeldichte 2
    profil = tempfile.mkdtemp(prefix='goch-clip-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', '--hide-scrollbars', f'--remote-debugging-port={port}',
                             f'--user-data-dir={profil}', '--no-first-run', f'--window-size={w},{h}', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try: ziele = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')); break
            except Exception: time.sleep(.2)
        seite = [z for z in ziele if z['type'] == 'page'][0]
        async with websockets.connect(seite['webSocketDebuggerUrl'], max_size=100_000_000) as ws:
            mid = 0
            async def send(m, p=None):
                nonlocal mid; mid += 1; nr = mid
                await ws.send(json.dumps({'id': nr, 'method': m, 'params': p or {}}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get('id') == nr:
                        if 'error' in msg: raise RuntimeError(m + ': ' + json.dumps(msg['error']))
                        return msg.get('result', {})
            async def ev(x):
                r = await send('Runtime.evaluate', {'expression': x, 'awaitPromise': True, 'returnByValue': True})
                if 'exceptionDetails' in r: raise RuntimeError(json.dumps(r['exceptionDetails'])[:400])
                return r.get('result', {}).get('value')
            await send('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 2, 'mobile': False})
            await send('Page.enable'); await send('Page.navigate', {'url': url})
            for _ in range(200):
                if await ev('window.bereit === true'): break
                await asyncio.sleep(.1)
            else: raise RuntimeError('Clip-Seite nicht bereit')
            for i in range(n):
                await ev(f'zeige({i})')
                r = await send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 94})
                schreiben(Image.open(io.BytesIO(base64.b64decode(r['data']))).convert('RGB'))
                if i % 150 == 0: print(f'  Bild {i}/{n}', flush=True)
    finally:
        proc.terminate()

def folie_von(karte):
    """Folie einer Karte; teilen sich mehrere Karten den Satz, die letzte (sie steht am Satzende)."""
    if isinstance(karte, list): karte = karte[-1] if karte else None
    return (karte or {}).get('src', '')

def absatzmarken(db, zeiten, dauer, ausgabe, stimme):
    """Absatzmarken für die Workshop-Bühne: je Absatz Anfang und Ende der Sprache, Text, Folie des ersten Satzes und die
    Sätze mit eigener Folie (goch-vortrag.py verteilt einen Absatz auf mehrere Folien), dazu die Stimmen-ID für spätere
    Läufe mit --nur-marken (die Bühne hält bei einer Zwischenfrage am Absatzende oder, wenn das noch weit ist, am nächsten
    Satzende). Ohne Feld „absatz“ in allen Sätzen: None."""
    if not all('absatz' in s for s in db['saetze']): return None
    absaetze = []
    for s, (a, b) in zip(db['saetze'], zeiten):
        satz = {'von': round(a, 3), 'bis': round(b, 3), 'text': s['text'], 'folie': folie_von(s.get('karte'))}
        if absaetze and absaetze[-1]['id'] == s['absatz']:
            absaetze[-1]['bis'] = round(b, 3); absaetze[-1]['text'] += ' ' + s['text']; absaetze[-1]['saetze'].append(satz)
        else:
            absaetze.append({'id': s['absatz'], 'von': round(a, 3), 'bis': round(b, 3), 'text': s['text'],
                             'folie': satz['folie'], 'saetze': [satz]})
    return {'kapitel': db.get('kapitel', ''), 'titel': db.get('kapiteltitel', ''), 'video': os.path.basename(ausgabe),
            'dauer': round(dauer, 3), 'stimme': stimme, 'absaetze': absaetze}

def marken_schreiben(marken, ausgabe):
    """<ausgabe>.marken.json über <…>.marken.json.tmp und os.replace() – nie halb geschrieben."""
    ziel = os.path.splitext(ausgabe)[0] + '.marken.json'
    with open(ziel + '.tmp', 'w', encoding='utf-8') as f: json.dump(marken, f, ensure_ascii=False, indent=1)
    os.replace(ziel + '.tmp', ziel)
    return ziel

def main(pfad_db, ausgabe, nur_marken=False, stimme_id=None):
    db = json.load(open(pfad_db)); basis = os.path.dirname(os.path.abspath(pfad_db))
    fps, lang = db.get('fps', 30), db.get('sprache', 'de')
    ablage = os.path.join(basis, '.ton')
    stimme_id = stimme_ermitteln(db, ausgabe, nur_marken, stimme_id)
    print(f'Ton (Stimme {stimme_id}):', flush=True)
    saetze_ton = [ton(vertonen(db['stimme'], stimme_id, s.get('sprechen', s['text']), lang, ablage, nur_marken)) for s in db['saetze']]
    stimme, zeiten, rahmen = zeitplan(db, saetze_ton, fps)
    marken = absatzmarken(db, zeiten, len(stimme) / RATE, ausgabe, stimme_id)  # beim Rendern erst nach dem fertigen Video
    if nur_marken:
        # Gegenprobe ohne Stimmdienst: der Ton aus dem Zwischenspeicher muss so lang sein wie das Video
        try:
            with av.open(ausgabe) as v: laenge = v.duration / 1e6
        except (OSError, av.error.FFmpegError, TypeError): sys.exit(f'Video {ausgabe} nicht lesbar – Marken gehören neben das gerenderte Video. Nichts geschrieben.')
        if abs(laenge - len(stimme) / RATE) > .2:
            sys.exit(f'Ton {len(stimme) / RATE:.2f} s, Video {laenge:.2f} s – passt nicht zusammen (andere Stimme oder anderes Drehbuch?). Nichts geschrieben.')
        print(f'Marken → {marken_schreiben(marken, ausgabe)}' if marken else 'Keine Marken: nicht alle Sätze tragen „absatz“'); return
    clip = tempfile.mkdtemp(prefix='goch-clip-daten-')
    # Zwitschern am Anfang und am Ende (Gochs Signalton aus dem Figurenpaket)
    zw = ton(os.path.join(WZ, 'figuren', 'goch', 'toene', 'zwitschern.mp3')) * db.get('zwitschern', .35)
    mix = stimme.copy()
    starts = ([.05] if db.get('zwitschern_anfang', True) else []) + ([zeiten[-1][1] + .35] if db.get('zwitschern_ende', True) else [])
    for start in starts:
        a = int(start * RATE); b = min(len(mix), a + len(zw)); mix[a:b] += zw[:b - a]
    mix = np.clip(mix, -1, 1)
    # Untertitel und Karten je Satz
    untertitel, karten = [], []
    for j, (s, (a, b)) in enumerate(zip(db['saetze'], zeiten)):
        stuecke = teilen(s['text']); laenge = sum(len(x) for x in stuecke); t = a
        bis_satz = zeiten[j + 1][0] - .05 if j + 1 < len(zeiten) else len(mix) / RATE
        for k, x in enumerate(stuecke):
            d = (b - a) * len(x) / laenge
            untertitel.append({'von': round(t - .08, 3), 'bis': round(bis_satz if k == len(stuecke) - 1 else t + d - .02, 3), 'text': x}); t += d
        von = 0 if j == 0 else a - .15
        bis = zeiten[j + 1][0] - .15 if j + 1 < len(zeiten) else len(mix) / RATE + 1
        liste = s['karte'] if isinstance(s['karte'], list) else [s['karte']]  # mehrere Karten teilen sich den Satz
        for k, karte in enumerate(liste):
            teil = (bis - von) / len(liste)
            neu = {**karte, 'von': round(von + k * teil, 3), 'bis': round(von + (k + 1) * teil + (.25 if k < len(liste) - 1 else 0), 3)}
            # Dieselbe Karte im nächsten Satz (z. B. dieselbe Folie): weiterzeigen statt aus- und wieder einblenden
            # (Robin, 11.11.2026: „gochs folie flackert alle ca. 10 sekunden neu auf, auch wenn die folie gar nicht wechselt“)
            vorige = karten[-1] if karten else None
            if vorige and {x: v for x, v in vorige.items() if x not in ('von', 'bis')} == karte and abs(vorige['bis'] - neu['von']) < .3:
                vorige['bis'] = neu['bis']
            else:
                karten.append(neu)
    for name, cfg in db.get('bilder', {}).items(): bild_vorbereiten(name, cfg, basis, clip)
    for k in karten:
        if k.get('art') in ('bild', 'folie'): k['src'] = '/_clip/' + k['src']
    json.dump({'fps': fps, 'rahmen': rahmen, 'untertitel': untertitel, 'karten': karten, 'layout': db.get('layout', ''),
               'kapitel': db.get('kapitel', ''), 'kapiteltitel': db.get('kapiteltitel', '')}, open(os.path.join(clip, 'zeitplan.json'), 'w'))
    print(f'Dauer {len(mix) / RATE:.1f} s, {len(rahmen)} Bilder; Sätze ab ' + ', '.join(f'{a:.1f}' for a, _ in zeiten), flush=True)

    srv = Warteschlange(('127.0.0.1', 0), partial(Server, clip=clip))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/tools/goch-clip/clip.html?daten=/_clip/zeitplan.json'
    out = av.open(ausgabe, 'w', options={'movflags': 'faststart'})
    v = out.add_stream('libx264', rate=fps); v.width, v.height, v.pix_fmt = db.get('breite', 1080), db.get('hoehe', 1350), 'yuv420p'
    v.options = {'crf': '19', 'preset': 'slow', 'profile': 'high'}
    au = out.add_stream('aac', rate=RATE); au.layout = 'mono'; au.bit_rate = 128000
    vorschau = {}
    def schreiben(im):
        n = len(vorschau.setdefault('n', [])); vorschau['n'].append(0)
        if n == int(db.get('vorschau', 10) * fps): im.save(os.path.splitext(ausgabe)[0] + '_vorschau.jpg', quality=88)
        for p in v.encode(av.VideoFrame.from_image(im).reformat(format='yuv420p')): out.mux(p)
    print('Bilder:', flush=True)
    asyncio.run(aufnehmen(url, len(rahmen), schreiben, v.width, v.height))
    for p in v.encode(None): out.mux(p)
    rs = av.AudioResampler(format='fltp', layout='mono', rate=RATE, frame_size=au.codec_context.frame_size or 1024)
    fr = av.AudioFrame.from_ndarray(mix.reshape(1, -1), format='flt', layout='mono'); fr.sample_rate = RATE
    for f in rs.resample(fr) + rs.resample(None):
        for p in au.encode(f): out.mux(p)
    for p in au.encode(None): out.mux(p)
    out.close(); srv.shutdown()
    if marken: print(f'Marken → {marken_schreiben(marken, ausgabe)}')  # erst jetzt: bricht der Lauf ab, bleiben die alten
    elif os.path.exists(alt := os.path.splitext(ausgabe)[0] + '.marken.json'):  # alte Marken passen nicht zum neuen Video
        os.replace(alt, alt + '.alt'); print(f'Alte Marken beiseitegelegt ({alt}.alt): nicht alle Sätze tragen „absatz“')
    print(f'→ {ausgabe} ({os.path.getsize(ausgabe) / 1e6:.1f} MB)')

if __name__ == '__main__':
    args, stimme_id = [a for a in sys.argv[1:] if a != '--nur-marken'], None
    nur_marken = '--nur-marken' in sys.argv
    if '--stimme-id' in args:
        i = args.index('--stimme-id')
        if i + 1 >= len(args): sys.exit(__doc__)
        stimme_id = args[i + 1]; del args[i:i + 2]
        if not nur_marken: sys.exit('--stimme-id gilt nur mit --nur-marken (beim Rendern zählt die Stimme, die vertont)')
    if len(args) != 2: sys.exit(__doc__)
    main(args[0], args[1], nur_marken, stimme_id)
