"""Prüft „Goch lebt“ (goch-leben.js, tools/figur-teile.py; Robin, 24.10.2026): Körper, Kopf und Schwanz aus der Sitzpose
ergeben zusammengesetzt genau die Sitzpose, bleiben im Datenbudget und bewegen sich auf der Startseite wie ein echtes
Rotkehlchen – Kopfruck, Knicks mit Schwanzzucken, Blinzeln –, nur im Sitzen und nicht bei reduzierter Bewegung.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets Pillow numpy`, laufende Seite:
    python3 -m http.server 8788            (im Projektordner)
Aufruf:  python3 tests/goch_leben_test.py http://localhost:8788/ [Ordner für Bildschirmfotos]"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.request
import numpy as np
import websockets
from PIL import Image

BASE = sys.argv[1].rstrip('/') + '/'
OUT = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix='rjl-goch-leben-')
os.makedirs(OUT, exist_ok=True)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
PAKET = os.path.join(ROOT, 'figuren', 'goch')
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9347
failures = []

def check(cond, label):
    print(('  ok   ' if cond else '  FAIL ') + label)
    if not cond: failures.append(label)

print("1. Teile im Figurenpaket")
figur = json.load(open(os.path.join(PAKET, 'figur.json')))
a = figur['animation']; t = a['teile']
ordner = os.path.join(PAKET, t['ordner'])
dateien = [t['koerper'], t['schwanz']['datei'], *t['kopf']['posen'].values()]
check(all(os.path.exists(os.path.join(ordner, d)) for d in dateien), "alle Teile vorhanden (" + ", ".join(dateien) + ")")
groesse = sum(os.path.getsize(os.path.join(ordner, d)) for d in dateien)
erst = sum(os.path.getsize(os.path.join(ordner, d)) for d in (t['koerper'], t['schwanz']['datei'], t['kopf']['posen']['sitzend'], t['kopf']['posen']['blinzelnd']))
check(groesse <= 200 * 1024 and erst <= 120 * 1024, f"Datenbudget: alle Teile {groesse / 1024:.0f} KB (≤ 200), beim ersten Laden {erst / 1024:.0f} KB (≤ 120)")
sitz = Image.open(os.path.join(PAKET, a['fassungen']['mit-landschaft'], a['posen']['sitzend']['datei'])).convert('RGBA')
def auf_weiss(*bilder):
    c = Image.new('RGBA', sitz.size, (255, 255, 255, 255))
    for b in bilder: c.alpha_composite(b)
    return np.array(c).astype(int)[:, :, :3]
teil = lambda d: Image.open(os.path.join(ordner, d)).convert('RGBA')
diff = np.abs(auf_weiss(teil(t['koerper']), teil(t['schwanz']['datei']), teil(t['kopf']['posen']['sitzend'])) - auf_weiss(sitz))
check(diff.mean() < 1 and np.percentile(diff, 99.9) < 16, f"zusammengesetzt = Sitzpose (mittlere Abweichung {diff.mean():.2f}, 99,9 % < {np.percentile(diff, 99.9):.0f})")
gedreht = Image.new('RGBA', sitz.size, (0, 0, 0, 0))
for d, cfg, w in ((t['koerper'], None, 0), (t['schwanz']['datei'], t['schwanz'], -t['schwanz']['winkel']), (t['kopf']['posen']['sitzend'], t['kopf'], -t['kopf']['winkel'])):
    b = teil(d)
    gedreht.alpha_composite(b.rotate(-w, center=tuple(cfg['drehpunkt']), resample=Image.BICUBIC) if cfg else b)
alpha = np.array(gedreht)[:, :, 3]
kx, ky = t['kopf']['drehpunkt']
loch = alpha[ky - 30:ky + 30, kx - 60:kx + 60]
check(loch.min() > 200, f"Kopf und Schwanz voll gedreht: keine Lücke am Hals (Deckkraft ≥ {loch.min()})")
Image.fromarray(auf_weiss(gedreht).astype(np.uint8)).save(os.path.join(OUT, '01_voll_gedreht.png'))

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-goch-leben-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}',
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [x for x in targets if x["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=50_000_000) as ws:
            mid = 0; requests = []; console = []; pending = {}
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Network.requestWillBeSent': requests.append(msg['params']['request']['url'])
                elif m == 'Runtime.exceptionThrown': console.append(msg['params']['exceptionDetails'].get('text', ''))
                elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] == 'error':
                    console.append(' '.join(str(x.get('value', x.get('description', ''))) for x in msg['params']['args']))
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
            async def goto(url, wait=6):
                requests.clear()
                await send("Page.navigate", {"url": url}); await pump(wait)
            async def viewport(w, h, dpr=1, mobile=False):
                await send("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": dpr, "mobile": mobile})
            zustand = ("(() => { const s = document.getElementById('scene'), l = s.querySelector('.leben');"
                       " return { state: s.dataset.state, leben: s.dataset.leben || '', da: !!l, sichtbar: !!l && getComputedStyle(l).display !== 'none',"
                       " rest: getComputedStyle(s.querySelector('.bird-rest')).visibility,"
                       " ursprung: l ? getComputedStyle(l.querySelector('.leben-knicks')).transformOrigin : '',"
                       " breite: l ? Math.round(l.getBoundingClientRect().width) : 0, hoehe: l ? l.getBoundingClientRect().height : 0, restBreite: Math.round(s.querySelector('.bird-rest').getBoundingClientRect().width) }; })()")
            protokoll = ("window.__leben = []; (() => { const s = document.getElementById('scene'), k = s.querySelector('.leben-kopf'), sw = s.querySelector('.leben-schwanz'), n = s.querySelector('.leben-knicks');"
                         " setInterval(() => __leben.push([k.style.transform, sw.style.transform, n.dataset.knickst || '', ([...k.querySelectorAll('img')].find(i => i.style.opacity === '1') || {}).dataset?.kopf || '']), 40); })(); true")

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await viewport(1280, 900)

            print("2. Startseite: Teile übernehmen nach der Landung")
            await goto(BASE + '?t=2&goch=off', 7)
            z = await ev(zustand)
            check(z['state'] == 'rest' and z['leben'] == '1' and z['sichtbar'] and z['rest'] == 'hidden', f"Goch sitzt, Teile sichtbar, Sitzpose ausgeblendet ({z})")
            check(abs(z['breite'] - z['restBreite']) <= 1, f"Teile genauso breit wie die Sitzpose ({z['breite']} / {z['restBreite']} px)")
            ox, oy = (float(v[:-2]) for v in z['ursprung'].split()[:2])
            check(abs(ox - .44 * z['breite']) <= 2 and abs(oy - .94 * z['hoehe']) <= 2, f"Knicks und Atmen um die Fußlinie – die Füße bleiben auf dem Ast ({z['ursprung']})")
            geladen = [u.rsplit('/', 1)[-1] for u in requests if '/teile/' in u]
            check(sorted(geladen) == sorted([t['koerper'], t['schwanz']['datei'], t['kopf']['posen']['sitzend'], t['kopf']['posen']['blinzelnd']]),
                  f"geladen: nur Körper, Schwanz, Kopf und Blinzelkopf – Schnabelköpfe erst mit der Stimme ({geladen})")
            check(not any('vogel-schnabel' in u or 'vogel-blinzeln' in u for u in requests), "keine ganzen Schnabel- oder Blinzelposen geladen")
            await shot("02_desktop")

            print("3. Ruheverhalten: Kopfruck, Knicks, Schwanzzucken, Blinzeln")
            await ev(protokoll); await pump(16)
            log = await ev("__leben")
            kopf = {e[0] for e in log} - {'', 'rotate(0deg)', 'rotate(0.00deg)'}
            schwanz = {e[1] for e in log} - {'', 'rotate(0deg)', 'rotate(0.00deg)'}
            check(len(kopf) + len(schwanz) + sum(1 for e in log if e[2]) + sum(1 for e in log if e[3] == 'blinzeln') > 0,
                  f"in 16 s bewegt sich Goch (Kopf {sorted(kopf)[:3]}, Schwanz {sorted(schwanz)[:2]}, Knicks {sum(1 for e in log if e[2])}, Blinzeln {sum(1 for e in log if e[3] == 'blinzeln')})")
            winkel = [abs(float(x[7:-4])) for x in kopf | schwanz if x.startswith('rotate(')]
            check(all(w <= max(t['kopf']['winkel'], t['schwanz']['winkel']) + .01 for w in winkel), f"Winkel in den Grenzen aus figur.json (höchstens {max(winkel) if winkel else 0:.1f}°)")
            ruhig = sum(1 for e in log if not e[2] and e[3] != 'blinzeln') / max(1, len(log))
            check(ruhig > .8, f"meist still – nicht zappelig ({ruhig:.0%} der Zeit ohne Knicks oder Blinzeln)")

            print("4. Fassung ohne Landschaft und Handy")
            await goto(BASE + '?t=4&goch=off&landschaft=aus', 7)
            z = await ev(zustand)
            check(z['leben'] == '1' and z['sichtbar'] and z['rest'] == 'hidden', "ohne Landschaft: Teile übernehmen auch hier")
            await shot("04_ohne_landschaft")
            await viewport(390, 844, 2, True)
            await goto(BASE + '?t=4b&goch=off', 7)
            z = await ev(zustand)
            check(z['leben'] == '1' and z['sichtbar'] and abs(z['breite'] - z['restBreite']) <= 1, f"Handy: Teile sichtbar und deckungsgleich ({z['breite']} px)")
            await shot("04_handy")
            await viewport(1280, 900)

            print("5. Reduzierte Bewegung: Sitzpose wie bisher, keine Teile")
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await goto(BASE + '?t=5&goch=off', 5)
            z = await ev(zustand)
            check(not z['da'] and z['rest'] == 'visible' and not any('/teile/' in u for u in requests), f"keine Teile gebaut oder geladen, Sitzpose sichtbar ({z})")
            await send("Emulation.setEmulatedMedia", {"features": []})

            print("6. Konsole")
            check(console == [], f"keine Konsolenfehler ({console[:3]})")
    finally:
        proc.terminate()

asyncio.run(main())
print()
print(f"Bildschirmfotos: {OUT}")
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:"); [print("  - " + f) for f in failures]; sys.exit(1)
print("Alle Prüfungen bestanden.")
