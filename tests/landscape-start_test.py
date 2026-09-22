"""Prüft die erste sichtbare Palette bei kaltem Cache und langsamer Verbindung.
Aufruf: python3 tests/landscape-start_test.py http://127.0.0.1:8788 /tmp/nachtstart
Benötigt Chrome und websockets. Keine externen Dienste werden verwendet.
"""
import asyncio
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import websockets

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8788').rstrip('/')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix='nachtstart-'))
OUT.mkdir(parents=True, exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PROBE = """
window.__frames = []; window.__paints = [];
const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
const ctx = canvas.getContext('2d');
function snapshot() {
  const body = document.body;
  if (!body || !body.innerText.trim()) return null;
  const style = getComputedStyle(body);
  ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, 1, 1);
  return {t: performance.now(), rgb: [...ctx.getImageData(0,0,1,1).data].slice(0,3),
    night: document.documentElement.style.getPropertyValue('--nacht'),
    visible: style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0,
    transition: style.transitionDuration, ready: document.documentElement.classList.contains('landscape-ready')};
}
new PerformanceObserver(list => list.getEntries().forEach(e => __paints.push({name:e.name,t:e.startTime,snapshot:snapshot()}))).observe({type:'paint',buffered:true});
function sample() {const s=snapshot();if(s)__frames.push(s);if(__frames.length<300)requestAnimationFrame(sample)}
requestAnimationFrame(sample);
"""

async def main():
    process = subprocess.Popen([CHROME, '--headless=new', '--remote-debugging-port=9368',
        '--user-data-dir=' + tempfile.mkdtemp(prefix='nachtstart-chrome-'), '--no-first-run',
        'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                pages = json.load(urllib.request.urlopen('http://127.0.0.1:9368/json'))
                break
            except OSError:
                await asyncio.sleep(.2)
        url = next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page')
        async with websockets.connect(url, max_size=50000000) as ws:
            sequence = 0
            errors, requests, reports = [], [], []
            async def send(method, params=None):
                nonlocal sequence
                sequence += 1
                await ws.send(json.dumps({'id': sequence, 'method': method, 'params': params or {}}))
                while True:
                    reply = json.loads(await ws.recv())
                    if reply.get('method') == 'Runtime.exceptionThrown':
                        errors.append(reply['params'])
                    if reply.get('method') == 'Network.requestWillBeSent':
                        requests.append(reply['params']['request']['url'])
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
            await send('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})
            await send('Network.setCacheDisabled', {'cacheDisabled': True})
            await send('Network.emulateNetworkConditions', {'offline': False, 'latency': 250,
                'downloadThroughput': 256000, 'uploadThroughput': 128000})
            await send('Page.addScriptToEvaluateOnNewDocument', {'source': PROBE})
            cases = [('nacht', 'an', '00:00', False, [27,34,48]),
                ('tag', 'an', '13:00', False, [243,239,229]),
                ('query-aus', 'aus', '00:00', False, [243,239,229]),
                ('body-aus', '', '00:00', False, [243,239,229]),
                ('skriptfehler', 'an', '00:00', True, [243,239,229])]
            for name, mode, time, blocked, expected in cases:
                await send('Network.setBlockedURLs', {'urls': ['*landscape.js*'] if blocked else []})
                await send('Page.navigate', {'url': BASE + '/?zeit=2026-10-15T' + time + '&ort=48.27,8.85' + ('&landschaft=' + mode if mode else '')})
                await asyncio.sleep(4)
                data = await evaluate('({frames:__frames,paints:__paints,scene:!!document.getElementById("scene"),route:document.getElementById("scene")?.dataset.flightRoute})')
                assert data['frames'] and data['scene'], (name, data)
                assert all(f['rgb'] == expected and f['visible'] for f in data['frames']), (name, data)
                assert any(p['name'] == 'first-contentful-paint' for p in data['paints']), (name, data)
                if mode == 'an' and not blocked:
                    assert data['frames'][0]['transition'] == '0s', (name, data['frames'][0])
                    assert data['frames'][-1]['ready'], name
                    assert data['route'] == 'under-branch', name
                reports.append({'case': name, 'first': data['frames'][0], 'last': data['frames'][-1], 'paints': data['paints'], 'frameCount': len(data['frames'])})
                print('OK:', name, '– erste und alle folgenden Paletten:', expected, flush=True)
            assert not errors, errors
            assert not [url for url in requests if url.startswith('http') and not url.startswith(BASE)], requests
            (OUT / 'report.json').write_text(json.dumps(reports, indent=2))
            print('OK: Start ohne Farbblitz, Aus-Schalter und sichtbarer Rückfall bei Skriptfehler.')
    finally:
        process.terminate()
        process.wait()

asyncio.run(main())
