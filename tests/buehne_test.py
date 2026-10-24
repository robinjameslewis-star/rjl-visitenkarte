"""Prüft die Workshop-Bühne (buehne.html, 24.10.2026) in Headless-Chrome gegen den lokalen Dienst (--vortrag) und die
Worker-Attrappe: Kapitelliste, Goch live aus dem Paket „goch“ bei der Workshop-Figur, Halten bei einer Zwischenfrage am
Satzende (Absatzende weit) oder am Absatzende (nah), Folie des Satzes, Stand des Vortrags in der Anfrage, Antwort mit
Stimme, Überleitung zurück an die richtige Stelle, Überspringen, Esc ohne Überleitung, getippte Frage während des Videos,
Fehler und Ersatzantworten freundlich, Frage im letzten Absatz (Video bleibt am Ende stehen), Kapitelwechsel während einer
Antwort, Rückblick im letzten Kapitel vor der Zusammenfassung, reduzierte Bewegung (Sitzpose), keine Fehler in der Konsole.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets av numpy` (PyAV baut ein kurzes Testvideo).
Aufruf:  python3 tests/buehne_test.py [Ordner für Bildschirmfotos]
Ports:   BUEHNE_UP, BUEHNE_DIENST, BUEHNE_CDP (Standard 8795, 8794, 9348) – belegte Ports brechen den Test ab."""
import asyncio, base64, json, os, shutil, socket, subprocess, sys, tempfile, time, urllib.request
import av, numpy as np, websockets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='rjl-buehne-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
UP, DIENST, CDP = (int(os.environ.get(n, d)) for n, d in (('BUEHNE_UP', 8795), ('BUEHNE_DIENST', 8794), ('BUEHNE_CDP', 9348)))
TOKEN = 'messe-1.' + 'B' * 43
PY = sys.executable
failures = []

def check(cond, label, detail=""):
    print(('  ok   ' if cond else '  FAIL ') + label + (f" ({detail})" if detail != "" else ""))
    if not cond: failures.append(label)

def frei(port):
    with socket.socket() as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # TIME_WAIT vom letzten Lauf zählt nicht, ein Listener schon
        try: s.bind(('127.0.0.1', port)); return True
        except OSError: return False

def warte_port(port, sekunden=8):
    ende = time.time() + sekunden
    while time.time() < ende:
        try: socket.create_connection(('127.0.0.1', port), 0.2).close(); return True
        except OSError: time.sleep(0.1)
    return False

def upstream(pfad):
    return json.load(urllib.request.urlopen(f'http://127.0.0.1:{UP}{pfad}', timeout=5))

def testvideo(pfad, sekunden=24, fps=10):
    """Kurzes H.264-Video 320 × 180, Farbe wechselt je Sekunde (nur zum Abspielen und Springen)."""
    c = av.open(pfad, 'w'); s = c.add_stream('libx264', rate=fps); s.width, s.height, s.pix_fmt = 320, 180, 'yuv420p'
    s.options = {'g': str(fps)}  # Schlüsselbild je Sekunde: Sprünge landen genau
    for i in range(sekunden * fps):
        bild = np.zeros((180, 320, 3), np.uint8); bild[:] = ((i // fps) * 37 % 255, 90, 160)
        for p in s.encode(av.VideoFrame.from_ndarray(bild, format='rgb24')): c.mux(p)
    for p in s.encode(): c.mux(p)
    c.close()

# Absatz 0.1 hat vier Sätze auf zwei Folien (wie goch-vortrag.py, wenn ein Absatz über mehrere Folien läuft)
SAETZE = [(2.0, 5.0, 'Satz eins.', 'folie-02.jpg'), (5.3, 9.0, 'Satz zwei.', 'folie-02.jpg'), (9.3, 13.0, 'Satz drei.', 'folie-04.jpg'), (13.3, 17.0, 'Satz vier.', 'folie-04.jpg')]
def marken(kapitel, titel, video):
    return {'kapitel': kapitel, 'titel': titel, 'video': video, 'dauer': 24.0, 'absaetze': [
        {'id': '0.0', 'von': 0.5, 'bis': 1.5, 'text': 'Kapitel null.', 'folie': 'folie-01.jpg', 'saetze': [{'von': 0.5, 'bis': 1.5, 'text': 'Kapitel null.', 'folie': 'folie-01.jpg'}]},
        {'id': '0.1', 'von': 2.0, 'bis': 17.0, 'text': ' '.join(x[2] for x in SAETZE), 'folie': 'folie-02.jpg',
         'saetze': [{'von': a, 'bis': b, 'text': t, 'folie': f} for a, b, t, f in SAETZE]},
        {'id': '0.2', 'von': 17.5, 'bis': 20.0, 'text': 'Absatz drei.', 'folie': 'folie-03.jpg', 'saetze': [{'von': 17.5, 'bis': 20.0, 'text': 'Absatz drei.', 'folie': 'folie-03.jpg'}]},
        {'id': '0.3', 'von': 20.5, 'bis': 23.0, 'text': 'Schluss.', 'folie': '', 'saetze': [{'von': 20.5, 'bis': 23.0, 'text': 'Schluss.', 'folie': ''}]}]}

async def main():
    belegt = [p for p in (UP, DIENST, CDP) if not frei(p)]
    if belegt: sys.exit(f'Ports belegt: {belegt} – andere Ports über BUEHNE_UP, BUEHNE_DIENST, BUEHNE_CDP wählen.')
    tmp = tempfile.mkdtemp(prefix='rjl-buehne-')
    daten, figuren, vortrag = (os.path.join(tmp, n) for n in ('daten', 'figuren', 'vortrag'))
    for d in (daten, figuren, os.path.join(vortrag, 'folien')): os.makedirs(d)
    testvideo(os.path.join(vortrag, 'Kapitel_00_Test.mp4'))
    shutil.copy(os.path.join(vortrag, 'Kapitel_00_Test.mp4'), os.path.join(vortrag, 'Kapitel_01_Schluss.mp4'))
    for n in (1, 2, 3, 4):  # Folienbilder: Goch-Bild aus dem Paket als Platzhalter
        shutil.copy(os.path.join(ROOT, 'figuren', 'goch', 'bilder', 'bestand', 'vogel.webp'), os.path.join(vortrag, 'folien', f'folie-0{n}.jpg'))
    json.dump(marken('Kapitel 0', 'Test', 'Kapitel_00_Test.mp4'), open(os.path.join(vortrag, 'Kapitel_00_Test.marken.json'), 'w'))
    json.dump(marken('Kapitel 1', 'Schluss', 'Kapitel_01_Schluss.mp4'), open(os.path.join(vortrag, 'Kapitel_01_Schluss.marken.json'), 'w'))
    geraet = os.path.join(tmp, 'geraet.json')
    with os.fdopen(os.open(geraet, os.O_WRONLY | os.O_CREAT, 0o600), 'w') as f: json.dump({'worker': f'http://127.0.0.1:{UP}', 'token': TOKEN}, f)
    konfig = os.path.join(tmp, 'konfiguration.json')
    json.dump({'figur': 'kunde-workshop-ki', 'paket': 'goch', 'sprache': 'de', 'taste': 'F13', 'lautstaerke': 0.8, 'stimme': True}, open(konfig, 'w'))
    up = subprocess.Popen([PY, os.path.join(ROOT, 'tests', 'goch_fake_worker.py'), str(UP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    dienst = subprocess.Popen([PY, os.path.join(ROOT, 'kiosk', 'dienst', 'goch_kiosk.py'), '--seite', ROOT, '--figuren', figuren, '--daten', daten, '--geraet', geraet,
                               '--konfiguration', konfig, '--vortrag', vortrag, '--port', str(DIENST), '--lebenszeichen-takt', '60', '--test'],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={CDP}', f'--user-data-dir={tempfile.mkdtemp(prefix="rjl-buehne-chrome-")}', '--no-first-run',
                             '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not (warte_port(UP) and warte_port(DIENST)) or up.poll() is not None or dienst.poll() is not None:
            sys.exit('Attrappe oder Dienst startet nicht.')
        for _ in range(50):
            try: targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{CDP}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0; console = []; pending = {}
            def handle(msg):
                if 'id' in msg and msg['id'] in pending: pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Runtime.exceptionThrown': console.append(str(msg['params']['exceptionDetails'].get('exception', {}).get('description', ''))[:200])
                elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] == 'error': console.append(' '.join(str(a.get('value', a.get('description', ''))) for a in msg['params']['args']))
            async def pump(timeout):
                end = time.time() + timeout
                while time.time() < end:
                    try: raw = await asyncio.wait_for(ws.recv(), timeout=max(0.01, end - time.time()))
                    except asyncio.TimeoutError: break
                    handle(json.loads(raw))
            async def send(method, params=None):
                nonlocal mid; mid += 1
                fut = asyncio.get_event_loop().create_future(); pending[mid] = fut
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while not fut.done(): handle(json.loads(await ws.recv()))
                del pending[mid]; return fut.result()
            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                if 'exceptionDetails' in r: raise RuntimeError(json.dumps(r['exceptionDetails'])[:300])
                return r.get("result", {}).get("value")
            async def shot(name):
                r = await send("Page.captureScreenshot", {"format": "png"}); open(os.path.join(OUT, name + '.png'), "wb").write(base64.b64decode(r["data"]))
            async def taste(key, code=None, vk=0):
                for typ in ("rawKeyDown", "keyUp"):
                    await send("Input.dispatchKeyEvent", {"type": typ, "key": key, "code": code or ('Key' + key.upper()), "windowsVirtualKeyCode": vk or ord(key.upper())})
                await pump(0.1)
            async def esc():
                await taste('Escape', 'Escape', 27)
            async def tippen(text):
                await taste('t'); await send("Input.insertText", {"text": text})
                await taste('Enter', 'Enter', 13)
            zustand = lambda: ev("GochBuehne.zustand()")
            async def warte(bedingung, sekunden=15):
                ende = time.time() + sekunden
                while time.time() < ende:
                    if await ev(bedingung): return True
                    await pump(0.05)
                return False
            async def springen(t):
                await ev(f"(() => {{ const v = document.getElementById('video'); v.currentTime = {t}; return v.play().then(() => true); }})()")
                await warte(f"document.getElementById('video').currentTime >= {t} && !document.getElementById('video').seeking", 5)
            async def fertig():  # Goch hat ausgesprochen
                return await warte("!GochBuehne.zustand().beschaeftigt && !window.GochAudio.spielt", 10)
            async def laden():
                await send("Page.navigate", {"url": f"http://localhost:{DIENST}/buehne.html"})
                return await warte("!!window.GochBuehne", 10)
            letzte = lambda: upstream('/_chats')[-1]
            untertitel = "document.getElementById('untertitel').textContent"

            await send("Page.enable"); await send("Runtime.enable")
            await send("Emulation.setFocusEmulationEnabled", {"enabled": True})  # document.hasFocus() wie im echten Fenster
            check(await laden(), 'Bühne geladen')
            k = json.loads(urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:{DIENST}/kiosk/konfiguration', headers={'Host': f'localhost:{DIENST}'})).read())
            check(k['figur'] == 'kunde-workshop-ki' and k['figurBasis'] == '/figur/goch/', 'Workshop-Figur antwortet, Bilder aus dem Paket „goch“', k.get('figurBasis'))
            check(await warte("!!document.querySelector('#buehne .leben[data-an]') && !!document.querySelector('#buehne .goch[data-leben]')", 8), 'Goch live gebaut (Teile geladen, Sitzpose ausgeblendet)')

            print('Zwischenfrage mitten im langen Absatz: Goch spricht den Satz zu Ende')
            await ev("GochBuehne.kapitelStarten(0).then(() => true)")
            check(await warte("!document.getElementById('video').paused"), 'Kapitel 0 läuft')
            await springen(2.6)
            await taste('h')
            z = await zustand()
            check(z['angemeldet'] and z['angemeldet']['zeit'] == 5.0 and z['modus'] == 'video', 'gemeldet: Halt am Satzende 5,0 s (Absatzende 17 s noch weit)', z['angemeldet'])
            check(await ev("document.getElementById('hinweis').textContent") == 'Frage gemeldet', 'Hinweis „Frage gemeldet“ über dem Video')
            check(await warte("GochBuehne.zustand().modus === 'frage'", 6), 'Video hält, Goch live')
            z = await zustand()
            check(4.95 <= z['zeit'] <= 5.3 and z['absatz'] == 1 and z['satz'] == 0, 'gehalten nach „Satz eins.“', round(z['zeit'], 2))
            check(await ev("document.getElementById('feld').dataset.modus") == 'live' and z['folie'] == '/vortrag/folien/folie-02.jpg', 'Live-Bild mit der Folie des Satzes', z['folie'])
            check(await ev(untertitel) == 'Ihre Frage, bitte.', '„Ihre Frage, bitte.“')
            await shot('buehne-frage')
            n = len(upstream('/_chats'))
            await tippen('Darf ich Mandantennamen in ChatGPT eingeben?')
            check(await warte(f"{untertitel}.includes('Gute Frage')", 8), 'Antwort als Untertitel')
            c = letzte(); v = c.get('vortrag', {})
            check(len(upstream('/_chats')) == n + 1 and c['figur'] == 'kunde-workshop-ki' and c['messages'][-1]['content'] == 'Darf ich Mandantennamen in ChatGPT eingeben?' and c.get('gesprochen') is True,
                  'Frage an die Workshop-Figur, gesprochen')
            check(v.get('zweck') == 'frage' and v.get('kapitel') == 'Kapitel 0: Test' and v.get('gesagt') == 'Satz eins.' and v.get('naechstes') == 'Satz zwei. Satz drei. Satz vier.' and v.get('danach') == 'Absatz drei.'
                  and v.get('fragen') == ['Darf ich Mandantennamen in ChatGPT eingeben?'], 'Stand des Vortrags: gesagt, als Nächstes, danach, Fragen', v)
            await shot('buehne-antwort')
            check(await warte("window.GochAudio.spielt", 4), 'Stimme spielt')
            check(await fertig(), 'Stimme zu Ende')
            await taste('w')
            check(await warte("GochBuehne.zustand().modus === 'video'", 8), 'W: Überleitung, dann zurück ins Video')
            c = letzte()
            check(c['vortrag']['zweck'] == 'ueberleitung' and [m['role'] for m in c['messages']] == ['user', 'assistant', 'user'] and c['messages'][-1]['content'] == 'Weiter im Vortrag.', 'Überleitung mit dem Verlauf der Frage')
            z = await zustand()
            check(5.0 <= z['zeit'] <= 5.6 and not await ev("document.getElementById('video').paused") and await ev(untertitel) == '', 'weiter bei „Satz zwei.“ (5,05 s), Untertitel leer', round(z['zeit'], 2))

            print('Zwischenfrage kurz vor dem Absatzende: Halt am Absatzende, Folie des letzten Satzes, Überspringen')
            await springen(13.6)
            await taste('h')
            check((await zustand())['angemeldet']['zeit'] == 17.0, 'Halt am Absatzende 17 s (nah)')
            check(await warte("GochBuehne.zustand().modus === 'frage'", 6), 'gehalten')
            z = await zustand()
            check(16.95 <= z['zeit'] <= 17.4 and z['satz'] == 3, 'nach „Satz vier.“', round(z['zeit'], 2))
            check(z['folie'] == '/vortrag/folien/folie-04.jpg', 'Folie des letzten Satzes (folie-04), nicht die erste des Absatzes', z['folie'])
            await tippen('Bitte überspringen Sie das, was als Nächstes kommt.')
            check(await warte(f"{untertitel}.includes('Gute Frage')", 8), 'Antwort')
            v = letzte()['vortrag']
            check(v['gesagt'] == 'Satz eins. Satz zwei. Satz drei. Satz vier.' and v['naechstes'] == 'Absatz drei.' and v['danach'] == 'Schluss.' and len(v['fragen']) == 2, 'Stand am Absatzende', v)
            await fertig()
            await taste('w')
            check(await warte("GochBuehne.zustand().modus === 'video'", 8), 'zurück ins Video')
            z = await zustand()
            check(20.2 <= z['zeit'] <= 20.8 and z['uebersprungen'] == 1, 'übersprungen: weiter bei „Schluss.“ (20,25 s), nicht bei „Absatz drei.“', round(z['zeit'], 2))

            print('Frage im letzten Absatz: nach der Antwort bleibt das Video am Ende stehen')
            await springen(21.0)
            await taste('h')
            check(await warte("GochBuehne.zustand().modus === 'frage'", 6), 'gehalten am Ende von „Schluss.“')
            await tippen('Was ist der wichtigste Satz?')
            await warte(f"{untertitel}.includes('Gute Frage')", 8); await fertig()
            await taste('w')
            check(await warte("GochBuehne.zustand().modus === 'video'", 8), 'zurück ins Video')
            await pump(1.0)
            z = await zustand()
            check(z['zeit'] >= 23.5 and await ev("document.getElementById('video').paused"), 'am letzten Bild, nicht von vorn', round(z['zeit'], 2))

            print('Von Hand angehalten, Fehler, Ersatzantwort, Esc ohne Überleitung')
            await springen(6.0); await taste('p'); await pump(0.2)
            await taste('h')
            check((await zustand())['modus'] == 'frage', 'angehalten + H: sofort live')
            z = await zustand()
            check(z['absatz'] == 1 and z['satz'] == 0, 'Stand: zuletzt fertig „Satz eins.“', (z['absatz'], z['satz']))
            fragen_vorher = len(z['fragen'])
            await tippen('fehler bitte')
            check(await warte(f"{untertitel} === 'Das nimmt Robin gleich auf.'", 8), 'Fehler: „Das nimmt Robin gleich auf.“ statt Fehlertext')
            await fertig()
            await tippen('still bitte')
            check(await warte(f"{untertitel} === 'Das nimmt Robin gleich auf.'", 8) and len((await zustand())['fragen']) == fragen_vorher, 'Ersatzantwort des Workers (fehler): eigener Satz, Frage zählt nicht')
            check(not await ev("window.GochAudio.spielt"), 'Ersatzantwort nicht vorgelesen')
            await fertig()
            await tippen('Und Platzhalter?')
            await warte(f"{untertitel}.includes('Gute Frage')", 8); await fertig()
            n = len(upstream('/_chats'))
            await esc()
            check(await warte("GochBuehne.zustand().modus === 'video'", 5), 'Esc: zurück ins Video')
            z = await zustand()
            check(5.0 <= z['zeit'] <= 5.6 and len(upstream('/_chats')) == n, 'ohne Überleitung trotz Verlauf (kein Aufruf), Satz zwei wiederholt', round(z['zeit'], 2))

            print('Getippte Frage, während das Video läuft; Eingabe verliert den Fokus')
            await springen(17.6)
            await tippen('Was ist ein KI-Verzeichnis?')
            check((await zustand())['modus'] == 'video' and (await zustand())['angemeldet']['zeit'] == 20.0, 'vorgemerkt, Halt am Absatzende 20 s')
            check(await warte("GochBuehne.zustand().modus === 'frage'", 6) and await warte(f"{untertitel}.includes('KI-Verzeichnis')", 8), 'am Halt sofort gestellt und beantwortet')
            await fertig()
            n = len(upstream('/_chats'))
            await ev("GochBuehne.frageStellen('Zweite A'), GochBuehne.frageStellen('Zweite B'), true")  # zweite kommt, während Goch antwortet
            check(await warte(f"{untertitel}.includes('Zweite B')", 10) and await fertig() and [c['messages'][-1]['content'] for c in upstream('/_chats')[n:]] == ['Zweite A', 'Zweite B'],
                  'zwei Fragen kurz nacheinander: beide gestellt, der Reihe nach')
            await taste('t'); await ev("document.getElementById('eingabe').blur(), true")
            check(not await ev("'tippen' in document.getElementById('feld').dataset"), 'Fokus weg: Eingabe zu')
            await taste('w'); await warte("GochBuehne.zustand().modus === 'video'", 8)
            check((await zustand())['modus'] == 'video', 'Tasten wirken wieder (W)')

            print('Kapitelwechsel während einer Antwort')
            await springen(2.6); await taste('p'); await pump(0.2); await taste('h')
            await ev("GochBuehne.frageStellen('Frage kurz vor dem Wechsel'), GochBuehne.kapitelStarten(1).then(() => true)")  # Antwort noch unterwegs
            await pump(1.5)
            z = await zustand()
            check(z['kap'] == 1 and z['modus'] == 'video' and z['zeit'] < 3 and not z['beschaeftigt'] and not await ev("window.GochAudio.spielt"),
                  'neues Kapitel von vorn, Goch still, alte Antwort verworfen', (z['kap'], z['modus'], round(z['zeit'], 2)))

            print('Rückblick im letzten Kapitel')
            await springen(15.5)
            check(await warte("GochBuehne.zustand().modus === 'rueckblick'", 6), 'vor der Zusammenfassung: Rückblick')
            check(await warte(f"{untertitel}.includes('7 Fragen')", 6), 'Rückblick gesprochen')
            c = letzte()  # erst jetzt: die Anfrage ist sicher bei der Attrappe
            check(c['vortrag']['zweck'] == 'rueckblick' and len(c['vortrag']['fragen']) == 7, 'Rückblick kennt die sieben beantworteten Fragen (ohne Fehler, Ersatzantwort, verworfene)', c['vortrag'].get('fragen'))
            await shot('buehne-rueckblick')
            check(await warte("GochBuehne.zustand().modus === 'video'", 15), 'danach weiter im Video')
            z = await zustand()
            check(17.2 <= z['zeit'] <= 17.9, 'weiter bei „Absatz drei.“', round(z['zeit'], 2))
            check(not console, 'keine Fehler in der Konsole', console[:3])

            print('Reduzierte Bewegung; Rückblick nur mit Fragen aus dem letzten Kapitel')
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            check(await laden(), 'neu geladen')
            await pump(1.0)
            sitz = await ev("(() => { const i = document.querySelector('#buehne .goch img.sitz'); return i && i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === '1'; })()")
            check(sitz and not await ev("!!document.querySelector('#buehne .leben[data-an]')"), 'Sitzpose statt bewegter Teile')
            await ev("GochBuehne.kapitelStarten(1).then(() => true)")
            await springen(13.6); await taste('h')  # Halt am Ende des Absatzes vor der Zusammenfassung
            await warte("GochBuehne.zustand().modus === 'frage'", 6)
            await tippen('Erste Frage erst im letzten Kapitel')
            await warte(f"{untertitel}.includes('Gute Frage')", 8); await fertig()
            n = len(upstream('/_chats'))
            await taste('w')
            check(await warte("GochBuehne.zustand().modus === 'rueckblick'", 6) and await warte(f"{untertitel}.includes('1 Fragen')", 6),
                  'W dort: gleich der Rückblick, auch wenn die Fragen erst im letzten Kapitel kamen')
            neu = upstream('/_chats')[n:]
            check([c['vortrag']['zweck'] for c in neu] == ['rueckblick'] and len(neu[0]['vortrag']['fragen']) == 1, 'keine Überleitung davor, kein zweiter Wechsel live–Video–live', [c['vortrag']['zweck'] for c in neu])
            check(await warte("GochBuehne.zustand().modus === 'video'", 15) and 17.2 <= (await zustand())['zeit'] <= 17.9, 'danach weiter bei „Absatz drei.“')
            await send("Emulation.setEmulatedMedia", {"features": []})
    finally:
        proc.terminate(); dienst.terminate(); up.terminate()
    print(f'\nBildschirmfotos: {OUT}')
    print('Alle Prüfungen bestanden.' if not failures else f'{len(failures)} Prüfung(en) fehlgeschlagen: ' + ', '.join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
