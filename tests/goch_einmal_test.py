"""Prüft Schritt 3 von „Ein Tal“ (11.11.2026) in einem frischen Headless-Chrome gegen die Worker-Attrappe:
Mikrofon-Symbol am Eingabefeld (eine Frage sprechen: „Goch hört“ geht sichtbar an und nach der Frage wieder aus),
ohne Antippen kein Mikrofon, und am Handy lässt sich der große Goch aufheben und zurückholen.

Voraussetzungen wie goch_stimme_test.py (Chrome, websockets, laufende Seite und Attrappe).
Aufruf:  python3 tests/goch_einmal_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
FAKE = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-goch-einmal-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9347
failures = []

def check(cond, label, detail=""):
    print(('  ok   ' if cond else '  FAIL ') + label + (f" ({detail})" if detail != "" else ""))
    if not cond: failures.append(label)

def fake(path):
    return json.load(urllib.request.urlopen(FAKE + path))

# Zählt Mikrofonanfragen; das Mikrofon ist ein Sägezahn, hörbar nur, solange __sprich wahr ist (wie goch_stimme_test.py).
INSTRUMENT = """
window.__z = { gum: 0, streams: [] }; window.__sprich = false;
(() => {
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) md.getUserMedia = async () => {
    __z.gum++;
    const ac = new AudioContext(), osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination();
    osc.type = 'sawtooth'; osc.frequency.value = 160; tor.gain.value = 0;
    osc.connect(tor); tor.connect(ziel); osc.start();
    const takt = setInterval(() => { tor.gain.value = __sprich ? .25 : 0; }, 10);
    ziel.stream.getTracks()[0].addEventListener('ended', () => clearInterval(takt));
    __z.streams.push(ziel.stream);
    return ziel.stream;
  };
})();
"""

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-goch-einmal-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}', '--no-first-run',
                             '--no-default-browser-check', '--window-size=1280,900', '--use-fake-ui-for-media-stream',
                             '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0; console = []; pending = {}
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                if msg.get('method') == 'Runtime.exceptionThrown':
                    console.append(msg['params']['exceptionDetails'].get('text', '') + ' ' + str(msg['params']['exceptionDetails'].get('exception', {}).get('description', ''))[:200])
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
                r = await send("Page.captureScreenshot", {"format": "jpeg", "quality": 82})
                open(os.path.join(OUT, name + '.jpg'), "wb").write(base64.b64decode(r["data"]))
            async def goto(url, wait=3):
                await send("Page.navigate", {"url": url})
                for _ in range(40):
                    if await ev("location.href.startsWith(" + json.dumps(BASE) + ") && document.readyState === 'complete'"): break
                    await pump(0.25)
                for _ in range(60):  # Goch muss gelandet sein, sonst öffnet der Klick kein Gespräch
                    if await ev("document.getElementById('scene').dataset.state") == 'rest': break
                    await pump(0.25)
                await pump(wait)
            async def klick(selector):  # echte Maus (Nutzergeste); meldet, wenn etwas anderes getroffen wird
                box = await ev(f"(()=>{{const e=document.querySelector({json.dumps(selector)});e.scrollIntoView({{block:'nearest'}});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}})()")
                ziel = await ev(f"(()=>{{const e=document.elementFromPoint({box[0]},{box[1]});const t=document.querySelector({json.dumps(selector)});return t.contains(e)?'':(e&&(e.id||e.className||e.tagName));}})()")
                check(not ziel, f"Klick auf {selector} trifft das Ziel", ziel)
                await punkt(box[0], box[1])
            async def punkt(x, y):
                await send("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
                await send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1})
                await send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1})
                await pump(0.4)
            async def wisch(selector, dy):  # Finger auf die Mitte des Elements, dann dy Pixel nach unten (negativ: nach oben)
                x, y = await ev(f"(()=>{{const r=document.querySelector({json.dumps(selector)}).getBoundingClientRect();return [r.left+r.width*.3,r.top+r.height/2];}})()")
                await send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
                for i in range(1, 6):
                    await send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + dy * i / 5}]})
                await send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                await pump(0.4)
            z = lambda: ev("({gum: __z.gum, offen: __z.streams.filter(s => s.getTracks().some(t => t.readyState === 'live')).length})")
            an = lambda id: ev(f"document.getElementById('{id}').getAttribute('aria-pressed')")
            sichtbar = lambda sel: ev(f"!document.querySelector({json.dumps(sel)}).hidden && !!document.querySelector({json.dumps(sel)}).offsetParent")
            klasse = lambda k: ev(f"document.documentElement.classList.contains('{k}')")
            bubbles = "Array.from(document.querySelectorAll('.goch-bubble')).map(b => b.className.replace('goch-bubble goch-','') + ': ' + b.textContent)"
            q = lambda extra='': f"?goch={urllib.parse.quote(FAKE + '/chat', safe='')}&stimme=an&zwitschertakt=60000" + extra

            await send("Page.enable"); await send("Runtime.enable")
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT})
            fake('/_modus?stimme=ok&hoeren=ok')
            listen0 = len(fake('/_listen'))
            neu_listen = lambda: fake('/_listen')[listen0:]

            for name, breite, hoehe, mobil in (('Rechner', 1280, 900, False), ('Handy', 375, 667, True)):
                print(f"1. Mikrofon-Symbol, {name}")
                await send("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 2 if mobil else 1, "mobile": mobil})
                await goto(BASE + q('&t=e1' + name))
                await ev("window.scrollTo(0,0)"); await klick('#scene')
                check(await sichtbar('#goch-mikro-einmal') and await an('goch-mikro-an') == 'false' and await an('goch-laut') == 'false', "Gespräch offen: Symbol sichtbar, beide Schalter aus")
                labels = await ev("[...document.querySelectorAll('#goch-sprache button')].slice(0,2).map(b=>b.textContent)")
                check(labels == ['Goch hört', 'Goch spricht'], "Schalter heißen „Goch hört“ und „Goch spricht“", labels)
                vorher = len(neu_listen())
                await ev("document.querySelector('.goch-starter').click()"); await pump(0.3)
                if await sichtbar('#goch-consent'): await klick('#goch-allow')  # Einwilligung ins Gespräch (beim ersten Durchlauf)
                await pump(2.5)
                zz = await z()
                check(zz['gum'] == 0 and len(neu_listen()) == vorher and any(b.startswith('goch: ') for b in (await ev(bubbles))[1:]), "getippt gefragt, Goch antwortet: kein Mikrofon, nichts an /listen", zz)
                await klick('#goch-mikro-einmal')
                check(await sichtbar('#goch-stimme-consent') and (await z())['gum'] == 0 and await an('goch-mikro-an') == 'false', "Symbol angetippt: erst die Einwilligung, Mikrofon noch zu")
                check('„Goch hört“' in await ev("document.querySelector('#goch-stimme-consent p').textContent"), "Einwilligung nennt „Goch hört“")
                await klick('#goch-stimme-allow'); await pump(0.8)
                zz = await z()
                check(zz['gum'] == 1 and zz['offen'] == 1 and await an('goch-mikro-an') == 'true', "erlaubt: Mikrofon offen, „Goch hört“ leuchtet", zz)
                check(await sichtbar('#goch-mikro') and not await sichtbar('#goch-mikro-einmal'), "Zeile mit „Pause“ sichtbar, Symbol ausgeblendet")
                check(not await klasse('goch-fokus'), "Goch wird dabei nicht groß")
                await shot(f"einmal_{name}_hoert")
                n0 = len(neu_listen())
                await ev("__sprich = true"); await pump(1.3); await ev("__sprich = false"); await pump(3.0)
                check(len(neu_listen()) == n0 + 1 and fake('/_chats')[-1].get('gesprochen') is True, "die Frage ging an /listen und als gesprochen an /chat")
                await pump(2.0)
                zz = await z()
                check(await an('goch-mikro-an') == 'false' and zz['offen'] == 0, "nach der Frage: „Goch hört“ ist wieder aus, das Mikrofon zu", zz)
                check(await sichtbar('#goch-mikro-einmal') and not await sichtbar('#goch-mikro'), "Symbol wieder da, Zeile mit „Pause“ weg")
                await ev("__sprich = true"); await pump(1.3); await ev("__sprich = false"); await pump(2.5)
                zz = await z()
                check(len(neu_listen()) == n0 + 1 and zz['gum'] == 1 and zz['offen'] == 0, "danach gesprochen: nichts gesendet, kein neues Mikrofon", zz)
                await shot(f"einmal_{name}_danach")
                await klick('#goch-mikro-einmal'); await pump(0.6)
                check((await z())['offen'] == 1 and await an('goch-mikro-an') == 'true', "zweites Antippen: wieder offen, ohne neue Einwilligung")
                await klick('#goch-mikro-knopf'); await pump(0.3)
                check((await z())['offen'] == 0 and await an('goch-mikro-an') == 'false', "„Pause“ beendet die eine Frage: Schalter aus, Mikrofon zu")
                await klick('#goch-mikro-einmal'); await pump(0.6); await klick('#goch-mikro-an'); await pump(0.3)
                check((await z())['offen'] == 0 and await an('goch-mikro-an') == 'false', "Tipp auf den leuchtenden Schalter schaltet aus")
                await klick('#goch-mikro-einmal'); await pump(0.6); await klick('#goch-close'); await pump(0.3)
                check((await z())['offen'] == 0 and await an('goch-mikro-an') == 'false', "Gespräch geschlossen: Schalter aus, Mikrofon zu")

            print("2. Handy: „Goch hört“ wie bisher, großen Goch aufheben und zurückholen")
            await send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 1})
            await goto(BASE + q('&t=e2'))
            await ev("window.scrollTo(0,0)"); await klick('#scene')
            await ev("window.scrollTo(0,700)"); await pump(0.3)
            await klick('#goch-mikro-an'); await klick('#goch-stimme-allow'); await pump(0.8)
            check(await klasse('goch-fokus') and await ev("scrollY") == 0, "„Goch hört“ an: Goch rückt in den Fokus")
            n0 = len(neu_listen())
            await ev("__sprich = true"); await pump(1.3); await ev("__sprich = false"); await pump(5.0)
            check(len(neu_listen()) == n0 + 1 and await an('goch-mikro-an') == 'true' and (await z())['offen'] == 1, "nach der Antwort hört Goch weiter zu (wie bisher)")
            oben = await ev("(()=>{const r=document.getElementById('scene').getBoundingClientRect();return document.getElementById('scene').contains(document.elementFromPoint(r.left+r.width*.35,r.top+r.height*.4));})()")
            check(oben, "Goch steht oben und ist nicht verdeckt")
            await shot("fokus_Handy")
            band = await ev("Math.round(document.getElementById('goch').getBoundingClientRect().top - document.getElementById('scene').getBoundingClientRect().bottom)")
            print(f"     Papier zwischen Goch und Blatt: {band} px")
            frei = await ev("(()=>{for(let y=innerHeight-6;y>0;y-=6)for(const x of [6,innerWidth-6,innerWidth/2]){const e=document.elementFromPoint(x,y);if(e&&e.id==='goch-papier')return [x,y];}return null;})()")
            check(bool(frei), "neben dem Blatt ist Papier erreichbar", frei)
            await ev("document.getElementById('goch-input').focus()"); await pump(0.3)
            check(await klasse('goch-fokus'), "Tipp ins Textfeld hebt den großen Goch nicht auf")
            if frei: await punkt(frei[0], frei[1])
            check(await klasse('goch-fokus') and await ev("document.activeElement.id") != 'goch-input', "Textfeld aktiv: Tipp neben das Blatt schließt nur die Tastatur")
            if frei: await punkt(frei[0], frei[1])
            check(await klasse('goch-unterwegs') and not await klasse('goch-fokus'), "Tipp neben das Blatt gibt die Seite frei")
            check(abs(await ev("scrollY") - 700) < 3 and await ev("getComputedStyle(document.documentElement).overflowY") != 'hidden', "die Seite steht wieder, wo sie war, und scrollt", await ev("scrollY"))
            leiste = [(await z())['offen'], await sichtbar('#goch-mikro-knopf'), await ev("getComputedStyle(document.getElementById('goch-form')).display")]
            check(leiste == [1, True, 'none'], "Goch hört weiter zu, das Gespräch ist eine schmale Leiste", leiste)
            check(await ev("getComputedStyle(document.getElementById('goch-mini')).display") == 'block' and not await ev("document.getElementById('goch-mini').classList.contains('goch-mini-weg')"), "kleiner Goch in der Ecke")
            await shot("begleiter_Handy")
            n0 = len(neu_listen())
            await ev("__sprich = true"); await pump(1.3); await ev("__sprich = false"); await pump(5.0)
            check(len(neu_listen()) == n0 + 1 and (await ev(bubbles))[-1].startswith('goch: '), "als Begleiter gefragt: Goch antwortet in der Leiste")
            await ev("window.scrollTo(0,0)"); await pump(0.5)
            check(await ev("document.getElementById('goch-mini').classList.contains('goch-mini-weg')"), "ist der große Goch im Bild, bleibt der kleine weg")
            await ev("window.scrollTo(0,700)"); await pump(0.5)
            await klick('#goch-log'); await pump(0.3)
            check(await klasse('goch-fokus'), "Tipp auf die Leiste holt Goch zurück")
            await wisch('.goch-head', 90)
            check(await klasse('goch-unterwegs') and abs(await ev("scrollY") - 700) < 3, "Wisch nach unten am Griff gibt die Seite frei")
            await wisch('#goch', -90)
            check(await klasse('goch-fokus'), "Wisch nach oben auf der Kapsel holt Goch zurück")
            await wisch('#scene', -80)
            check(await klasse('goch-unterwegs'), "Wisch über den großen Goch gibt die Seite frei")
            await ev("window.scrollTo(0,1100)"); await pump(0.3)
            await klick('#goch-mini-knopf')
            check(await klasse('goch-fokus'), "weitergescrollt, kleiner Goch angetippt: Goch wieder groß")
            await klick('#goch-close'); await pump(0.3)
            check(abs(await ev("scrollY") - 1100) < 3, "geschlossen: Die Seite steht dort, wo der Besucher zuletzt war", await ev("scrollY"))
            await ev("window.scrollTo(0,0)"); await klick('#scene'); await ev("window.scrollTo(0,700)"); await pump(0.3)
            check(await klasse('goch-fokus') and await an('goch-mikro-an') == 'true', "wieder geöffnet: „Goch hört“ ist noch gewählt, Goch groß")
            await klick('#goch-zur-seite')
            check(await klasse('goch-unterwegs'), "„Seite ansehen“ gibt die Seite frei")
            check(await ev("getComputedStyle(document.getElementById('goch-mini')).display") == 'none', "am Seitenanfang ist nur der große Goch zu sehen, nicht auch der kleine")
            await ev("window.scrollTo(0,700)"); await pump(0.5)
            await klick('#goch-mini-knopf')
            check(await klasse('goch-fokus'), "Tipp auf den kleinen Goch holt ihn zurück")
            await klick('#goch-close'); await pump(0.3)
            check(not await klasse('goch-fokus') and not await klasse('goch-unterwegs') and (await z())['offen'] == 0, "Gespräch geschlossen: alles wie vorher, Mikrofon zu")
            check(console == [], "keine Skriptfehler", console[:3])
    finally:
        proc.terminate()

asyncio.run(main())
print('\n' + ('ALLE PRÜFUNGEN BESTANDEN' if not failures else f'{len(failures)} FEHLER: ' + '; '.join(failures)))
sys.exit(1 if failures else 0)
