"""Bildvergleich vorher/nachher für die Figur auf der Startseite: dieselben Ansichten aus zwei lokalen Servern,
Pixel für Pixel verglichen. Belegt, dass ein Umbau (z. B. Figuren-Struktur, 23.10.2026) nichts Sichtbares ändert.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets Pillow`, zwei laufende Server:
    python3 -m http.server 8791 --bind 127.0.0.1    (im Ordner mit dem alten Stand, z. B. einem Worktree auf main)
    python3 -m http.server 8792 --bind 127.0.0.1    (im Ordner mit dem neuen Stand)
Aufruf:  python3 tests/figur_bildvergleich.py http://127.0.0.1:8791 http://127.0.0.1:8792 [Ausgabeordner]

Ansichten: Desktop 1440 × 900 und Handy 390 × 844 (Pixeldichte 2), Tag (12 Uhr) und Nacht (23 Uhr), mit und ohne
Landschaft; dazu jede Pose (Sitzen, vier Flugposen) einzeln in der Sitzlage, damit auch die Ausrichtung der Flugbilder
geprüft ist. Bewegung ist ausgeschaltet (prefers-reduced-motion), damit beide Seiten im selben Zustand stehen.
Ausgabe: je Ansicht vorher.png, nachher.png und bei Abweichung diff.png; Rückgabewert 1, wenn ein Pixel abweicht."""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websockets
from PIL import Image, ImageChops

A = sys.argv[1].rstrip('/')
B = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-figur-vergleich-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9341
ORT = '48.27,8.85'
VIEWS = [  # Name, Breite, Höhe, Pixeldichte, Zeit, Landschaft
    ('desktop-tag', 1440, 900, 1, '2026-10-15T12:00', ''),
    ('desktop-nacht', 1440, 900, 1, '2026-10-15T23:00', ''),
    ('handy-tag', 390, 844, 2, '2026-10-15T12:00', ''),
    ('handy-nacht', 390, 844, 2, '2026-10-15T23:00', ''),
    ('desktop-tag-ohne-landschaft', 1440, 900, 1, '2026-10-15T12:00', 'aus'),
    ('handy-nacht-ohne-landschaft', 390, 844, 2, '2026-10-15T23:00', 'aus'),
]
TOLERANZ = 12
# Gewollte Änderung (Robin, 23.10.2026): In den freigestellten Vogelbildern (Ansicht mit Landschaft) ist eingeschlossenes
# Weiß zwischen Zehen, Beinen und Federspitzen jetzt durchsichtig (tools/landschaft-bilder.py, enclosed_holes). Solange
# der Vergleichsstand die alten Bilder hat, gelten dort bis GEWOLLT Pixel als gewollt; ein verschobenes oder getauschtes
# Bild weicht um Tausende ab. Ohne Landschaft bleibt es bei genauer Gleichheit.
GEWOLLT = 800
POSES = ['rest', 'up', 'glide', 'down', 'landing']
# Zeigt eine Pose in der Sitzlage; die Flugbilder sind bei reduzierter Bewegung sonst ausgeblendet.
SHOW_POSE = """(async name => {
  const frames = [...document.querySelectorAll('.scene [data-pose]')];
  frames.forEach(f => { if (f.dataset.src && !f.getAttribute('src')) f.src = f.dataset.src; });
  await Promise.all(frames.map(f => f.decode().catch(() => null)));
  let s = document.getElementById('vergleich-pose');
  if (!s) { s = document.createElement('style'); s.id = 'vergleich-pose'; document.head.append(s); }
  s.textContent = '.scene .bird-flight{display:block!important}.scene .bird-frame{opacity:0!important}' +
    '.scene .bird-frame[data-pose="' + name + '"]{opacity:1!important}';
  return true;
})(%s)"""
failures = []


def compare(name, a_png, b_png):
    folder = os.path.join(OUT, name)
    os.makedirs(folder, exist_ok=True)
    pa, pb = os.path.join(folder, 'vorher.png'), os.path.join(folder, 'nachher.png')
    open(pa, 'wb').write(a_png); open(pb, 'wb').write(b_png)
    ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
    if ia.size != ib.size:
        failures.append(name); print(f'  FAIL {name}: Größe {ia.size} gegen {ib.size}'); return
    r, g, b = ImageChops.difference(ia, ib).split()
    diff = ImageChops.lighter(ImageChops.lighter(r, g), b)  # größte Abweichung je Pixel über alle Kanäle
    if diff.getbbox() is None:
        print(f'  ok   {name}: identisch ({ia.size[0]} × {ia.size[1]})')
        return
    # Die Papierstruktur (Kachel mit Multiplizieren) rastert Chrome nicht bei jedem Zeichnen bitgleich: Abweichungen
    # bis TOLERANZ Stufen sind Rauschen. Ein verschobenes oder getauschtes Bild erzeugt an Kanten weit größere Werte.
    mask = diff.point(lambda v: 255 if v > TOLERANZ else 0)
    changed, peak = mask.histogram()[255], diff.getextrema()[1]
    if not changed:
        print(f'  ok   {name}: gleich bis auf Rauschen (höchstens {peak} Stufen)')
        return
    mask.save(os.path.join(folder, 'diff.png'))
    if not name.endswith('-ohne-landschaft') and changed <= GEWOLLT:
        print(f'  ok   {name}: {changed} Pixel geändert – gewollt (Füße und Federlücken freigestellt, 23.10.2026)')
        return
    failures.append(name)
    print(f'  FAIL {name}: {changed} Pixel um mehr als {TOLERANZ} Stufen abweichend (höchstens {peak}) in {mask.getbbox()}')


async def main():
    profile = tempfile.mkdtemp(prefix='rjl-figur-chrome-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}',
                             '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0
            errors = []
            async def send(method, params=None):
                nonlocal mid; mid += 1; my = mid
                await ws.send(json.dumps({"id": my, "method": method, "params": params or {}}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get('method') == 'Runtime.exceptionThrown':
                        errors.append(msg['params']['exceptionDetails'].get('text', ''))
                    if msg.get('id') == my:
                        return msg.get('result', msg)
            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                return r.get("result", {}).get("value")
            await send('Page.enable'); await send('Runtime.enable')
            await send('Network.setCacheDisabled', {'cacheDisabled': True})
            await send('Emulation.setTimezoneOverride', {'timezoneId': 'Europe/Berlin'})
            await send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})

            async def load(base, width, height, dpr, zeit, landschaft):
                await send('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': dpr, 'mobile': False})
                await send('Page.navigate', {'url': 'about:blank'}); await asyncio.sleep(0.2)
                query = f'?zeit={zeit}&ort={ORT}' + (f'&landschaft={landschaft}' if landschaft else '') + '&goch=off'
                await send('Page.navigate', {'url': base + '/' + query})
                for _ in range(100):
                    await asyncio.sleep(0.1)
                    if await ev("document.readyState === 'complete'"): break
                # Schriften und alle Bilder fertig, dazu ein Frame Ruhe für Masken und Paletten. Zweimal, weil
                # landscape.js die Bildpfade der Szene je nach Schalter erst beim Aufbau tauscht.
                for _ in range(2):
                  await ev("Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => null))])"
                           ".then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))")
                  await asyncio.sleep(0.5)

            async def shot(clip=None):
                # Chrome zeichnet große, verkleinerte Bilder zuerst mit schneller Filterung und kurz danach fein:
                # erst ein Bild nehmen, das zweimal hintereinander gleich herauskommt.
                params = {"format": "png"}
                if clip: params["clip"] = {**clip, "scale": 1}
                last = None
                for _ in range(8):
                    data = base64.b64decode((await send("Page.captureScreenshot", params))["data"])
                    if data == last: return data
                    last = data
                    await asyncio.sleep(0.3)
                return last

            async def scene_clip():
                box = await ev("(() => { const r = document.getElementById('scene').getBoundingClientRect();"
                               " return {x: Math.max(0, Math.floor(r.left - 40)), y: Math.max(0, Math.floor(r.top - 120)),"
                               " width: Math.ceil(r.width + 80), height: Math.ceil(r.height + 160)}; })()")
                return box

            for name, width, height, dpr, zeit, landschaft in VIEWS:
                shots = []
                for base in (A, B):
                    await load(base, width, height, dpr, zeit, landschaft)
                    shots.append(await shot())
                compare(name, *shots)

            for landschaft in ('', 'aus'):
                for pose in POSES:
                    shots = []
                    for base in (A, B):
                        await load(base, 1440, 900, 1, '2026-10-15T12:00', landschaft)
                        await ev(SHOW_POSE % json.dumps(pose))
                        await asyncio.sleep(0.15)
                        shots.append(await shot(await scene_clip()))
                    compare(f'pose-{pose}' + ('-ohne-landschaft' if landschaft else ''), *shots)
            if errors:
                failures.append('Konsolenfehler'); print('  FAIL Konsolenfehler:', errors[:3])
    finally:
        proc.terminate()
    print(f"\nAusgabe: {OUT}")
    print('Alles identisch.' if not failures else f'{len(failures)} Abweichung(en): ' + ', '.join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
