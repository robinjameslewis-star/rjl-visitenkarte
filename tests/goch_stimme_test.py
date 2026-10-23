"""Prüft den sprechenden Goch auf der Startseite (23.10.2026) in einem frischen Headless-Chrome gegen die Worker-Attrappe:
Schalter „Mit Goch sprechen“ und „Goch spricht laut“, eigene Einwilligung nur für den Besuch, Push-to-talk (Tippen und
Halten, höchstens 20 s, WAV 16 kHz an /listen), Stimme zur Antwort mit Schnabel, KI-Hinweis, Grenzen (Text statt Stimme,
ohne Fehlermeldung), sichtbares und hörbares Zwitschern, reduzierte Bewegung, Englisch, Handy.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`, laufende Seite und Attrappe:
    python3 -m http.server 8788            (im Projektordner)
    python3 tests/goch_fake_worker.py 8787
Aufruf:  python3 tests/goch_stimme_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]

Abnahme: Ohne Aktivierung keine Mikrofonanfrage (getUserMedia), kein Ton, keine Anfrage an /listen oder die Stimme;
kein hörbares Zwitschern vor einer Handlung; sichtbares Zwitschern höchstens dreimal; Grenze erreicht → Text statt Stimme.
Mikrofon ist Chromes Testgerät (--use-fake-device-for-media-stream), die Stimme ein kurzer Sinuston der Attrappe."""
import asyncio, base64, io, json, math, os, struct, subprocess, sys, tempfile, time, urllib.parse, urllib.request, wave
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
FAKE = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-goch-stimme-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9343
ENDPOINT = FAKE + '/chat'
failures = []

def check(cond, label, detail=""):
    print(('  ok   ' if cond else '  FAIL ') + label + (f" ({detail})" if detail != "" else ""))
    if not cond: failures.append(label)

def signalton():  # 0,3 s Ton als data:-Adresse, steht für die Zwitscher-Datei
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000)
        w.writeframes(b''.join(struct.pack('<h', int(6000 * math.sin(2 * math.pi * 2600 * i / 8000))) for i in range(2400)))
    return 'data:audio/wav;base64,' + base64.b64encode(buf.getvalue()).decode()

def fake(path):
    return json.load(urllib.request.urlopen(FAKE + path))

# Zählt alles, was Ton oder Mikrofon bedeutet – vor jedem Skript der Seite.
INSTRUMENT = """
window.__z = { gum: 0, play: 0, start: 0, speak: 0, ctx: 0, streams: [] };
window.__mund = [];
(() => {
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) { const o = md.getUserMedia.bind(md); md.getUserMedia = async c => { __z.gum++; const s = await o(c); __z.streams.push(s); return s; }; }
  const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { __z.play++; return P.call(this); };
  const S = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { __z.start++; return S.apply(this, a); };
  if (window.speechSynthesis) { const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { if (u.text) __z.speak++; return sp(u); }; }
  const AC = window.AudioContext; window.AudioContext = class extends AC { constructor(...a) { super(...a); __z.ctx++; } };
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('scene');
    new MutationObserver(() => __mund.push((s.dataset.mund || 'zu') + (s.dataset.lauscht ? '+lauscht' : ''))).observe(s, { attributes: true, attributeFilter: ['data-mund', 'data-lauscht'] });
    // Schnabelposen als Bilder: sichtbar geschaltete Pose mitschreiben
    s.querySelectorAll('.bird-frame[data-mundpose]').forEach(f => new MutationObserver(() => { if (f.style.opacity === '1') __mund.push(f.dataset.mundpose); }).observe(f, { attributes: true, attributeFilter: ['style'] }));
  });
})();
"""

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-goch-stimme-')
    proc = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}', '--no-first-run',
                             '--no-default-browser-check', '--window-size=1280,1100', '--use-fake-ui-for-media-stream',
                             '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0; requests = []; console = []; pending = {}
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Network.requestWillBeSent':
                    requests.append((msg['params']['request']['method'], msg['params']['request']['url']))
                elif m == 'Runtime.exceptionThrown':
                    console.append(msg['params']['exceptionDetails'].get('text', '') + ' ' + str(msg['params']['exceptionDetails'].get('exception', {}).get('description', ''))[:200])
                elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] == 'error':
                    console.append(' '.join(str(a.get('value', a.get('description', ''))) for a in msg['params']['args']))
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
                del pending[mid]
                return fut.result()
            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'].get('text') + ' ' + json.dumps(r['exceptionDetails'].get('exception', {}))[:300])
                return r.get("result", {}).get("value")
            async def shot(name):
                r = await send("Page.captureScreenshot", {"format": "png"})
                open(os.path.join(OUT, name + '.png'), "wb").write(base64.b64decode(r["data"]))
            async def goto(url, wait=4):
                requests.clear()
                await send("Page.navigate", {"url": url}); await pump(wait)
            async def real_click(selector, hold=0):  # echte Maus: Nutzergeste für Ton (iOS-artige Freischaltung)
                box = await ev(f"(()=>{{const e=document.querySelector({json.dumps(selector)});e.scrollIntoView({{block:'center'}});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}})()")
                ziel = await ev(f"(()=>{{const e=document.elementFromPoint({box[0]},{box[1]});const t=document.querySelector({json.dumps(selector)});return t.contains(e)?'':(e&&(e.id||e.className||e.tagName));}})()")
                if ziel: print(f"       Hinweis: Klick auf {selector} trifft {ziel}")
                await send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": box[0], "y": box[1]})
                await send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": box[0], "y": box[1], "button": "left", "clickCount": 1})
                if hold: await pump(hold)
                await send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": box[0], "y": box[1], "button": "left", "clickCount": 1})
                await pump(0.4)
            async def space():
                await send("Input.dispatchKeyEvent", {"type": "keyDown", "key": " ", "code": "Space", "windowsVirtualKeyCode": 32, "text": " "})
                await send("Input.dispatchKeyEvent", {"type": "keyUp", "key": " ", "code": "Space", "windowsVirtualKeyCode": 32})
                await pump(0.2)
            async def escape():
                await send("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
                await send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
                await pump(0.3)
            z = lambda: ev("({...__z, streams: __z.streams.length, offen: __z.streams.filter(s => s.getTracks().some(t => t.readyState === 'live')).length})")
            bubbles = "Array.from(document.querySelectorAll('.goch-bubble')).map(b => b.className.replace('goch-bubble goch-','') + ': ' + b.textContent)"
            sichtbar = lambda sel: ev(f"!document.querySelector({json.dumps(sel)}).hidden && !!document.querySelector({json.dumps(sel)}).offsetParent")
            extern = lambda: [u for _, u in requests if not u.startswith(('http://localhost', 'http://127.0.0.1', 'data:', 'blob:'))]
            ton = signalton()
            q = lambda extra='': f"?goch={urllib.parse.quote(ENDPOINT, safe='')}&stimme=an&zwitschertakt=2500&signalton={urllib.parse.quote(ton, safe='')}" + extra

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT})
            await send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 1100, "deviceScaleFactor": 1, "mobile": False})
            fake('/_modus?stimme=ok&hoeren=ok')
            listen0, chats0 = len(fake('/_listen')), len(fake('/_chats'))  # andere Tests können die Attrappe schon benutzt haben
            neu_listen = lambda: fake('/_listen')[listen0:]

            print("1. Vor jeder Handlung: kein Ton, kein Mikrofon, keine Anfrage; Zwitschern nur sichtbar, höchstens dreimal")
            await goto(BASE + q('&t=1'), wait=2)
            noten = []
            for _ in range(56):  # 14 s: Anflug und Landung (gut 5 s), erstes Zwitschern 1,5 s danach, dann alle 2,5 s
                noten.append(await ev("!document.getElementById('goch-noten').hidden"))
                await pump(0.25)
            n = await ev("+(document.getElementById('scene').dataset.zwitschern || 0)")
            check(any(noten), "Noten erscheinen nach der Landung")
            check(n == 3, "dreimal gezwitschert", n)
            await pump(4)
            check(await ev("+(document.getElementById('scene').dataset.zwitschern || 0)") == 3, "nicht öfter als dreimal je Besuch")
            zz = await z()
            check(zz['gum'] == 0 and zz['play'] == 0 and zz['start'] == 0 and zz['speak'] == 0 and zz['ctx'] == 0, "kein getUserMedia, kein Ton, kein AudioContext", zz)
            check(neu_listen() == [] and not any('/listen' in u for _, u in requests) and len(fake('/_chats')) == chats0, "keine Anfrage an /listen oder /chat")
            check(extern() == [], "keine fremden Hosts", extern()[:3])
            check(not any('vogel-schnabel' in u for _, u in requests), "Schnabelposen vor der Aktivierung nicht geladen")
            check(await ev("!document.getElementById('privacy-goch-stimme').hidden"), "Datenschutzabsatz „Sprechen mit Goch“ sichtbar, wenn die Funktion an ist")

            print("1b. Stimme des Geräts: warme Männerstimme vor Anna, Premium vor einfach, nie online")
            wahl = await ev("""(()=>{const v=(name,lang,lokal=true)=>({name,lang,localService:lokal});
              const mac=[v('Anna (Deutsch (Deutschland))','de-DE'),v('Reed (Deutsch (Deutschland))','de-DE'),v('Markus','de-DE'),v('Markus (Premium)','de-DE'),v('Google Deutsch','de-DE',false),v('Daniel','en-GB'),v('Samantha','en-US')];
              const vz={de:['Markus','Yannick','Viktor','Martin','Reed','Eddy'],en:['Daniel','Arthur','Oliver','Reed','Eddy']};
              const n=x=>x&&x.name;
              return [n(GochAudio.stimmeWaehlen(mac,'de',vz.de)), n(GochAudio.stimmeWaehlen(mac.filter(x=>!x.name.startsWith('Markus')),'de',vz.de)),
                      n(GochAudio.stimmeWaehlen([v('Google Deutsch','de-DE',false)],'de',vz.de)), n(GochAudio.stimmeWaehlen(mac,'en',vz.en))];})()""")
            check(wahl == ['Markus (Premium)', 'Reed (Deutsch (Deutschland))', None, 'Daniel'], "Stimmwahl: Markus (Premium), sonst Reed; keine Online-Stimme; Englisch Daniel", wahl)

            print("2. Öffnen: sichtbares Zwitschern endet, leiser Gruß als Ton, Stummschalter gemerkt")
            await goto(BASE + q('&t=2'), wait=8)
            check(await ev("+(document.getElementById('scene').dataset.zwitschern || 0)") == 1, "erstes Zwitschern nach der Landung")
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(0.5)
            check(await ev("!document.getElementById('goch').hidden"), "Gespräch offen")
            check((await z())['play'] == 1, "beim Öffnen einmal hörbar gezwitschert (nach der Handlung)")
            await pump(6)
            check(await ev("+(document.getElementById('scene').dataset.zwitschern || 0)") == 1 and await ev("document.getElementById('goch-noten').hidden"), "nach dem Öffnen kein weiteres Zwitschern")
            check(await sichtbar('#goch-sprache') and await sichtbar('#goch-stumm'), "Schalter und Stummschalter im Gespräch")
            check(await ev("document.getElementById('goch-mikro').hidden && document.getElementById('goch-ki').hidden"), "Mikrofonknopf und KI-Hinweis noch verborgen")
            await shot("01_schalter")
            await real_click('#goch-stumm')
            check(await ev("localStorage.getItem('rjl-goch-stumm')") == '1' and await ev("document.getElementById('goch-stumm').textContent") == 'Zwitschern an', "Stumm gewählt und gemerkt, Knopf bietet „Zwitschern an“")
            await escape(); await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(0.4)
            check((await z())['play'] == 1, "stumm: beim erneuten Öffnen kein Ton")
            await real_click('#goch-stumm')
            check(await ev("localStorage.getItem('rjl-goch-stumm')") is None, "Stumm wieder aus")

            print("3. „Goch spricht laut“: eigene Einwilligung, ablehnen, erlauben")
            await real_click('#goch-laut')
            check(await sichtbar('#goch-stimme-consent') and not await sichtbar('#goch-sprache'), "eigene Einwilligung erscheint, Schalter ausgeblendet")
            check(await ev("document.activeElement.id") == 'goch-stimme-allow', "Fokus auf „Sprechen erlauben“")
            await shot("02_einwilligung_stimme")
            await real_click('#goch-stimme-deny')
            b = await ev(bubbles)
            check(b[-1].endswith('In Ordnung – dann bleibt es beim Schreiben.') and await ev("document.getElementById('goch-laut').getAttribute('aria-pressed')") == 'false', "Ablehnen: Hinweis, Stimme bleibt aus")
            check((await z())['gum'] == 0, "kein Mikrofon angefragt")
            await real_click('#goch-laut'); await real_click('#goch-stimme-allow')
            zz = await z()
            check(await ev("document.getElementById('goch-laut').getAttribute('aria-pressed')") == 'true' and await sichtbar('#goch-ki'), "Stimme an, Hinweis „KI · künstliche Stimme“ sichtbar")
            check(zz['play'] == 2 and zz['gum'] == 0, "Bestätigung als leises Zwitschern, weiter kein Mikrofon", zz)
            await pump(0.6)
            check(await ev("[...document.querySelectorAll('.bird-mund')].every(f => f.complete && f.naturalWidth === 1153)"), "Schnabelposen nach dem Einschalten geladen")
            check(await ev("Object.keys(sessionStorage).concat(Object.keys(localStorage)).every(k => !/einwill|consent-stimme|stimme-erlaubt/i.test(k))"), "Einwilligung nirgends im Browser gespeichert")

            print("4. Frage mit Stimme: KI-Hinweis, Ton, Schnabel; Text bleibt")
            await ev("document.querySelector('.goch-starter').click()"); await pump(0.4)
            await ev("document.getElementById('goch-allow').click()"); await pump(2.5)
            last = fake('/_chats')[-1]
            check(last.get('stimme') == {'erste': True} and last.get('figur') == 'goch', "Anfrage mit stimme.erste und figur", {k: last.get(k) for k in ('stimme', 'figur', 'gesprochen')})
            b = await ev(bubbles)
            check(b[-1].startswith('goch: Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt.'), "KI-Hinweis bei der ersten gesprochenen Antwort, als Text sichtbar", b[-1][:80])
            zz = await z(); mund = await ev("__mund")
            check(zz['start'] == 1, "Stimme abgespielt", zz['start'])
            check('offen' in mund and 'halb' in mund, "Schnabel folgt der Lautstärke: Posen halb und offen im Wechsel", mund[:8])
            check(await ev("!document.getElementById('scene').dataset.mund && [...document.querySelectorAll('.bird-mund')].every(f => f.style.opacity !== '1') && document.querySelector('.bird-rest').style.opacity === '1'"), "nach dem Ende wieder geschlossen (Sitzpose)")
            await shot("03_antwort_stimme")
            await ev("document.getElementById('goch-input').value='Wer ist Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            check(fake('/_chats')[-1].get('stimme') == {'erste': False} and not (await ev(bubbles))[-1].startswith('goch: Kurz vorab'), "zweite Antwort ohne Hinweis")
            check((await z())['start'] == 2, "zweite Antwort gesprochen")

            print("5. Grenze erreicht: nur Text, kein Ton, keine Fehlermeldung")
            fake('/_modus?stimme=grenze')
            await ev("document.getElementById('goch-input').value='Woran arbeitet Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            zz = await z(); b = await ev(bubbles)
            check(zz['start'] == 2 and zz['speak'] == 0, "keine Stimme, auch keine Browserstimme", zz)
            check(b[-1].startswith('goch: Robin lernt') and not any('Gerade antworte ich nicht' in x for x in b), "Antwort als Text, ohne Fehlermeldung", b[-1][:60])
            fake('/_modus?stimme=fehler')
            await ev("document.getElementById('goch-input').value='Woran arbeitet Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            zz = await z()
            check(zz['start'] == 2 and zz['speak'] == 0 and not any('Gerade antworte ich nicht' in x for x in await ev(bubbles)), "Stimme gestört: nur Text, keine Gerätestimme – jeder hört dieselbe Stimme", f"speak={zz['speak']}")
            fake('/_modus?stimme=ok')

            print("6. „Mit Goch sprechen“: Tippen – sprechen – tippen, Halten, WAV an /listen")
            await real_click('#goch-mikro-an')
            check(await sichtbar('#goch-mikro') and (await z())['gum'] == 0, "Mikrofonknopf da, Mikrofon noch nicht angefragt")
            check((await ev("document.getElementById('goch-mikro-status').textContent")).startswith('Knopf halten oder tippen'), "Hinweis zur Bedienung")
            check(await ev("document.activeElement.id") == 'goch-mikro-knopf', "Fokus auf dem Mikrofonknopf")
            await space(); await pump(1.6)
            zz = await z()
            check(zz['gum'] == 1 and zz['offen'] == 1, "Leertaste: Aufnahme läuft (getUserMedia einmal)", zz)
            check('Ich höre zu' in await ev("document.getElementById('goch-mikro-status').textContent") and await ev("document.getElementById('goch-mikro-knopf').getAttribute('aria-pressed')") == 'true', "Status „Ich höre zu …“, Knopf gedrückt")
            check('zu+lauscht' in await ev("__mund") or await ev("document.getElementById('scene').dataset.lauscht") == '1', "Lauschpose während der Aufnahme")
            await shot("04_aufnahme")
            await space(); await pump(2.5)
            li = neu_listen()
            check(len(li) == 1 and li[0]['kopf'] == 'RIFF' and li[0]['wave'] == 'WAVE' and li[0]['rate'] == 16000 and li[0]['typ'] == 'audio/wav' and li[0]['lang'] == 'de', "WAV (16 kHz) an /listen", li[-1:] )
            check(30000 <= li[0]['bytes'] - 44 <= 80000, "Länge passt zur Aufnahme (gut 1,5 s)", li[0]['bytes'])
            b = await ev(bubbles)
            check('you: Woran arbeitet Robin gerade?' in b, "erkannter Text erscheint als Besuchertext")
            check(fake('/_chats')[-1].get('gesprochen') is True, "läuft über /chat mit gesprochen")
            zz = await z()
            check(zz['offen'] == 0 and not await ev("document.getElementById('scene').dataset.lauscht"), "Mikrofon wieder zu, Lauschpose vorbei", zz)
            await real_click('#goch-mikro-knopf', hold=1.2); await pump(2)
            check(len(neu_listen()) == 2, "Halten und Loslassen: zweite Aufnahme gesendet")
            await real_click('#goch-mikro-knopf', hold=0.05); await pump(0.6)
            check(await ev("document.getElementById('goch-mikro-knopf').getAttribute('aria-pressed')") == 'true', "kurz getippt: Aufnahme läuft weiter")
            await real_click('#goch-mikro-knopf', hold=0.05); await pump(2)
            check(len(neu_listen()) == 3, "erneut getippt: gesendet")

            print("7. Höchstens 20 Sekunden")
            await ev("document.getElementById('goch-mikro-knopf').focus()"); await space(); await pump(21.5)
            li = neu_listen()
            check(len(li) == 4 and 19 * 32000 <= li[-1]['bytes'] - 44 <= 20.3 * 32000, "nach 20 s automatisch beendet und gesendet", li[-1]['bytes'])
            check((await z())['offen'] == 0, "Mikrofon danach zu")

            print("8. Spracheingabe: Grenze und ausgeschaltet")
            fake('/_modus?hoeren=grenze'); vorher = len(fake('/_chats'))
            await ev("document.getElementById('goch-mikro-knopf').focus()"); await space(); await pump(1.2); await space(); await pump(1.5)
            check(await ev("document.getElementById('goch-mikro-status').textContent") == 'Bitte tippen Sie Ihre Frage.' and len(fake('/_chats')) == vorher, "Grenze: Bitte zum Tippen, keine Anfrage an /chat, keine Fehlermeldung")
            check(await ev("document.activeElement.id") == 'goch-input', "Fokus im Textfeld")
            fake('/_modus?hoeren=aus')
            await ev("document.getElementById('goch-mikro-knopf').focus()"); await space(); await pump(1.2); await space(); await pump(1.5)
            check(await ev("document.getElementById('goch-mikro-an').getAttribute('aria-pressed')") == 'false' and 'ausgeschaltet' in await ev("document.getElementById('goch-mikro-status').textContent"), "ausgeschaltet: Mikrofon aus, Hinweis")
            fake('/_modus?hoeren=ok')

            print("9. Sprechen beenden")
            await real_click('#goch-stimme-ende')
            check(await ev("document.getElementById('goch-laut').getAttribute('aria-pressed')") == 'false' and await ev("document.getElementById('goch-stimme-ende').hidden"), "Stimme aus, „Sprechen beenden“ verschwindet")
            await ev("document.getElementById('goch-input').value='Wer ist Robin?'; document.getElementById('goch-send').click()"); await pump(1.5)
            last = fake('/_chats')[-1]
            check(not any(k in last for k in ('stimme', 'gesprochen', 'figur')), "Anfragen wieder wie vorher", list(last.keys()))
            starts = (await z())['start']
            await real_click('#goch-laut')
            check(await sichtbar('#goch-stimme-consent'), "erneutes Einschalten fragt wieder")
            check((await z())['start'] == starts, "kein Ton ohne neue Einwilligung")

            print("10. Reduzierte Bewegung: Noten ohne Bewegung, Schnabel ruhig")
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await goto(BASE + q('&t=10'), wait=3.5)
            check(await ev("+(document.getElementById('scene').dataset.zwitschern || 0)") == 1 and await ev("getComputedStyle(document.querySelector('.bird-tilt')).animationName") == 'none', "Zwitschern ohne Schnabelzucken")
            check(await ev("getComputedStyle(document.querySelector('#goch-noten span')).opacity") == '1' or await ev("document.getElementById('goch-noten').hidden"), "Noten stehen still")
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await real_click('#goch-laut'); await real_click('#goch-stimme-allow')
            await ev("__mund.length = 0; document.querySelector('.goch-starter').click()"); await pump(2.5)
            check((await z())['start'] >= 1 and not any(m in ('offen', 'halb') for m in await ev("__mund")), "Stimme spielt, Schnabel bleibt ruhig", await ev("__mund"))
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "no-preference"}]})

            print("11. Englisch")
            await goto(BASE + q('&t=11&lang=en'), wait=2.5)
            await ev("window.scrollTo(0,0)"); await real_click('#scene')
            labels = await ev("[...document.querySelectorAll('#goch-sprache button')].map(b=>b.textContent)")
            check(labels[:2] == ['Talk to Goch', 'Goch speaks aloud'], "Schalter auf Englisch", labels)
            await real_click('#goch-laut')
            check((await ev("document.querySelector('#goch-stimme-consent p').textContent")).startswith('Talking to Goch:'), "Einwilligung auf Englisch")
            await real_click('#goch-stimme-allow'); await ev("document.querySelector('.goch-starter').click()"); await pump(2.5)
            check((await ev(bubbles))[-1].startswith("goch: Just so you know: I'm an AI") and await ev("document.getElementById('goch-ki').textContent") == 'AI · synthetic voice', "KI-Hinweis auf Englisch")

            print("12. Ohne Schalter (?stimme=aus): alles wie vorher")
            await goto(BASE + f"?goch={urllib.parse.quote(ENDPOINT, safe='')}&stimme=aus&t=12", wait=4.5)
            check(not await ev("document.getElementById('scene').dataset.zwitschern") and await ev("document.getElementById('privacy-goch-stimme').hidden"), "kein Zwitschern, kein Datenschutzabsatz zur Stimme")
            await ev("window.scrollTo(0,0)"); await real_click('#scene')
            check(await ev("document.getElementById('goch-sprache').hidden") and (await z())['play'] == 0, "keine Schalter, kein Ton beim Öffnen")

            print("13. Handy")
            await send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
            await goto(BASE + q('&t=13'), wait=2.5)
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await real_click('#goch-mikro-an'); await real_click('#goch-stimme-allow')
            fits = await ev("(()=>{const p=document.getElementById('goch').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.bottom<=innerHeight&&getComputedStyle(document.getElementById('goch')).position==='fixed';})()")
            check(fits and await sichtbar('#goch-mikro'), "Blatt am unteren Rand mit Mikrofonknopf, passt auf den Bildschirm")
            await shot("05_handy")
            await send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 1100, "deviceScaleFactor": 1, "mobile": False})

            print("14. Konsole und fremde Hosts")
            check(not console, "keine Fehler", "; ".join(console)[:300])
            check(extern() == [], "keine fremden Hosts im letzten Lauf", extern()[:3])
    finally:
        proc.terminate()
    print(f"\nBildschirmfotos: {OUT}")
    print("Alle Prüfungen bestanden." if not failures else f"{len(failures)} Prüfung(en) fehlgeschlagen: " + ", ".join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
