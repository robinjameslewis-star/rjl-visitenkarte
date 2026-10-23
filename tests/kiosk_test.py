"""Prüft die Seite des Messegeräts (kiosk.html, 23.10.2026) in Headless-Chrome im Hochformat gegen den lokalen Dienst
(kiosk/dienst/goch_kiosk.py --test) und die Worker-Attrappe: Ruhe, Taster F13 und Touch, Hinweis und Einwilligung mit
zweitem Druck, Push-to-talk, Antwort als Untertitel mit Stimme und KI-Hinweis, Zurücksetzen nach Inaktivität, nichts im
Browser gespeichert, Radar-Zwitschern (Abklingzeit, nie im Gespräch), offline mit vorbereiteten Antworten, Sprachwahl,
Kundenfigur als Logo mit Signalton und Puls, 1080 × 1920 und 2160 × 3840.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`. Startet Attrappe und Dienst selbst.
Aufruf:  python3 tests/kiosk_test.py [Ordner für Bildschirmfotos]"""
import asyncio, base64, io, json, math, os, socket, struct, subprocess, sys, tempfile, time, urllib.request, wave, zlib
import websockets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='rjl-kiosk-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
UP, DIENST, CDP = 8797, 8796, 9347
TOKEN = 'messe-1.' + 'K' * 43
PY = sys.executable
failures = []

def check(cond, label, detail=""):
    print(('  ok   ' if cond else '  FAIL ') + label + (f" ({detail})" if detail != "" else ""))
    if not cond: failures.append(label)

def warte_port(port, sekunden=8):
    ende = time.time() + sekunden
    while time.time() < ende:
        try: socket.create_connection(('127.0.0.1', port), 0.2).close(); return True
        except OSError: time.sleep(0.1)
    return False

def ton(sek=0.8, hz=330):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(b''.join(struct.pack('<h', int(9000 * math.sin(2 * math.pi * hz * i / 16000))) for i in range(int(16000 * sek))))
    return buf.getvalue()

def png(w, h, farbe=(11, 61, 46)):
    zeile = b'\x00' + bytes(farbe) * w
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(zeile * h)) + chunk(b'IEND', b'')

def post(pfad, body):
    req = urllib.request.Request(f'http://127.0.0.1:{DIENST}{pfad}', data=json.dumps(body).encode(), method='POST',
                                 headers={'content-type': 'application/json', 'Host': f'localhost:{DIENST}'})
    urllib.request.urlopen(req, timeout=5).read()

def upstream(pfad):
    return json.load(urllib.request.urlopen(f'http://127.0.0.1:{UP}{pfad}', timeout=5))

INSTRUMENT = """
window.__z = { gum: 0, play: 0, start: 0, speak: 0, speicher: 0, keks: 0 };
(() => {
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) { const o = md.getUserMedia.bind(md); md.getUserMedia = c => { __z.gum++; return o(c); }; }
  const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { __z.play++; return P.call(this); };
  const S = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { __z.start++; return S.apply(this, a); };
  const I = Storage.prototype.setItem; Storage.prototype.setItem = function (...a) { __z.speicher++; return I.apply(this, a); };
  const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  Object.defineProperty(document, 'cookie', { get: () => d.get.call(document), set: v => { __z.keks++; d.set.call(document, v); } });
})();
"""

async def main():
    tmp = tempfile.mkdtemp(prefix='rjl-kiosk-')
    daten, figuren = os.path.join(tmp, 'daten'), os.path.join(tmp, 'figuren')
    os.makedirs(os.path.join(daten, 'offline', 'goch'))
    open(os.path.join(daten, 'offline', 'goch', 'a1.wav'), 'wb').write(ton())
    json.dump({'antworten': [{'frage': {'de': 'Wer ist Robin?', 'en': 'Who is Robin?'}, 'antwort': {'de': 'Robin baut Werkzeuge für Kanzleien.', 'en': 'Robin builds tools for firms.'},
               'audio': {'de': 'a1.wav', 'en': 'a1.wav'}}]}, open(os.path.join(daten, 'offline', 'goch', 'antworten.json'), 'w'))
    kunde = os.path.join(figuren, 'kunde-test')
    os.makedirs(os.path.join(kunde, 'bilder')); os.makedirs(os.path.join(kunde, 'toene'))
    open(os.path.join(kunde, 'bilder', 'logo.png'), 'wb').write(png(400, 200))
    open(os.path.join(kunde, 'toene', 'ton.wav'), 'wb').write(ton(0.5, 2400))
    json.dump({'format': 1, 'id': 'kunde-test', 'name': {'de': 'Muster', 'en': 'Muster'}, 'rolle': {'de': 'Empfang', 'en': 'Front desk'}, 'sprachen': ['de', 'en'], 'oeffentlich': False,
               'texte': {'quelle': 'figur', 'begruessung': {'de': 'Willkommen!', 'en': 'Welcome!'}, 'einstiegsfragen': {'de': ['Was bieten Sie an?'], 'en': ['What do you offer?']}},
               'wissen': {'quelle': 'redaktion'}, 'animation': {'art': 'logo', 'fassungen': {'standard': 'bilder/'}, 'logo': {'datei': 'logo.png', 'breite': 400, 'hoehe': 200}, 'puls': {'min': 1, 'max': 1.08}},
               'signalton': {'datei': 'ton.wav', 'rueckfall': 'ton.wav', 'lautstaerke': 0.4}, 'stimme': {'anbieter': 'browser', 'voiceId': '', 'rueckfall': 'browser'}}, open(os.path.join(kunde, 'figur.json'), 'w'))
    geraet = os.path.join(tmp, 'geraet.json')
    with os.fdopen(os.open(geraet, os.O_WRONLY | os.O_CREAT, 0o600), 'w') as f: json.dump({'worker': f'http://127.0.0.1:{UP}', 'token': TOKEN}, f)
    def konfig(figur):
        pfad = os.path.join(tmp, f'konfiguration-{figur}.json')
        json.dump({'figur': figur, 'sprache': 'de', 'sprachwahl': True, 'inaktivitaet_s': 9, 'aufnahme_s': 20, 'taste': 'F13', 'lautstaerke': 0.8, 'stimme': True,
                   'zwitschern': {'an': True, 'abklingzeit_s': 3, 'entfernung_m': [1, 3], 'lautstaerke': 0.5}, 'ruhezeiten': []}, open(pfad, 'w'))
        return pfad
    def dienst_starten(figur):
        p = subprocess.Popen([PY, os.path.join(ROOT, 'kiosk', 'dienst', 'goch_kiosk.py'), '--seite', ROOT, '--figuren', figuren, '--daten', daten, '--geraet', geraet,
                              '--konfiguration', konfig(figur), '--port', str(DIENST), '--lebenszeichen-takt', '60', '--test'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        warte_port(DIENST); return p
    up = subprocess.Popen([PY, os.path.join(ROOT, 'tests', 'goch_fake_worker.py'), str(UP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    warte_port(UP)
    dienst = dienst_starten('goch')
    proc = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={CDP}', f'--user-data-dir={tempfile.mkdtemp(prefix="rjl-kiosk-chrome-")}', '--no-first-run', '--window-size=1080,1920',
                             '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try: targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{CDP}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0; requests = []; console = []; pending = {}
            def handle(msg):
                if 'id' in msg and msg['id'] in pending: pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Network.requestWillBeSent': requests.append(msg['params']['request']['url'])
                elif m == 'Runtime.exceptionThrown': console.append(str(msg['params']['exceptionDetails'].get('exception', {}).get('description', ''))[:200])
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
            async def taste(halten=0.0):
                await send("Input.dispatchKeyEvent", {"type": "rawKeyDown", "key": "F13", "code": "F13", "windowsVirtualKeyCode": 124})
                await pump(halten or 0.05)
                await send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "F13", "code": "F13", "windowsVirtualKeyCode": 124})
                await pump(0.3)
            async def tippen(x, y, halten=0.05):
                await send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}); await pump(halten)
                await send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}); await pump(0.3)
            async def klick(selector):
                box = await ev(f"(()=>{{const r=document.querySelector({json.dumps(selector)}).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}})()")
                await tippen(box[0], box[1])
            zustand = lambda: ev("document.body.dataset.zustand")
            z = lambda: ev("({...__z})")
            text = lambda sel: ev(f"(document.querySelector({json.dumps(sel)})||{{}}).textContent||''")
            sichtbar = lambda sel: ev(f"(()=>{{const e=document.querySelector({json.dumps(sel)});return !!e && !e.hidden && e.getClientRects().length>0;}})()")
            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT})
            await send("Emulation.setDeviceMetricsOverride", {"width": 1080, "height": 1920, "deviceScaleFactor": 1, "mobile": False})

            print("1. Ruhe im Hochformat")
            await send("Page.navigate", {"url": f"http://localhost:{DIENST}/kiosk.html"}); await pump(3)
            check(await zustand() == 'ruhe' and await sichtbar('#kiosk'), "Kiosk sichtbar, Zustand Ruhe")
            check(await ev("[...document.querySelectorAll('#scene img')].some(i => i.naturalWidth > 0 && i.src.includes('/figur/goch/bilder/bestand/vogel.webp'))"), "Goch aus dem Figurenpaket (Fassung auf Weiß)")
            check(await text('#k-name') == 'Goch' and await text('#k-rolle') == 'das Rotkehlchen von Robin', "Name und Rolle aus language.js")
            check(await ev("(()=>{const a=document.querySelector('#scene img.figur-ebene[data-ebene=\"ast\"]');return !!a && a.naturalWidth===1153 && !a.closest('.figur-kippen') && a.src.includes('/figur/goch/bilder/bestand/ast.webp');})()"), "Goch sitzt auf dem Ast (Ebene vor der Figur, kippt nicht mit)")
            check('Knopf drücken' in await text('#k-anleitung') and await ev("document.querySelectorAll('#k-beispiele li').length") == 3, "Einladung und drei Beispielfragen")
            check(await sichtbar('#k-ki') and await text('#k-ki') == 'KI · künstliche Stimme', "Hinweis „KI · künstliche Stimme“ dauerhaft sichtbar")
            check((await z())['gum'] == 0, "kein Mikrofon vor dem Gespräch")
            await shot("01_ruhe_1080x1920")

            print("2. Radar: hörbares Zwitschern nur in Ruhe, mit Abklingzeit")
            post('/kiosk/test/radar', {'entfernung': 2.0}); await pump(0.5)
            check(await ev("document.body.dataset.gezwitschert") == '1' and await ev("document.getElementById('scene').classList.contains('zwitschert')"), "Person in 2 m: Goch zwitschert (sichtbar; Goch hat noch keine Tondatei)")
            post('/kiosk/test/radar', {'entfernung': 2.0}); post('/kiosk/test/radar', {'entfernung': 5.0}); await pump(0.5)
            check(await ev("document.body.dataset.gezwitschert") == '1', "Abklingzeit und Entfernung beachtet")
            await pump(3); post('/kiosk/test/radar', {'entfernung': 1.5}); await pump(0.5)
            check(await ev("document.body.dataset.gezwitschert") == '2', "nach der Abklingzeit wieder")

            print("3. Taster: Hinweis, dann Einwilligung mit zweitem Druck")
            await taste()
            check(await zustand() == 'hinweis' and await sichtbar('#k-hinweis') and 'künstlich erzeugter Stimme' in await text('#k-hinweis-text'), "erster Druck: Hinweis (KI, Verarbeitung)")
            check((await z())['gum'] == 0, "Hinweis allein öffnet kein Mikrofon")
            post('/kiosk/test/radar', {'entfernung': 2.0}); await pump(0.3)
            check(await ev("document.body.dataset.gezwitschert") == '2', "kein Zwitschern außerhalb der Ruhe")
            await shot("02_hinweis")
            await taste()
            check(await zustand() == 'bereit' and (await text('.antwort')).startswith('Ich bin Goch'), "zweiter Druck: bereit, Begrüßung als Untertitel")

            await ev("window.__posen = []; document.querySelectorAll('#scene img[data-pose=\"halb\"], #scene img[data-pose=\"offen\"]').forEach(f => new MutationObserver(() => { if (f.style.opacity === '1') __posen.push(f.dataset.pose); }).observe(f, {attributes: true, attributeFilter: ['style']}))")
            print("4. Sprechen: Taster halten, Antwort mit Stimme und KI-Hinweis")
            await taste(halten=1.4); await pump(3)
            li = upstream('/_listen'); chats = upstream('/_chats'); auth = upstream('/_auth')
            check(li and li[-1]['kopf'] == 'RIFF' and li[-1]['rate'] == 16000, "WAV an /kiosk/listen (über den Dienst)")
            check(chats[-1].get('gesprochen') is True and chats[-1].get('stimme') == {'erste': True} and chats[-1].get('figur') == 'goch', "Frage mit gesprochen, stimme.erste und Figur", {k: chats[-1].get(k) for k in ('gesprochen', 'stimme', 'figur')})
            check(auth and all(a == 'Bearer ' + TOKEN for a in auth), "Nachweis kommt vom Dienst, nicht von der Seite")
            check(await text('.besucher') == 'Woran arbeitet Robin gerade?' and (await text('.antwort')).startswith('Kurz vorab: Ich bin eine KI'), "Untertitel: Frage und Antwort mit KI-Hinweis")
            check((await z())['start'] == 1 and (await z())['gum'] == 1, "Stimme abgespielt, Mikrofon einmal")
            posen = await ev("__posen")
            check('halb' in posen and 'offen' in posen, "Goch bewegt den Schnabel (Posen halb und offen)", posen[:6])
            await shot("03_antwort")
            await pump(1.5)
            await tippen(540, 1000, halten=1.3); await pump(3)
            check(upstream('/_chats')[-1].get('stimme') == {'erste': False} and len(upstream('/_listen')) == 2, "Touch halten: zweite Frage, ohne erneuten Hinweis")
            check(not any(TOKEN in u for u in requests), "Nachweis in keiner Anfrage der Seite")

            print("5. Nach 60 s (hier 9 s) ohne Aktivität: alles zurück")
            await pump(11)
            check(await zustand() == 'ruhe' and await ev("document.querySelectorAll('#k-untertitel p').length") == 0 and await ev("Kiosk.verlauf") == 0, "Gespräch gelöscht, Ruhe")
            await taste()
            check(await zustand() == 'hinweis', "Einwilligung zurückgesetzt: wieder der Hinweis")
            await pump(10)
            zz = await z()
            check(zz['speicher'] == 0 and zz['keks'] == 0 and await ev("localStorage.length + sessionStorage.length") == 0 and await ev("document.cookie") == '', "nichts im Browser gespeichert (Storage, Cookies)", zz)

            print("6. Ohne Netz: Hinweis und vorbereitete Antworten")
            post('/kiosk/test/netz', {'online': False}); await pump(0.6)
            check(await sichtbar('#k-offline') and 'ohne Netz' in await text('#k-anleitung'), "„offline“ angezeigt")
            check(await ev("document.querySelectorAll('#k-beispiele button[data-offline]').length") == 1, "vorbereitete Antwort zum Antippen")
            vorher = (await z())['start']
            await klick('#k-beispiele button[data-offline]'); await pump(1)
            check(await text('.antwort') == 'Robin baut Werkzeuge für Kanzleien.' and (await z())['start'] == vorher + 1, "Antwort als Untertitel, Stimme vom Gerät")
            await shot("04_offline")
            post('/kiosk/test/netz', {'online': True}); await pump(0.6)
            check(not await sichtbar('#k-offline'), "wieder online")

            print("7. 2160 × 3840")
            await send("Emulation.setDeviceMetricsOverride", {"width": 1080, "height": 1920, "deviceScaleFactor": 2, "mobile": False}); await pump(0.5)
            await shot("05_2160x3840")
            fits = await ev("(()=>{const r=document.getElementById('scene').getBoundingClientRect();return r.width>500 && r.bottom<=innerHeight && document.documentElement.scrollWidth<=innerWidth;})()")
            check(fits, "Figur groß, nichts läuft über den Rand")
            await send("Emulation.setDeviceMetricsOverride", {"width": 1080, "height": 1920, "deviceScaleFactor": 1, "mobile": False})

            print("8. Sprachwahl")
            await klick('#k-sprachen button[data-lang="en"]'); await pump(2.5)
            check(await ev("document.documentElement.lang") == 'en' and 'press the button' in await text('#k-anleitung') and await text('#k-rolle') == "Robin's robin", "Englisch nach Wahl")

            print("9. Kundenfigur als Logo: Texte aus der Redaktion, Signalton, Puls")
            dienst.terminate(); dienst.wait(); dienst = dienst_starten('kunde-test')
            await send("Page.navigate", {"url": f"http://localhost:{DIENST}/kiosk.html"}); await pump(3)
            check(await ev("!!document.querySelector('#scene.figur-logo img.figur-logo')") and await text('#k-name') == 'Muster' and 'Was bieten Sie an?' in await text('#k-beispiele'), "Logo, Name und Einstiegsfrage der Kundenfigur")
            post('/kiosk/test/radar', {'entfernung': 2.0}); await pump(0.6)
            check((await z())['play'] == 1, "Signalton der Figur bei Anwesenheit hörbar")
            await taste(); await taste()
            await ev("window.__puls = []; new MutationObserver(() => __puls.push(document.querySelector('#scene .figur-kippen').style.transform)).observe(document.querySelector('#scene .figur-kippen'), {attributes: true})")
            await taste(halten=1.2); await pump(3)
            puls = await ev("__puls")
            check(upstream('/_chats')[-1].get('figur') == 'kunde-test' and any('scale(1.0' in p and p != 'scale(1.0000)' for p in puls), "Frage an die Kundenfigur, Logo pulsiert mit der Stimme", puls[:4])
            await shot("06_kundenfigur_logo")

            print("10. Konsole und fremde Hosts")
            check(not console, "keine Fehler", "; ".join(console)[:300])
            check(all(u.startswith(('http://localhost', 'data:', 'blob:')) for u in requests), "keine fremden Hosts", [u for u in requests if not u.startswith(('http://localhost', 'data:', 'blob:'))][:3])
    finally:
        proc.terminate(); dienst.terminate(); up.terminate()
    print(f"\nBildschirmfotos: {OUT}")
    print("Alle Prüfungen bestanden." if not failures else f"{len(failures)} Prüfung(en) fehlgeschlagen: " + ", ".join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
