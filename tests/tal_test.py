"""Prüft das Tal unterhalb der Bühne („Ein Tal“) auf der Startseite: Gewicht des Erstaufrufs, spätes Laden der Talebenen,
Aufbau, Bewegung beim Scrollen, kein seitliches Scrollen, Schalter ?tal=aus und reduzierte Bewegung. Legt dabei
Bildschirmfotos in 375 px (Tag/Nacht, Herbst/Winter) und am Rechner ab.
Aufruf: python3 tests/tal_test.py http://127.0.0.1:8788 /tmp/tal
Benötigt Chrome und websockets. Keine externen Dienste werden verwendet. Der Prüfserver liefert unverdichtet aus; das
gemessene Gewicht ist deshalb eine Obergrenze gegenüber der Auslieferung (dort sind Text und Skripte verdichtet).
"""
import asyncio
import base64
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

import websockets

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8788').rstrip('/')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix='tal-'))
OUT.mkdir(parents=True, exist_ok=True)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9371
GRENZE = 1_200_000  # Erstaufruf am Handy, Entscheidung der Leitung vom 11.11.2026
TALGRENZE = 300_000  # was das Tal nach dem ersten Bild am Handy nachlädt
TALBILD = ('/mitte-', '/hang-', '/grund-')
ZEITEN = {'herbst-tag': '2026-11-11T13:00', 'herbst-nacht': '2026-11-11T23:00', 'winter-tag': '2027-01-15T13:00', 'winter-nacht': '2027-01-15T23:00'}
LAGE = """(() => { const e=[...document.querySelectorAll('.tal-ebene')]; return JSON.stringify({
  tal: document.querySelectorAll('.tal').length, an: document.documentElement.classList.contains('tal-on'),
  ebenen: e.map(p => ({kind: p.dataset.kind, season: p.dataset.season, y: new DOMMatrix(getComputedStyle(p).transform).m42, geladen: p.querySelector('img').naturalWidth > 0})),
  fern: +getComputedStyle(document.querySelector('.tal-fern') || document.body).opacity, burg: document.querySelectorAll('.tal-burg').length,
  breite: document.documentElement.scrollWidth, fenster: innerWidth, hoehe: document.documentElement.scrollHeight, jahr: document.documentElement.dataset.season,
  buehne: (() => { const s=document.querySelector('.stage .landscape'); return s ? s.children.length : -1; })(),
  blatt: getComputedStyle(document.querySelector('main > section:not(.stage)'), '::before').content !== 'none' }); })()"""

fehler = []
def pruefe(ok, text):
    print(('ok   ' if ok else 'FEHL ') + text)
    if not ok:
        fehler.append(text)


class Seite:
    def __init__(self, ws):
        self.ws, self.nr, self.offen, self.ereignisse, self.ausnahmen = ws, 0, {}, [], []
        self.leser = asyncio.ensure_future(self.lies())

    async def lies(self):
        async for roh in self.ws:
            m = json.loads(roh)
            if 'id' in m and m['id'] in self.offen:
                self.offen.pop(m['id']).set_result(m)
            elif m.get('method') == 'Runtime.exceptionThrown':
                self.ausnahmen.append(m['params']['exceptionDetails'].get('text', '') + ' ' + json.dumps(m['params']['exceptionDetails'].get('exception', {}))[:300])
            elif 'method' in m:
                self.ereignisse.append(m)

    async def send(self, method, params=None):
        self.nr += 1
        f = asyncio.get_event_loop().create_future()
        self.offen[self.nr] = f
        await self.ws.send(json.dumps({'id': self.nr, 'method': method, 'params': params or {}}))
        return (await asyncio.wait_for(f, 30)).get('result', {})

    async def js(self, ausdruck):
        r = await self.send('Runtime.evaluate', {'expression': ausdruck, 'returnByValue': True, 'awaitPromise': True})
        return r.get('result', {}).get('value')

    async def lage(self):
        return json.loads(await self.js(LAGE))

    async def oeffne(self, pfad, warte=3.0):
        """Lädt die Seite und liefert (Bytes bis zum load-Ereignis, Bytes gesamt, Adressen vor load, Adressen danach)."""
        self.ereignisse.clear()
        await self.send('Network.clearBrowserCache')
        await self.send('Page.navigate', {'url': BASE + pfad})
        for _ in range(300):
            if any(e['method'] == 'Page.loadEventFired' for e in self.ereignisse):
                break
            await asyncio.sleep(.1)
        await asyncio.sleep(warte)
        adresse, vor, nach, bytes_vor, bytes_gesamt, geladen = {}, [], [], 0, 0, False
        for e in self.ereignisse:
            p = e.get('params', {})
            if e['method'] == 'Network.requestWillBeSent':
                adresse[p['requestId']] = p['request']['url']
                (nach if geladen else vor).append(p['request']['url'])
            elif e['method'] == 'Page.loadEventFired':
                geladen = True
            elif e['method'] == 'Network.loadingFinished':
                bytes_gesamt += p['encodedDataLength']
                if adresse.get(p['requestId']) in vor:
                    bytes_vor += p['encodedDataLength']
        return bytes_vor, bytes_gesamt, vor, nach

    async def scrolle(self, y):
        await self.js(f"new Promise(r => {{ scrollTo(0, {y}); requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250))); }})")

    async def foto(self, name):
        bild = await self.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 82})
        (OUT / (name + '.jpg')).write_bytes(base64.b64decode(bild['data']))


async def main():
    process = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={PORT}', '--hide-scrollbars',
        '--user-data-dir=' + tempfile.mkdtemp(prefix='tal-chrome-'), '--no-first-run', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                pages = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
                break
            except OSError:
                await asyncio.sleep(.2)
        url = next(p['webSocketDebuggerUrl'] for p in pages if p['type'] == 'page')
        async with websockets.connect(url, max_size=50000000) as ws:
            s = Seite(ws)
            for bereich in ('Page', 'Runtime', 'Network'):
                await s.send(bereich + '.enable')
            handy = {'width': 375, 'height': 812, 'deviceScaleFactor': 3, 'mobile': True}
            await s.send('Emulation.setDeviceMetricsOverride', handy)

            # 1. Gewicht und Reihenfolge am Handy (kalter Cache, dreifache Pixeldichte wie am iPhone)
            ohne_vor, ohne_gesamt, _, _ = await s.oeffne('/?tal=aus&zeit=' + ZEITEN['herbst-tag'])
            vor, gesamt, erst, spaet = await s.oeffne('/?zeit=' + ZEITEN['herbst-tag'])
            print(f'     ohne Tal: {ohne_vor/1000:.0f} KB bis load, {ohne_gesamt/1000:.0f} KB gesamt; mit Tal: {vor/1000:.0f} KB bis load, {gesamt/1000:.0f} KB gesamt')
            pruefe(0 < vor <= GRENZE, f'Erstaufruf bis zum load-Ereignis höchstens {GRENZE/1e6:.1f} MB ({vor/1000:.0f} KB)')
            pruefe(vor - ohne_vor <= 20_000, f'das Tal macht den Erstaufruf nicht schwerer ({(vor-ohne_vor)/1000:+.0f} KB)')
            pruefe(gesamt - ohne_gesamt <= TALGRENZE, f'das Tal lädt am Handy höchstens {TALGRENZE/1000:.0f} KB nach ({(gesamt-ohne_gesamt)/1000:.0f} KB)')
            pruefe(not [u for u in erst if any(t in u for t in TALBILD)], 'vor dem load-Ereignis wird keine Talebene geholt')
            tal = [u for u in spaet if any(t in u for t in TALBILD)]
            pruefe(len(tal) == 3 and all('herbst-900' in u for u in tal), f'danach genau drei Talebenen der laufenden Jahreszeit ({len(tal)})')
            fremd = [u for u in erst + spaet if not u.startswith(BASE) and not u.startswith('data:') and not u.startswith('blob:')]
            pruefe(not fremd, 'keine Abrufe bei fremden Diensten' + (': ' + ', '.join(fremd[:3]) if fremd else ''))

            # 2. Aufbau
            l = await s.lage()
            pruefe(l['tal'] == 1 and l['an'] and [e['kind'] for e in l['ebenen']] == ['mitte', 'hang', 'grund'], 'ein Tal mit Höhenzügen, Hang und Talgrund')
            pruefe(all(e['geladen'] for e in l['ebenen']), 'alle Talebenen sind geladen')
            pruefe(l['buehne'] > 0, 'die Bühne behält ihre eigene Landschaft')
            pruefe(l['blatt'], 'die Bereiche liegen als Blätter über dem Tal')
            pruefe(l['breite'] == l['fenster'], f"kein seitliches Scrollen am Handy ({l['breite']} zu {l['fenster']})")
            pruefe(all(e['y'] >= 812 * .8 for e in l['ebenen']) and l['fern'] == 0, 'oben auf der Seite steht das Tal unter der Bühne, die Ferne ist aus')
            oben = [e['y'] for e in l['ebenen']]

            # 3. Bewegung beim Scrollen
            await s.scrolle(l['hoehe'] * .45)
            m = await s.lage()
            mitte = [e['y'] for e in m['ebenen']]
            pruefe(all(b < a for a, b in zip(oben, mitte)), 'beim Scrollen kommen alle Ebenen herauf')
            pruefe((oben[2] - mitte[2]) > (oben[0] - mitte[0]), 'der Talgrund bewegt sich weiter als die Höhenzüge (Tiefe)')
            pruefe(m['fern'] > 0 and m['burg'] == 1, 'ist die Bühne hinaus, stehen Himmel und Burgberg blass in der Ferne')
            await s.scrolle(999999)
            u = await s.lage()
            pruefe(u['ebenen'][2]['y'] < 812 and u['ebenen'][2]['y'] + 1000 * 620 / 1600 >= 812, 'am Seitenende füllt der Talgrund den unteren Rand')
            pruefe(u['breite'] == u['fenster'], 'auch am Seitenende kein seitliches Scrollen')

            # 4. Bildschirmfotos 375 px: Tag/Nacht, Herbst/Winter, je Mitte und Ende der Seite
            for name, zeit in ZEITEN.items():
                await s.oeffne('/?zeit=' + zeit, 2.5)
                l = await s.lage()
                pruefe(l['jahr'] == name.split('-')[0] and all(e['season'] == ('autumn' if 'herbst' in name else 'winter') and e['geladen'] for e in l['ebenen']), f'{name}: Talebenen passen zur Jahreszeit')
                await s.foto(f'tal-375-{name}-1-oben')
                await s.scrolle(l['hoehe'] * .36)
                await s.foto(f'tal-375-{name}-2-mitte')
                await s.scrolle(999999)
                await s.foto(f'tal-375-{name}-3-ende')

            # 5. Rechner
            await s.send('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 900, 'deviceScaleFactor': 1, 'mobile': False})
            for name in ('herbst-tag', 'winter-nacht'):
                await s.oeffne('/?zeit=' + ZEITEN[name], 2.5)
                l = await s.lage()
                pruefe(l['breite'] == l['fenster'] and len(l['ebenen']) == 3, f'Rechner {name}: Tal steht, kein seitliches Scrollen')
                await s.scrolle(l['hoehe'] * .36)
                await s.foto(f'tal-1440-{name}-2-mitte')
                await s.scrolle(999999)
                await s.foto(f'tal-1440-{name}-3-ende')

            # 6. Schalter und reduzierte Bewegung
            await s.send('Emulation.setDeviceMetricsOverride', handy)
            _, _, erst, spaet = await s.oeffne('/?tal=aus&zeit=' + ZEITEN['herbst-tag'], 2)
            l = await s.lage()
            pruefe(l['tal'] == 0 and not l['an'] and not l['blatt'], '?tal=aus: kein Tal, keine Blätter')
            pruefe(not [u for u in erst + spaet if any(t in u for t in TALBILD)], '?tal=aus: keine Talebene wird geholt')
            await s.send('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
            await s.oeffne('/?zeit=' + ZEITEN['herbst-tag'], 2.5)
            l = await s.lage()
            await s.scrolle(l['hoehe'] * .5)
            a = await s.lage()
            await s.scrolle(l['hoehe'] * .8)
            b = await s.lage()
            pruefe(len(a['ebenen']) == 3 and [e['y'] for e in a['ebenen']] == [e['y'] for e in b['ebenen']], 'reduzierte Bewegung: das Tal steht still')
            await s.foto('tal-375-herbst-tag-reduziert')

            pruefe(not s.ausnahmen, 'keine Skriptfehler' + (': ' + ' | '.join(s.ausnahmen[:3]) if s.ausnahmen else ''))
            s.leser.cancel()
    finally:
        process.terminate()
    print(f'\nBildschirmfotos: {OUT}')
    if fehler:
        print(f'{len(fehler)} Fehler'); sys.exit(1)
    print('Alle Prüfungen des Tals bestanden.')

asyncio.run(main())
