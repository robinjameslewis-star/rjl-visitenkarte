"""Prüft Schritt 4a von „Ein Tal“ (11.11.2026) in einem frischen Headless-Chrome gegen die Worker-Attrappe:
Tablet und Rechner (über 720 px): Scrollt Goch aus dem Bild, läuft das offene Gespräch als festes Blatt unten rechts mit,
darüber der kleine Goch auf seinem Ast vom rechten Rand; „Seite ansehen“ verkleinert es zur Zeile. Handy: Der kleine Goch
sitzt auf seinem Ast und bleibt weg, solange der große im Bild ist.

Voraussetzungen wie goch_stimme_test.py (Chrome, websockets, laufende Seite und Attrappe).
Aufruf:  python3 tests/goch_blatt_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
FAKE = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-goch-blatt-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9452
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
    profile = tempfile.mkdtemp(prefix='rjl-goch-blatt-')
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
            async def bis(js, gut, dauer=14):  # wartet auf den Zustand statt auf eine feste Pause; gibt den letzten Stand zurück
                ende = time.time() + dauer
                while True:
                    wert = await ev(js)
                    if gut(wert) or time.time() > ende: return wert
                    await pump(0.2)
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

            frei = """(()=>{const p=document.getElementById('goch'),r=p.getBoundingClientRect();
              const pts=[[.08,.06],[.92,.06],[.5,.5],[.08,.94],[.92,.94]].map(([a,b])=>[r.left+r.width*a,r.top+r.height*b]);
              const zu=pts.filter(([x,y])=>!p.contains(document.elementFromPoint(x,y))).length;
              return {fest:getComputedStyle(p).position==='fixed',drin:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,verdeckt:zu,amBody:p.parentNode===document.body,quer:document.documentElement.scrollWidth>innerWidth+1};})()"""
            klein = """(()=>{const m=document.getElementById('goch-mini'),r=m.getBoundingClientRect(),a=m.querySelector('.goch-mini-ast'),v=m.querySelector('.goch-mini-vogel'),p=document.getElementById('goch').getBoundingClientRect();
              const vr=v.getBoundingClientRect(),ar=a.getBoundingClientRect();
              return {ruht:!m.dataset.flug,da:getComputedStyle(m).display==='block',ast:a.complete&&a.naturalWidth>0,vogel:v.complete&&v.naturalWidth>0,fuesse:Math.abs((ar.top-vr.top)-vr.height*.8524)<1.5&&Math.abs(ar.left-vr.left)<1,rand:Math.round(innerWidth-r.right),astBisRand:a.getBoundingClientRect().right>=innerWidth-1,ueberBlatt:r.bottom<=p.top+2,neben:vr.left>=p.right-46&&vr.left+vr.width*.2<=innerWidth&&Math.abs(r.bottom-p.bottom)<40,imBild:r.top>=0};})()"""
            for name, breite, hoehe, touch in (('Tablet_hoch', 820, 1180, True), ('Tablet_quer', 1024, 768, True), ('Rechner', 1280, 800, False)):
                print(f"1. Mitlaufendes Blatt, {name} ({breite} × {hoehe})")
                await send("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 1, "mobile": False})
                await send("Emulation.setTouchEmulationEnabled", {"enabled": touch, "maxTouchPoints": 1})
                await goto(BASE + q('&t=b1' + name))
                await ev("window.scrollTo(0,0)"); await klick('#scene')
                await ev("document.querySelector('.goch-starter').click()"); await pump(0.3)
                if await sichtbar('#goch-consent'): await klick('#goch-allow')
                await pump(2.5)
                f = await ev(frei)
                check(not await klasse('goch-angeheftet') and not f['fest'] and not f['amBody'] and f['verdeckt'] == 0, "Goch im Bild: Das Blatt hängt an seinem Ast, nichts liegt darüber", f)
                check(not await klasse('goch-fokus'), "kein Vollbild")
                await ev("document.getElementById('goch-input').focus()")
                await ev("window.scrollTo(0,1000)"); await pump(0.8)
                f = await ev(frei)
                check(await klasse('goch-angeheftet') and f['fest'] and f['drin'] and f['amBody'], "Goch aus dem Bild: festes Blatt, ganz im Fenster", f)
                check(f['verdeckt'] == 0 and not f['quer'], "nichts liegt über dem Blatt, kein seitliches Scrollen", f)
                check(await ev("document.activeElement.id") == 'goch-input', "das Textfeld behält den Fokus")
                await pump(0.6)
                k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
                check(k['da'] and k['ast'] and k['vogel'] and k['astBisRand'] and k['rand'] == 0, "kleiner Goch sitzt auf seinem Ast, der Ast kommt vom rechten Rand", k)
                check(k['ueberBlatt'] and k['imBild'], "er sitzt über dem Blatt und verdeckt es nicht", k)
                await shot(f"blatt_{name}")
                await ev("window.scrollTo(0,1600)"); await pump(0.5)
                check((await ev(frei))['drin'] and await klasse('goch-angeheftet'), "weitergescrollt: Das Blatt bleibt stehen")
                await klick('#goch-zur-seite')
                check(await klasse('goch-zeile') and await ev("getComputedStyle(document.getElementById('goch-form')).display") == 'none', "„Seite ansehen“ verkleinert das Blatt zur Zeile")
                k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
                check(k['da'] and k['neben'] and k['fuesse'], "der kleine Goch sitzt rechts neben der Kapsel", k)
                kap = await ev("(()=>{const p=document.getElementById('goch').getBoundingClientRect();return [Math.round(p.height), getComputedStyle(document.querySelector('.goch-title small')).display, !!document.getElementById('goch-close').offsetParent];})()")
                check(kap[0] <= 70 and kap[1] == 'none' and kap[2], "die Zeile ist eine einzeilige Kapsel: „Goch“, letzter Satz, Schließen", kap)
                await shot(f"zeile_{name}")
                await klick('#goch-log')
                check(not await klasse('goch-zeile') and await sichtbar('#goch-form'), "Tipp auf die Zeile klappt das Blatt wieder auf")
                if touch:
                    await wisch('.goch-head', 90)
                    check(await klasse('goch-zeile'), "Wisch nach unten am Griff: Zeile")
                    await wisch('#goch', -90)
                    check(await klasse('goch-zeile'), "Wisch über die Kapsel öffnet nichts")
                    await klick('#goch-log')
                    check(not await klasse('goch-zeile'), "Tipp auf die Kapsel: Blatt")
                await klick('#goch-mini-knopf'); await pump(1.6)
                f = await ev(frei)
                check(await ev("scrollY") < 5 and not await klasse('goch-angeheftet') and not f['fest'] and not f['amBody'] and f['verdeckt'] == 0, "Tipp auf den kleinen Goch führt zurück: Das Blatt hängt wieder am Ast", f)
                check(await bis("getComputedStyle(document.getElementById('goch-mini')).display", lambda d: d == 'none') == 'none', "der kleine Goch ist weg")
                await klick('#goch-close'); await ev("window.scrollTo(0,1000)"); await pump(0.6)
                check(not await klasse('goch-angeheftet') and await bis("getComputedStyle(document.getElementById('goch-mini')).display", lambda d: d == 'none') == 'none', "Gespräch zu: kein Blatt, kein kleiner Goch")

            print("2. Handy: kleiner Goch mit Ast")
            await send("Emulation.setDeviceMetricsOverride", {"width": 375, "height": 667, "deviceScaleFactor": 2, "mobile": True})
            await send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 1})
            await goto(BASE + q('&t=b2'))
            await ev("window.__flug = []; new MutationObserver(() => __flug.push(document.getElementById('goch-mini').dataset.flug || 'ruht')).observe(document.getElementById('goch-mini'), { attributes: true, attributeFilter: ['data-flug'] })")
            await ev("window.scrollTo(0,0)"); await klick('#scene')
            await ev("window.scrollTo(0,700)"); await pump(0.3)
            await klick('#goch-laut'); await klick('#goch-stimme-allow'); await pump(0.6)
            check(await klasse('goch-fokus') and not await klasse('goch-angeheftet'), "Handy: Gesprächsmodus wie bisher")
            await klick('#goch-zur-seite'); await pump(0.8)
            k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
            check(await klasse('goch-unterwegs') and k['da'] and k['ast'] and k['astBisRand'] and k['rand'] == 0 and k['neben'], "kleiner Goch sitzt auf seinem Ast vom rechten Rand, neben der Kapsel", k)
            check(not await ev("document.documentElement.scrollWidth > innerWidth + 1"), "kein seitliches Scrollen")
            check(await ev("__flug.slice(0,2)") == ['an', 'ruht'], "der kleine Goch ist angeflogen und sitzt dann", await ev("__flug"))
            check(k['fuesse'], "der Ast liegt unter den Füßen (Lage in Prozent zum Vogel)", k)
            await shot("kleiner_Goch_mit_Ast_Handy")
            # Die Seite bleibt unter dem kleinen Goch bedienbar: Nur der Vogel selbst nimmt Tipps an
            durch = await ev("(()=>{const m=document.getElementById('goch-mini'),a=m.querySelector('.goch-mini-ast').getBoundingClientRect(),v=m.querySelector('.goch-mini-vogel').getBoundingClientRect();const p=(x,y)=>{const e=document.elementFromPoint(x,y);return !!e&&!m.contains(e);};return [p(innerWidth-6,a.top+a.height/2),p(v.left+2,v.top+2),m.contains(document.elementFromPoint(v.left+v.width*.5,v.top+v.height*.5))];})()")
            check(durch == [True, True, True], "Tipps neben dem Vogel gehen an die Seite, der Vogel selbst bleibt antippbar", durch)
            print("2b. Der kleine Goch bewegt den Schnabel, wenn Goch spricht")
            for _ in range(20):
                if await ev("!!document.getElementById('goch-mini').dataset.leben"): break
                await pump(0.25)
            kopf = "(()=>{const m=document.getElementById('goch-mini'),k=[...m.querySelectorAll('[data-kopf]')].find(i=>i.style.opacity==='1');return [m.dataset.schnabel||'', k?k.dataset.kopf:''];})()"
            check(await ev("!!document.getElementById('goch-mini').dataset.leben") and (await ev(kopf))[1] == 'rest', "kleiner Goch hat Körper, Kopf und Schwanz; Schnabel zu", await ev(kopf))
            await ev("window.Goch.ask('Woran arbeitet Robin gerade?')")
            gesehen = set()
            for _ in range(60):
                x = await ev(kopf); gesehen.add(x[1]); await pump(0.08)
                if x[0] != ('zu' if x[1] == 'rest' else x[1]): gesehen.add('ungleich:' + str(x))
            check(('offen' in gesehen or 'halb' in gesehen) and 'rest' in gesehen and not any(g.startswith('ungleich') for g in gesehen), "der Schnabel geht auf und zu, synchron zum großen Goch", sorted(gesehen))
            await pump(3.0)
            check((await ev(kopf))[1] == 'rest', "nach der Antwort ist der Schnabel wieder zu", await ev(kopf))
            k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
            check(k['fuesse'] and k['astBisRand'], "auch mit beweglichen Teilen sitzt er auf dem Ast", k)
            await shot("kleiner_Goch_spricht_Handy")
            await ev("__flug.length = 0; window.scrollTo(0,0)"); await pump(0.3)
            check(await bis("__flug[0] || ''", lambda x: x == 'ab', 4) == 'ab' and await ev("getComputedStyle(document.getElementById('goch-mini')).display") == 'block', "Rückzug: Der kleine Goch fliegt ab und ist dabei noch zu sehen", await ev("__flug"))
            check(await bis("getComputedStyle(document.getElementById('goch-mini')).display", lambda d: d == 'none') == 'none', "großer Goch im Bild: Der kleine ist nicht zu sehen")
            print("2c. Reduzierte Bewegung: kein Flug")
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await ev("__flug.length = 0; window.scrollTo(0,700)"); await pump(0.8)
            k = await ev(klein)
            check(k['da'] and k['fuesse'] and 'an' not in await ev("__flug"), "er erscheint ohne Flug und sitzt auf dem Ast", [k, await ev("__flug")])
            await ev("window.scrollTo(0,0)"); await pump(0.6)
            check(await ev("getComputedStyle(document.getElementById('goch-mini')).display") == 'none' and 'ab' not in await ev("__flug"), "er verschwindet ohne Flug")
            await send("Emulation.setEmulatedMedia", {"features": []})
            await klick('#goch-close')

            print("3. Handy: Leiste des Browsers am unteren Rand (simuliert, 80 px)")
            await goto(BASE + q('&t=b3&unten=80'))
            await ev("(()=>{const b=document.createElement('div');b.id='probe-leiste';b.style.cssText='position:fixed;left:8px;right:8px;bottom:6px;height:68px;border-radius:22px;background:rgba(245,245,247,.92);box-shadow:0 2px 12px rgba(0,0,0,.25);z-index:999;pointer-events:none;font:13px sans-serif;display:grid;place-items:center;color:#555';b.textContent='robin.vision';document.body.append(b);})()")
            await ev("window.scrollTo(0,0)"); await klick('#scene')
            await ev("window.scrollTo(0,700)"); await pump(0.3)
            await klick('#goch-mikro-an'); await klick('#goch-stimme-allow'); await pump(0.8)
            rand = lambda: ev("Math.round(innerHeight - document.getElementById('goch').getBoundingClientRect().bottom)")
            check(await rand() >= 80, "großer Goch: Das Blatt endet über der Leiste", await rand())
            await shot("leiste_unten_fokus_Handy")
            await klick('#goch-zur-seite'); await pump(0.8)
            k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
            check(await klasse('goch-unterwegs') and await rand() >= 80, "Begleitleiste endet über der Leiste des Browsers", await rand())
            pause = await ev("(()=>{const r=document.getElementById('goch-mikro-knopf').getBoundingClientRect();return Math.round(innerHeight-r.bottom);})()")
            check(pause >= 80 and await sichtbar('#goch-mikro-knopf'), "„Pause“ liegt ganz über der Leiste", pause)
            check(k['da'] and k['neben'] and k['astBisRand'], "kleiner Goch sitzt auf seinem Ast neben der Kapsel", k)
            await shot("leiste_unten_begleiter_Handy")
            await klick('#goch-close')
            check(console == [], "keine Skriptfehler", console[:3])
    finally:
        proc.terminate()

asyncio.run(main())
print('\n' + ('ALLE PRÜFUNGEN BESTANDEN' if not failures else f'{len(failures)} FEHLER: ' + '; '.join(failures)))
sys.exit(1 if failures else 0)
