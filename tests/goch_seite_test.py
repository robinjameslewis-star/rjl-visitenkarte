"""Prüft Schritt 4b von „Ein Tal“ (11.11.2026): Goch auf den Unterseiten (goch-seite.js). In einem frischen Headless-Chrome
gegen die Worker-Attrappe: Der Platz im Kopf steht fest (nichts springt), Goch sitzt auf seinem Ast vom rechten Rand, das
Gespräch öffnet als Blatt (Handy, Tablet, Rechner), keine Begrüßung und keine Anfrage von selbst, kein „Goch zeigt“,
Sprache und Titel der Seite bleiben, Goch aus heißt überall aus, ausgenommene Seiten bleiben unberührt.

Voraussetzungen wie goch_stimme_test.py (Chrome, websockets, laufende Seite und Attrappe).
Aufruf:  python3 tests/goch_seite_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
FAKE = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-goch-seite-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9453
failures = []

def check(cond, label, detail=""):
    print(('  ok   ' if cond else '  FAIL ') + label + (f" ({detail})" if detail != "" else ""))
    if not cond: failures.append(label)

def fake(path):
    return json.load(urllib.request.urlopen(FAKE + path))

# Zählt Mikrofonanfragen; das Mikrofon ist ein Sägezahn, hörbar nur, solange __sprich wahr ist (wie goch_stimme_test.py).
INSTRUMENT = """
window.__z = { gum: 0, streams: [] }; window.__sprich = false;
// Lage des Inhalts, bevor goch-seite.js etwas tut – später darf sie nicht anders sein (kein Sprung)
document.addEventListener('DOMContentLoaded', () => { const m = document.querySelector('main'); window.__mainOben = m ? Math.round(m.getBoundingClientRect().top + scrollY) : null; });
// „Goch aus“ nachstellen: Die Startseite kommt ohne Endpunkt zurück (?gochaus=1)
if (/[?&]gochaus=1/.test(location.search)) { const f = window.fetch; window.fetch = async (u, o) => { const r = await f(u, o); if (!/index[.]html$/.test(String(u))) return r; return new Response((await r.text()).replace(/data-chat-endpoint="[^"]*"/, 'data-chat-endpoint=""'), { status: 200, headers: { 'content-type': 'text/html' } }); }; }
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
    profile = tempfile.mkdtemp(prefix='rjl-goch-seite-')
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
            mid = 0; console = []; pending = {}; anfragen = []; gewicht = [0, 0, 0]; kaputt = []
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                if msg.get('method') == 'Network.requestWillBeSent': anfragen.append(msg['params']['request']['url'])
                if msg.get('method') == 'Network.responseReceived' and msg['params']['response']['status'] >= 400: kaputt.append((msg['params']['response']['status'], msg['params']['response']['url']))
                if msg.get('method') == 'Network.loadingFinished': gewicht[0] += msg['params'].get('encodedDataLength', 0)
                if msg.get('method') == 'Page.loadEventFired': gewicht[1] = gewicht[0]; gewicht[2] = len(anfragen)
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
            async def goto(url, wait=1.5):
                anfragen.clear(); gewicht[0] = gewicht[1] = gewicht[2] = 0
                await send("Page.navigate", {"url": url})
                for _ in range(40):
                    if await ev("location.href.startsWith(" + json.dumps(BASE) + ") && document.readyState === 'complete'"): break
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

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", {"cacheDisabled": True})
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT})
            fake('/_modus?stimme=ok&hoeren=ok')
            listen0 = len(fake('/_listen'))
            neu_listen = lambda: fake('/_listen')[listen0:]

            async def bereit():
                for _ in range(80):
                    if await ev("!!document.querySelector('#goch-kopf.bereit') && !!window.Goch && !!window.GochStimme && !!window.GochZeigen"): return True
                    await pump(0.25)
                return False
            zum_worker = lambda: [u for u in anfragen if u.startswith(FAKE)]
            frei = """(()=>{const p=document.getElementById('goch'),r=p.getBoundingClientRect();
              const pts=[[.08,.06],[.92,.06],[.5,.5],[.08,.94],[.92,.94]].map(([a,b])=>[r.left+r.width*a,r.top+r.height*b]);
              return {fest:getComputedStyle(p).position==='fixed',drin:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,verdeckt:pts.filter(([x,y])=>!p.contains(document.elementFromPoint(x,y))).length,quer:document.documentElement.scrollWidth>innerWidth+1};})()"""
            vogel = """(()=>{const s=document.getElementById('scene'),r=s.getBoundingClientRect(),b=s.querySelector('.bird-rest'),a=s.querySelector('.branch img'),k=document.getElementById('goch-kopf').getBoundingClientRect();
              return {vogel:b.complete&&b.naturalWidth>0&&getComputedStyle(b).opacity==='1',ast:a.complete&&a.naturalWidth>0,astBisRand:a.getBoundingClientRect().right>=innerWidth-1,imStreifen:r.top>=k.top-2&&r.bottom<=k.bottom+12,frei:s.contains(document.elementFromPoint(r.left+r.width*.35,r.top+r.height*.4))&&s.contains(document.elementFromPoint(r.left+r.width*.45,r.top+r.height*.82)),breite:Math.round(r.width),quer:document.documentElement.scrollWidth>innerWidth+1};})()"""
            klein = """(()=>{const m=document.getElementById('goch-mini'),r=m.getBoundingClientRect(),a=m.querySelector('.goch-mini-ast'),p=document.getElementById('goch').getBoundingClientRect();
              return {ruht:!m.dataset.flug,da:getComputedStyle(m).display==='block',ast:a.complete&&a.naturalWidth>0,astBisRand:a.getBoundingClientRect().right>=innerWidth-1,ueberBlatt:r.bottom<=p.top+2,neben:m.querySelector('.goch-mini-vogel').getBoundingClientRect().left>=p.right-46};})()"""
            GROESSEN = (('Handy', 375, 667, True), ('Tablet', 820, 1180, False), ('Tablet_quer', 1024, 768, False), ('Rechner', 1280, 800, False))
            SEITEN = (('workshops/', 'de'), ('ueber-mich/', 'de'), ('blog/', 'de'), ('werkzeuge/en/', 'en'), ('workshops/e-rechnung/', 'de'), ('blog/das-ende-des-erp/', 'de'))
            nr = 0
            for name, breite, hoehe, mobil in GROESSEN:
                await send("Emulation.setDeviceMetricsOverride", {"width": breite, "height": hoehe, "deviceScaleFactor": 2 if mobil else 1, "mobile": mobil})
                await send("Emulation.setTouchEmulationEnabled", {"enabled": mobil or name.startswith('Tablet'), "maxTouchPoints": 1})
                for pfad, lang in (SEITEN if not name.startswith('Tablet') else SEITEN[:2]):
                    nr += 1
                    print(f"{nr}. {pfad} am {name} ({breite} × {hoehe})")
                    await goto(BASE + pfad + q('&t=s%d' % nr))
                    titel = await ev("document.title")
                    check(await bereit(), "Goch ist da (Platz gefüllt, Gespräch bereit)")
                    await pump(1.0)
                    v = await bis(vogel, lambda v: v['vogel'] and v['ast'] and v['astBisRand'])
                    check(v['vogel'] and v['ast'] and v['astBisRand'], "Goch sitzt auf seinem Ast, der Ast kommt vom rechten Rand", v)
                    flug = await bis("[document.getElementById('scene').dataset.ready || '', document.getElementById('scene').dataset.state || '']", lambda f: f == ['true', 'rest'])
                    vorLoad = [u for u in anfragen[:gewicht[2]] if any(w in urllib.parse.urlparse(u).path for w in ('flugpose', 'bird-flight', 'goch', 'language.js', 'figuren/'))]
                    check(flug == ['true', 'rest'] and len([u for u in anfragen if 'flugpose' in u]) == 4 and vorLoad == [u for u in vorLoad if 'goch-seite.js' in u], "Goch ist angeflogen und gelandet; Flugbilder und Skripte kamen erst nach dem Laden der Seite", [flug, vorLoad[:3]])
                    land = await bis("""(()=>{const r=document.documentElement,k=document.getElementById('goch-kopf'),m=document.querySelector('main'),e=[...document.querySelectorAll('.tal-ebene img')];
                      return {an:r.classList.contains('landscape-on')&&r.classList.contains('tal-on'),himmel:!!k.querySelector('.landscape-sky'),gestirne:!!k.querySelector('.landscape-sun')&&!!k.querySelector('.landscape-moon')&&k.querySelectorAll('.landscape-stars circle').length>20,
                        krone:!!k.querySelector('.landscape-crown img'),ferne:!!k.querySelector('.landscape-far img'),ebenen:e.length,geladen:e.filter(i=>i.complete&&i.naturalWidth>0).length,klein:e.every(i=>/-900\\./.test(i.currentSrc)),
                        blatt:getComputedStyle(m).backgroundColor!=='rgba(0, 0, 0, 0)',talHinten:getComputedStyle(document.querySelector('.tal')||document.body).zIndex};})()""", lambda l: l['an'] and l['ebenen'] == 3 and l['geladen'] == 3 and l['blatt'])
                    check(land['an'] and land['himmel'] and land['gestirne'] and land['krone'] and land['ferne'], "Kopf mit Landschaft: Himmel, Sonne, Mond, Sterne, Krone, Ferne", land)
                    check(land['ebenen'] == 3 and land['geladen'] == 3 and land['talHinten'] == '-1' and land['blatt'] and (land['klein'] or not mobil), "Tal hinter der Seite (drei Ebenen" + (", am Handy die 900-px-Fassung" if mobil else "") + "), der Inhalt steht als Blatt darüber", land)
                    check(not [u for u in anfragen[:gewicht[2]] if 'landschaften/' in u or 'landscape.js' in u], "Landschaft und Tal laden erst nach dem Laden der Seite")
                    check(v['imStreifen'] and v['frei'] and not v['quer'], "er sitzt im Kopf der Seite, nichts liegt über ihm, kein seitliches Scrollen", v)
                    oben = await ev("[window.__mainOben, Math.round(document.querySelector('main').getBoundingClientRect().top + scrollY)]")
                    check(oben[0] is not None and oben[0] == oben[1], "der Inhalt steht, wo er vor Goch stand (kein Sprung)", oben)
                    check(await ev("document.title") == titel and await ev("document.documentElement.lang") == lang, "Titel und Sprache der Seite bleiben")
                    blase = await bis("(()=>{const b=document.getElementById('goch-gruss');return b&&b.classList.contains('da')?[b.lastChild.textContent,b.firstChild.textContent]:null;})()", lambda b: bool(b), 6)
                    check(bool(blase) and blase[0] == await ev("document.getElementById('goch-kopf').dataset.gruss") and blase[1].startswith('Goch'), "nach der Landung: kleine Begrüßung neben Goch, als KI-Figur gekennzeichnet", blase)
                    check(zum_worker() == [] and (await z())['gum'] == 0, "ohne Antippen: keine Anfrage an Goch, kein Mikrofon – auch die Begrüßung fragt den Worker nicht", zum_worker()[:2])
                    if pfad == 'ueber-mich/': await shot(f"unterseite_{name}_gruss")
                    if pfad == 'ueber-mich/': await shot(f"unterseite_{name}_zu")
                    if nr == 1: print(f"     Gewicht {pfad}: {gewicht[1]/1000:.0f} KB bis load, {gewicht[0]/1000:.0f} KB mit Goch")
                    await ev("window.scrollTo(0,0)"); await klick('#scene')
                    f = await ev(frei)
                    check(await bis("!document.getElementById('goch-gruss')", lambda x: x, 3), "Gespräch offen: Die Begrüßung ist weg")
                    check(await ev("!document.getElementById('goch').hidden") and f['fest'] and f['drin'] and f['verdeckt'] == 0 and not f['quer'], "Tipp auf Goch: Das Gespräch öffnet als Blatt, ganz im Fenster, nichts liegt darüber", f)
                    v = await ev(vogel)
                    check(v['frei'] and v['astBisRand'], "Goch und sein Ast bleiben frei, wenn das Blatt offen ist", v)
                    gruss = (await ev(bubbles))[0]
                    soll = await ev("[document.getElementById('goch-kopf').dataset.gruss || '', (document.getElementById('goch-kopf').dataset.fragen || '').split('|')]")
                    check(len(soll[0]) > 10 and gruss == 'goch: ' + soll[0], "Goch grüßt passend zur Seite, in ihrer Sprache", gruss[:60])
                    fragen = await ev("[...document.querySelectorAll('#goch-starters .goch-starter')].map(b => b.textContent)")
                    check(len(soll[1]) == 3 and fragen == soll[1], "Einstiegsfragen passen zur Seite", fragen)
                    check(zum_worker() == [], "geöffnet: weiter keine Anfrage – Goch begrüßt nicht über den Worker")
                    check(await ev("[...document.querySelectorAll('#goch a[href*=\"#privacy\"]')].every(a => a.href.startsWith(" + json.dumps(BASE) + "))"), "„Impressum & Datenschutz“ führt zur Startseite")
                    n0 = len(fake('/_chats'))
                    await ev("document.querySelector('.goch-starter').click()"); await pump(0.3)
                    if await sichtbar('#goch-consent'): await klick('#goch-allow')
                    await pump(2.5)
                    ch = fake('/_chats')
                    check(len(ch) == n0 + 1 and 'kannZeigen' not in ch[-1] and 'anlass' not in ch[-1] and ch[-1].get('lang') == lang and ch[-1].get('seite') == '/' + pfad and ch[-1]['messages'][-1]['content'] == soll[1][0], "eine Frage, eine Anfrage: ohne „Goch zeigt“, ohne Anlass, in der Sprache der Seite", {k: ch[-1].get(k) for k in ('lang', 'kannZeigen', 'anlass')} if ch else '')
                    check((await ev(bubbles))[-1].startswith('goch: ') and (await ev(frei))['drin'], "Goch antwortet im Blatt")
                    if pfad == 'workshops/':
                        await klick('#goch-mikro-einmal'); await klick('#goch-stimme-allow'); await pump(0.8)
                        check((await z())['offen'] == 1 and await an('goch-mikro-an') == 'true' and not await klasse('goch-fokus'), "Mikrofon-Symbol: „Goch hört“ leuchtet für eine Frage")
                        await ev("__sprich = true"); await pump(1.3); await ev("__sprich = false"); await pump(5.0)
                        check((await z())['offen'] == 0 and await an('goch-mikro-an') == 'false' and fake('/_chats')[-1].get('gesprochen') is True, "nach der Frage: Schalter aus, Mikrofon zu")
                        await shot(f"unterseite_{name}_offen")
                        if mobil:
                            await klick('#goch-laut'); await pump(0.6)
                            o = await ev("""(()=>{const s=document.getElementById('scene'),r=s.getBoundingClientRect(),p=document.getElementById('goch').getBoundingClientRect();return {fest:getComputedStyle(s).position==='fixed',imFenster:r.top>=0,ueberBlatt:Math.round(p.top-r.bottom),frei:s.contains(document.elementFromPoint(r.left+r.width*.35,r.top+r.height*.4))};})()""")
                            check(await klasse('goch-fokus') and o['fest'] and o['imFenster'] and o['frei'] and -26 <= o['ueberBlatt'] <= 40, "„Goch spricht“ am Handy: Goch groß, direkt über dem Blatt, nicht verdeckt", o)
                            await shot(f"unterseite_{name}_fokus")
                            await klick('#goch-zur-seite'); await ev("window.scrollTo(0,700)"); await pump(0.8)
                            k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'])
                            check(await klasse('goch-unterwegs') and k['da'] and k['ast'] and k['astBisRand'] and k['neben'], "Seite freigegeben: kleiner Goch auf seinem Ast neben der Kapsel", k)
                            for _ in range(20):
                                if await ev("!!document.getElementById('goch-mini').dataset.leben"): break
                                await pump(0.25)
                            await ev("document.getElementById('scene').dataset.schnabel = 'offen'"); await pump(0.3)
                            check(await ev("(()=>{const k=[...document.querySelectorAll('#goch-mini [data-kopf]')].find(i=>i.style.opacity==='1');return !!k&&k.dataset.kopf==='offen'&&k.naturalWidth>0;})()"), "der kleine Goch zeigt auch hier den Schnabel des großen")
                            await ev("document.getElementById('scene').dataset.schnabel = 'zu'")
                            await shot(f"unterseite_{name}_begleiter")
                        else:
                            await ev("window.scrollTo(0,900)"); await pump(0.9)
                            k = await bis(klein, lambda k: k['ruht'] and k['da'] and k['ast'] and k['astBisRand']); f = await bis(frei, lambda f: f['drin'] and f['verdeckt'] == 0)
                            check(await klasse('goch-angeheftet') and f['drin'] and f['verdeckt'] == 0 and k['da'] and k['astBisRand'] and k['ueberBlatt'], "weitergescrollt: Blatt bleibt, kleiner Goch auf seinem Ast darüber", [f, k])
                            await shot(f"unterseite_{name}_gescrollt")
                            await klick('#goch-zur-seite')
                            kap = await bis("""(()=>{const p=document.getElementById('goch').getBoundingClientRect(),c=document.getElementById('goch-close'),cr=c.getBoundingClientRect(),v=document.querySelector('#goch-mini .goch-mini-vogel').getBoundingClientRect();
                              return {zeile:document.documentElement.classList.contains('goch-zeile'),hoch:Math.round(p.height),drin:p.left>=0&&p.right<=innerWidth,zu:c.contains(document.elementFromPoint(cr.left+cr.width/2,cr.top+cr.height/2)),neben:v.left>=p.right-46};})()""", lambda k: k['zeile'] and k['neben'] and k['hoch'] <= 76)
                            check(kap['zeile'] and kap['hoch'] <= 76 and kap['drin'] and kap['zu'] and kap['neben'], "„Seite ansehen“: Kapsel links neben dem kleinen Goch, Schließen erreichbar", kap)
                            await shot(f"unterseite_{name}_kapsel")
                            await klick('#goch-log')
                            check(not await klasse('goch-zeile'), "Tipp auf die Kapsel klappt das Blatt wieder auf")
                    else:
                        await ev("window.scrollTo(0,0)"); await shot(f"unterseite_{name}_{pfad.strip('/').replace('/', '_')}")
                    await klick('#goch-close')
                    check(await ev("document.getElementById('goch').hidden") and (await z())['offen'] == 0, "geschlossen: Mikrofon zu")
                    check(kaputt == [], "keine Datei fehlt (keine Antwort ab 400)", kaputt[:3]); kaputt.clear()
                    if nr == 1:
                        await goto(BASE + pfad + q('&t=nochmal')); check(await bereit(), "zweiter Besuch derselben Seite: Goch ist da")
                        await bis("document.getElementById('scene').dataset.state", lambda x: x == 'rest'); await pump(1.5)
                        check(await ev("!document.getElementById('goch-gruss')"), "zweiter Besuch im selben Tab: keine Begrüßung mehr")
                    await ev("Object.keys(sessionStorage).filter(k => k.startsWith('rjl-goch-gruss')).forEach(k => sessionStorage.removeItem(k))")

            print("Schalter: ?tal=aus und ?landschaft=aus; Nacht")
            await send("Emulation.setDeviceMetricsOverride", {"width": 375, "height": 667, "deviceScaleFactor": 2, "mobile": True})
            await goto(BASE + 'workshops/' + q('&t=ta&tal=aus')); check(await bereit(), "mit ?tal=aus: Goch ist da")
            check(await bis("[!!document.querySelector('.tal'), document.documentElement.classList.contains('landscape-on'), getComputedStyle(document.querySelector('main')).backgroundColor]", lambda x: x[1]) == [False, True, 'rgba(0, 0, 0, 0)'], "?tal=aus: Landschaft im Kopf, kein Tal, kein Blatt")
            await goto(BASE + 'workshops/' + q('&t=la&landschaft=aus')); check(await bereit(), "mit ?landschaft=aus: Goch ist da")
            check(await ev("[!!document.querySelector('.tal'), !!document.querySelector('.landscape'), document.documentElement.classList.contains('landscape-on')]") == [False, False, False] and (await bis(vogel, lambda v: v['vogel']))['vogel'], "?landschaft=aus: keine Landschaft, kein Tal; Goch sitzt im Himmelsstreifen")
            await goto(BASE + 'workshops/' + q('&t=na&zeit=2026-11-11T23:00')); check(await bereit(), "nachts: Goch ist da")
            nacht = await bis("""(()=>{const h=c=>{const m=c.match(/[\\d.]+/g).map(Number);return (m[0]*299+m[1]*587+m[2]*114)/1000;};const m=document.querySelector('main'),p=m.querySelector('p');
              return {nacht:+getComputedStyle(document.documentElement).getPropertyValue('--nacht'),text:Math.round(h(getComputedStyle(p).color)),grund:Math.round(h(getComputedStyle(document.body).backgroundColor)),sterne:getComputedStyle(document.querySelector('.landscape-stars')).opacity};})()""", lambda n: n['nacht'] > .9)
            check(nacht['nacht'] > .9 and nacht['text'] - nacht['grund'] > 110 and float(nacht['sterne']) > .5, "nachts: dunkle Seite, heller Text (lesbar), Sterne am Himmel", nacht)
            await shot("unterseite_Nacht")
            print("Goch ausgeschaltet: Die Unterseite bleibt wie zuvor")
            await send("Emulation.setDeviceMetricsOverride", {"width": 375, "height": 667, "deviceScaleFactor": 2, "mobile": True})
            await ev("sessionStorage.clear()")
            await goto(BASE + 'workshops/?gochaus=1&t=aus', wait=3.5)
            check(await ev("!document.getElementById('scene') && !document.getElementById('goch') && !window.Goch && !!document.getElementById('goch-kopf')"), "kein Goch, kein Gespräch, kein Skript des Gesprächs; der Himmelsstreifen bleibt")
            check(await ev("window.__mainOben === Math.round(document.querySelector('main').getBoundingClientRect().top + scrollY)") and zum_worker() == [], "nichts springt, keine Anfrage")
            await shot("unterseite_Goch_aus")
            print(f"     Gewicht workshops/ mit ausgeschaltetem Goch: {gewicht[1]/1000:.0f} KB bis load, {gewicht[0]/1000:.0f} KB gesamt")
            check(console == [], "keine Skriptfehler", console[:3])
    finally:
        proc.terminate()

asyncio.run(main())
print('\n' + ('ALLE PRÜFUNGEN BESTANDEN' if not failures else f'{len(failures)} FEHLER: ' + '; '.join(failures)))
sys.exit(1 if failures else 0)
