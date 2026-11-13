"""Prüft auf den Unterseiten das erste und jedes folgende Bild bei Nacht: kein Aufblitzen der Tagfarben (Robin, 12.11.2026).
Kalter Cache, langsame Verbindung, wie tests/landscape-start_test.py für die Startseite. Je Bild der Seite werden gemessen:
Farbe des Seitengrunds, Farbe der Überschrift und der Himmelsstreifen im Kopf.
Aufruf: python3 tests/nacht_start_unterseiten_test.py http://127.0.0.1:8794
Benötigt Chrome und websockets. Keine externen Dienste. Eigener freier Port; das Profil wird am Ende gelöscht.
"""
import asyncio
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import urllib.request

import websockets

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8788').rstrip('/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SEITEN = ['workshops/', 'workshops/ki-kompetenz/', 'workshops/e-rechnung/', 'werkzeuge/', 'werkzeuge/en/', 'ueber-mich/', 'blog/', 'blog/das-ende-des-erp/']
NACHT, TAG = [27, 34, 48], [243, 239, 229]
TAGGRUEN = [11, 61, 46]
PROBE = """
window.__frames = []; window.__paints = [];
const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
const ctx = canvas.getContext('2d', {willReadFrequently: true});
const rgb = farbe => { ctx.clearRect(0,0,1,1); ctx.fillStyle = '#000'; ctx.fillStyle = farbe; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].slice(0,3); };
function snapshot() {
  const body = document.body;
  if (!body || !body.innerText.trim()) return null;
  const style = getComputedStyle(body), h = document.querySelector('main h1'), kopf = document.getElementById('goch-kopf');
  const himmel = kopf ? getComputedStyle(kopf).backgroundImage : '';
  const m = /rgba\\(176, 204, 218, ([0-9.]+)\\)/.exec(himmel);
  return {t: performance.now(), rgb: rgb(style.backgroundColor), titel: h ? rgb(getComputedStyle(h).color) : null,
    himmel: himmel === 'none' ? 0 : m ? +m[1] : /rgb\\(176, 204, 218\\)/.test(himmel) ? 1 : -1,
    misch: style.backgroundBlendMode.split(',')[0].trim(),
    an: document.documentElement.classList.contains('landscape-on'), tal: document.documentElement.classList.contains('tal-on')};
}
new PerformanceObserver(list => list.getEntries().forEach(e => __paints.push({name:e.name,t:e.startTime,snapshot:snapshot()}))).observe({type:'paint',buffered:true});
function sample() {const s=snapshot();if(s)__frames.push(s);if(__frames.length<400)requestAnimationFrame(sample)}
requestAnimationFrame(sample);
"""

fehler = []
def pruefe(ok, text):
    print(('ok   ' if ok else 'FEHL ') + text, flush=True)
    if not ok:
        fehler.append(text)

def freier_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

async def main():
    port, profil = freier_port(), tempfile.mkdtemp(prefix='rjl-goch-nachtstart-')
    process = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={port}',
        '--user-data-dir=' + profil, '--no-first-run', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                pages = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
                break
            except OSError:
                await asyncio.sleep(.2)
        url = next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page')
        async with websockets.connect(url, max_size=50000000) as ws:
            sequence = 0
            errors = []
            async def send(method, params=None):
                nonlocal sequence
                sequence += 1
                await ws.send(json.dumps({'id': sequence, 'method': method, 'params': params or {}}))
                while True:
                    reply = json.loads(await ws.recv())
                    if reply.get('method') == 'Runtime.exceptionThrown':
                        errors.append(reply['params']['exceptionDetails'].get('exception', {}).get('description', '')[:200])
                    if reply.get('id') == sequence:
                        assert 'error' not in reply, reply
                        return reply.get('result', {})
            async def evaluate(js):
                r = await send('Runtime.evaluate', {'expression': js, 'returnByValue': True})
                assert 'exceptionDetails' not in r, r
                return r.get('result', {}).get('value')
            for domain in ['Page', 'Runtime', 'Network']:
                await send(domain + '.enable')
            await send('Emulation.setTimezoneOverride', {'timezoneId': 'Europe/Berlin'})
            await send('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': False})
            await send('Network.setCacheDisabled', {'cacheDisabled': True})
            await send('Network.emulateNetworkConditions', {'offline': False, 'latency': 200, 'downloadThroughput': 400000, 'uploadThroughput': 128000})
            await send('Page.addScriptToEvaluateOnNewDocument', {'source': PROBE})

            async def lauf(seite, zeit, zusatz=''):
                await send('Page.navigate', {'url': f'{BASE}/{seite}?zeit=2026-11-12T{zeit}&ort=48.27,8.85{zusatz}'})
                await asyncio.sleep(6)
                return await evaluate('({frames:__frames,paints:__paints})')

            for seite in SEITEN:
                d = await lauf(seite, '23:30')
                f = d['frames']
                pruefe(bool(f) and any(p['name'] == 'first-contentful-paint' for p in d['paints']), f'{seite} Nacht: Seite gezeichnet ({len(f)} Bilder gemessen)')
                if not f:
                    continue
                tag = [x for x in f if x['rgb'] != NACHT]
                pruefe(not tag, f'{seite} Nacht: Seitengrund vom ersten Bild an in Nachtfarbe' + (f' – {len(tag)} Bilder in {tag[0]["rgb"]}, bis {round(tag[-1]["t"])} ms' if tag else ''))
                pruefe(all(x['misch'] == 'multiply' for x in f), f'{seite} Nacht: die helle Papierstruktur ist vom ersten Bild an abgedunkelt (multiply)')
                gruen = [x for x in f if x['titel'] == TAGGRUEN]
                pruefe(not gruen, f'{seite} Nacht: Überschrift nie im Grün des Tages' + (f' – {len(gruen)} Bilder' if gruen else ''))
                hell = [x for x in f if x['himmel'] > .08 or x['himmel'] < 0]
                pruefe(not hell, f'{seite} Nacht: kein heller Himmelsstreifen im Kopf' + (f' – {len(hell)} Bilder, Deckkraft {hell[0]["himmel"]}' if hell else ''))
                pruefe(f[-1]['an'] and f[-1]['tal'], f'{seite} Nacht: am Ende stehen Landschaft und Tal')
            for seite in SEITEN[:1] + SEITEN[3:4] + SEITEN[-1:]:
                d = await lauf(seite, '13:00')
                f = d['frames']
                pruefe(bool(f) and all(x['rgb'] == TAG for x in f), f'{seite} Tag: Seitengrund durchgehend in Tagfarbe')
                pruefe(bool(f) and all(x['titel'] == TAGGRUEN for x in f), f'{seite} Tag: Überschrift im Grün des Tages')
                pruefe(bool(f) and f[0]['himmel'] == .5, f'{seite} Tag: Himmelsstreifen im Kopf wie bisher')
            d = await lauf(SEITEN[0], '23:30', '&landschaft=aus')
            pruefe(bool(d['frames']) and all(x['rgb'] == TAG and not x['an'] for x in d['frames']), 'workshops/ mit ?landschaft=aus bei Nacht: durchgehend Tagfarben, keine Landschaft')
            # Skript der Landschaft fällt aus: Seite bleibt lesbar in Tagfarben
            await send('Network.setBlockedURLs', {'urls': ['*landscape.js*']})
            d = await lauf(SEITEN[0], '23:30')
            pruefe(bool(d['frames']) and all(x['rgb'] == TAG for x in d['frames']), 'workshops/ ohne landscape.js bei Nacht: Seite bleibt in Tagfarben lesbar')
            await send('Network.setBlockedURLs', {'urls': []})
            pruefe(not [e for e in errors if 'landscape.js' not in e and 'ERR_BLOCKED' not in e], 'keine Skriptfehler' + (': ' + ' | '.join(errors[:3]) if errors else ''))
    finally:
        process.terminate()
        process.wait()
        shutil.rmtree(profil, ignore_errors=True)
    print('\nALLE PRÜFUNGEN BESTANDEN' if not fehler else f'\n{len(fehler)} PRÜFUNG(EN) FEHLGESCHLAGEN')
    sys.exit(1 if fehler else 0)

asyncio.run(main())
