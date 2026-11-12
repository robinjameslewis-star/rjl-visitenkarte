"""Prüft den sprechenden Goch auf der Startseite (23.10.2026) in einem frischen Headless-Chrome gegen die Worker-Attrappe:
Schalter „Goch hört“ und „Goch spricht“, eigene Einwilligung nur für den Besuch, Gespräch ohne Knopf (Goch
erkennt selbst, wann jemand fertig ist; WAV 16 kHz an /listen; während er antwortet, hört er nicht zu; „Fertig“, „Pause“,
Mikrofon aus nach Stille), Stimme zur Antwort mit Schnabel und Bewegung, KI-Hinweis, Grenzen (Text statt Stimme, ohne
Fehlermeldung), sichtbares und hörbares Zwitschern, auch in Gesprächspausen, reduzierte Bewegung, Englisch, Handy.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`, laufende Seite und Attrappe:
    python3 -m http.server 8788            (im Projektordner)
    python3 tests/goch_fake_worker.py 8787
Aufruf:  python3 tests/goch_stimme_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]

Abnahme: Ohne Aktivierung keine Mikrofonanfrage (getUserMedia), kein Ton, keine Anfrage an /listen oder die Stimme;
kein hörbares Zwitschern vor einer Handlung; sichtbares Zwitschern höchstens dreimal; Grenze erreicht → Text statt Stimme.
Mikrofon: eine künstliche Stimme im Browser, die der Test mit window.__sprich ein- und ausschaltet (getUserMedia liefert
ihren Stream); Gochs Stimme ist ein kurzer Sinuston der Attrappe."""
import asyncio, base64, io, json, math, os, re, struct, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request, wave
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
// Schritt 6: Verlauf und Sprachschalter bleiben für den Besuch im Tab. Jeder Seitenaufruf der Tests beginnt frisch, außer mit &merken=1.
if (!/[?&]merken=1/.test(location.search)) { try { sessionStorage.removeItem('rjl-goch-stimme'); sessionStorage.removeItem('rjl-goch-verlauf'); sessionStorage.removeItem('rjl-goch-platz'); } catch (_) {} }
window.__z = { gum: 0, play: 0, start: 0, speak: 0, ctx: 0, streams: [], folge: [] };
window.__mund = []; window.__bewegt = [];
(() => {
  // Mikrofon: Sägezahn mit 160 Hz, hörbar nur, solange __sprich wahr ist – wie jemand, der spricht und wieder still ist
  window.__sprich = false;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) md.getUserMedia = async c => {
    __z.gum++;
    const ac = new AudioContext(), osc = ac.createOscillator(), tor = ac.createGain(), ziel = ac.createMediaStreamDestination();
    osc.type = 'sawtooth'; osc.frequency.value = 160; tor.gain.value = 0;
    osc.connect(tor); tor.connect(ziel); osc.start();
    const takt = setInterval(() => { tor.gain.value = __sprich ? .25 : 0; }, 10);
    ziel.stream.getTracks()[0].addEventListener('ended', () => clearInterval(takt));
    __z.streams.push(ziel.stream);
    return ziel.stream;
  };
  const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { __z.play++; return P.call(this); };
  const S = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { __z.start++; __z.folge.push([a[0] || 0, this.buffer ? this.buffer.duration : 0]); return S.apply(this, a); };
  if (window.speechSynthesis) { const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { if (u.text) __z.speak++; return sp(u); }; }
  const AC = window.AudioContext; window.AudioContext = class extends AC { constructor(...a) { super(...a); __z.ctx++; } };
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('scene');
    if (!s) return; // Kamerarahmen goch-kamera.html: dort gibt es keine Szene
    new MutationObserver(() => __mund.push((s.dataset.mund || 'zu') + (s.dataset.lauscht ? '+lauscht' : ''))).observe(s, { attributes: true, attributeFilter: ['data-mund', 'data-lauscht'] });
    new MutationObserver(() => { if (s.dataset.bewegt) __bewegt.push(getComputedStyle(s).getPropertyValue('--goch-neigung') || s.style.getPropertyValue('--goch-neigung')); }).observe(s, { attributes: true, attributeFilter: ['data-bewegt', 'style'] });
    // Schnabelposen als Bilder: sichtbar geschaltete Pose mitschreiben
    s.querySelectorAll('.bird-frame[data-mundpose]').forEach(f => new MutationObserver(() => { if (f.style.opacity === '1') __mund.push(f.dataset.mundpose); }).observe(f, { attributes: true, attributeFilter: ['style'] }));
    // Goch lebt (goch-leben.js): dann wechselt nur der Kopf
    new MutationObserver(rs => rs.forEach(r => { const f = r.target; if (f.dataset && f.dataset.kopf && f.dataset.kopf !== 'rest' && f.style.opacity === '1') __mund.push(f.dataset.kopf); })).observe(s, { attributes: true, attributeFilter: ['style'], subtree: true });
  });
})();
"""

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-goch-stimme-')
    proc = subprocess.Popen([CHROME, '--headless=new', '--mute-audio', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}', '--no-first-run',
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
                await send("Page.navigate", {"url": url})
                for _ in range(40):  # erst weiter, wenn die Seite wirklich geladen ist (frisch gestartetes Chrome braucht manchmal länger)
                    if await ev("location.href.startsWith(" + json.dumps(BASE) + ") && document.readyState === 'complete'"): break
                    await pump(0.25)
                await pump(wait)
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
            q = lambda extra='': f"?goch={urllib.parse.quote(ENDPOINT, safe='')}&stimme=an&blick=an&zwitschertakt=2500&wiederda=1500&nachfragezeit=6000&signalton={urllib.parse.quote(ton, safe='')}" + extra

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT})
            await send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 1100, "deviceScaleFactor": 1, "mobile": False})
            fake('/_modus?stimme=ok&hoeren=ok')
            listen0, chats0 = len(fake('/_listen')), len(fake('/_chats'))  # andere Tests können die Attrappe schon benutzt haben
            neu_listen = lambda: fake('/_listen')[listen0:]

            print("1. Vor jeder Handlung: kein Ton, kein Mikrofon, keine Anfrage; Zwitschern nur sichtbar, höchstens dreimal")
            await goto(BASE + q('&t=1'), wait=2)
            noten = []
            for _ in range(72):  # 18 s: Anflug und Landung (gut 5 s, beim Kaltstart länger), erstes Zwitschern 1,5 s danach, dann alle 2,5 s
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

            print("3. „Goch spricht“: eigene Einwilligung, ablehnen, erlauben")
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
            check(await ev("document.getElementById('scene').dataset.leben ? [...document.querySelectorAll('.leben-kopf img')].every(f => f.complete && f.naturalWidth === 1153) : [...document.querySelectorAll('.bird-mund')].every(f => f.complete && f.naturalWidth === 1153)"), "Schnabelposen nach dem Einschalten geladen (mit Teilen: nur die Köpfe)")
            check(await ev("Object.keys(localStorage).every(k => !/einwill|consent-stimme|stimme/i.test(k)) && Object.keys(sessionStorage).filter(k => /stimme|einwill/i.test(k)).every(k => k === 'rjl-goch-stimme' || k.startsWith('rjl-goch-test-'))"), "Einwilligung nur für den Besuch gemerkt (sessionStorage, endet mit dem Tab), nicht dauerhaft (seit 11.11.2026, vorher gar nicht)")

            print("4. Frage mit Stimme: KI-Hinweis, Ton, Schnabel; Text bleibt")
            await ev("document.querySelector('.goch-starter').click()"); await pump(0.4)
            await ev("document.getElementById('goch-allow').click()"); await pump(2.5)
            last = fake('/_chats')[-1]
            check(last.get('stimme') == {'erste': True, 'teile': True} and last.get('figur') == 'goch', "Anfrage mit stimme.erste, teile und figur", {k: last.get(k) for k in ('stimme', 'figur', 'gesprochen')})
            b = await ev(bubbles)
            check(b[-1].startswith('goch: Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt.'), "KI-Hinweis bei der ersten gesprochenen Antwort, als Text sichtbar", b[-1][:80])
            zz = await z(); mund = await ev("__mund")
            check(zz['start'] >= 2, "Stimme abgespielt, Satz für Satz", zz['start'])
            folge = zz['folge']
            check(all(folge[i + 1][0] >= folge[i][0] + folge[i][1] - .01 for i in range(len(folge) - 1)), "Abschnitte spielen nacheinander, ohne sich zu überlagern", folge)
            check('offen' in mund and 'halb' in mund, "Schnabel folgt der Lautstärke: Posen halb und offen im Wechsel", mund[:8])
            check(await ev("!document.getElementById('scene').dataset.mund && [...document.querySelectorAll('.bird-mund')].every(f => f.style.opacity !== '1') && document.querySelector('.bird-rest').style.opacity === '1' && [...document.querySelectorAll('.leben-kopf img')].every(f => (f.style.opacity === '1') === (f.dataset.kopf === 'rest'))"), "nach dem Ende wieder geschlossen (Sitzpose bzw. Kopf in Ruhe)")
            bewegt = await ev("__bewegt")
            check(any(b.strip() not in ('', '0.00deg', '0deg') for b in bewegt), "Goch bewegt sich mit der Stimme (Neigung)", bewegt[:4])
            check(await ev("!document.getElementById('scene').dataset.spricht && (document.getElementById('scene').style.getPropertyValue('--goch-neigung') || '0.00deg') === '0.00deg'"), "danach wieder aufrecht")
            await shot("03_antwort_stimme")
            await ev("document.getElementById('goch-input').value='Wer ist Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            check(fake('/_chats')[-1].get('stimme') == {'erste': False, 'teile': True} and not (await ev(bubbles))[-1].startswith('goch: Kurz vorab'), "zweite Antwort ohne Hinweis")
            starts4 = (await z())['start']
            check(starts4 > zz['start'], "zweite Antwort gesprochen", starts4)

            print("5. Grenze erreicht oder Stimme gestört: Text und allgemeiner Hinweis „nur im Chat“, nie ein Grund")
            NUR_CHAT = 'goch: Sprechen geht gerade nicht – ein Gespräch ist im Moment nur hier im Chat möglich. Schreiben Sie mir gern.'
            laut = lambda: ev("document.getElementById('goch-laut').getAttribute('aria-pressed')")
            fake('/_modus?stimme=grenze')
            await ev("document.getElementById('goch-input').value='Woran arbeitet Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            zz = await z(); b = await ev(bubbles)
            check(zz['start'] == starts4 and zz['speak'] == 0, "keine Stimme, auch keine Browserstimme", zz)
            check(b[-2].startswith('goch: Robin lernt') and b[-1] == NUR_CHAT, "Antwort als Text, danach der Hinweis „nur hier im Chat“", b[-1][:70])
            check(await laut() == 'false' and await ev("document.activeElement.id") == 'goch-input', "Stimme schaltet sich ab, Eingabefeld bereit")
            await real_click('#goch-laut'); await pump(0.3)
            fake('/_modus?stimme=fehler')
            await ev("document.getElementById('goch-input').value='Woran arbeitet Robin?'; document.getElementById('goch-send').click()"); await pump(2)
            zz = await z(); b = await ev(bubbles)
            check(zz['start'] == starts4 and zz['speak'] == 0 and b[-1] == NUR_CHAT and await laut() == 'false', "Stimme gestört: nur Text und derselbe Hinweis, keine Gerätestimme – jeder hört dieselbe Stimme", f"speak={zz['speak']}")
            check(not any(w in ' '.join(b) for w in ('ElevenLabs', '402', 'Payment', 'fehler', 'grenze', 'Grenze')), "kein Anbieter, kein Fehlergrund im Chat")
            fake('/_modus?stimme=ok')
            await real_click('#goch-laut'); await pump(0.3)
            check(await laut() == 'true', "Stimme lässt sich wieder einschalten")

            print("6. „Goch hört“: Gespräch ohne Knopf – Goch merkt selbst, wann jemand fertig ist")
            zustand = lambda: ev("document.getElementById('goch-mikro').dataset.zustand")
            knopftext = lambda: ev("document.getElementById('goch-mikro-knopf').textContent")
            statustext = lambda: ev("document.getElementById('goch-mikro-status').textContent")
            await real_click('#goch-mikro-an'); await pump(0.8)
            zz = await z()
            check(await sichtbar('#goch-mikro') and zz['gum'] == 1 and zz['offen'] == 1, "Einschalten öffnet das Mikrofon einmal", zz)
            check(await zustand() == 'hoert' and (await statustext()).startswith('Sprechen Sie einfach') and await knopftext() == 'Pause', "Goch hört zu: Hinweis „Sprechen Sie einfach …“, Knopf „Pause“")
            check(neu_listen() == [], "ohne Sprache nichts gesendet")
            await shot("04_zuhoeren")
            await ev("__sprich = true"); await pump(1.3)
            check(await zustand() == 'spricht' and await knopftext() == 'Fertig' and (await ev("document.getElementById('scene').dataset.lauscht") == '1'), "Goch merkt, dass jemand spricht: Lauschpose, Knopf „Fertig“")
            check(neu_listen() == [], "während gesprochen wird, noch nichts gesendet")
            await ev("__sprich = false"); await pump(2.8)
            li = neu_listen()
            check(len(li) == 1 and li[0]['kopf'] == 'RIFF' and li[0]['wave'] == 'WAVE' and li[0]['rate'] == 16000 and li[0]['typ'] == 'audio/wav' and li[0]['lang'] == 'de', "nach einer kurzen Pause von selbst gesendet: WAV 16 kHz an /listen", li[-1:])
            check(li and 1.2 * 32000 <= li[0]['bytes'] - 44 <= 2.1 * 32000, "Abschnitt: Rede mit kurzem Vor- und Nachlauf, ohne die Stille danach", li and li[0]['bytes'])
            check('you: Woran arbeitet Robin gerade?' in await ev(bubbles) and fake('/_chats')[-1].get('gesprochen') is True, "erkannter Text erscheint als Besuchertext und läuft über /chat mit gesprochen")
            await pump(1.8)  # die Antwort spielt Satz für Satz
            zz = await z()
            check(await zustand() == 'hoert' and zz['offen'] == 1 and zz['gum'] == 1, "nach der Antwort hört Goch wieder zu – Mikrofon blieb offen, kein neues getUserMedia", zz)
            print("6b. Während Goch antwortet, hört er nicht zu")
            await ev("__sprich = true"); await pump(1.0); await ev("__sprich = false"); await pump(1.0)  # Frage, dann Pause
            await ev("__sprich = true"); await pump(0.5); await ev("__sprich = false")                  # spricht in Gochs Antwort hinein
            await pump(4.0)
            check(len(neu_listen()) == 2 and await zustand() == 'hoert', "nur die Frage gesendet, nicht was während der Antwort gesprochen wurde", len(neu_listen()))
            print("6c. „Fertig“ und „Pause“")
            await ev("__sprich = true"); await pump(1.0)
            await real_click('#goch-mikro-knopf'); await ev("__sprich = false"); await pump(0.3)
            check(len(neu_listen()) == 3, "„Fertig“: sofort gesendet, ohne die Pause abzuwarten")
            await pump(2.0)
            check(await zustand() == 'hoert', "danach wieder zuhören")
            await real_click('#goch-mikro-knopf'); await pump(0.3)
            zz = await z()
            check(await zustand() == 'pause' and zz['offen'] == 0 and await knopftext() == 'Weiter zuhören' and 'pausiert' in await statustext(), "„Pause“: Mikrofon zu, Knopf „Weiter zuhören“", zz)
            await ev("__sprich = true"); await pump(1.2); await ev("__sprich = false"); await pump(1.5)
            check(len(neu_listen()) == 3, "pausiert: nichts gesendet")
            await real_click('#goch-mikro-knopf'); await pump(0.6)
            zz = await z()
            check(await zustand() == 'hoert' and zz['offen'] == 1 and zz['gum'] == 2, "„Weiter zuhören“: Mikrofon wieder offen", zz)

            print("6d. Blickkontakt: eigene Einwilligung, Kamera nur im Rahmen, nichts nach außen, zuhören nur mit Blick")
            await real_click('#goch-blick-an')
            check(await sichtbar('#goch-kamera-consent') and not await sichtbar('#goch-sprache') and await ev("!document.querySelector('#goch-kamera-platz iframe')"), "eigene Einwilligung für die Kamera, noch kein Rahmen")
            await real_click('#goch-kamera-allow')
            for _ in range(60):
                if await ev("document.getElementById('scene').dataset.kamera") == 'bereit': break
                await pump(0.25)
            rahmen = await ev("(()=>{const f=document.querySelector('#goch-kamera-platz iframe');return f?{allow:f.getAttribute('allow'),src:f.getAttribute('src'),sichtbar:!document.getElementById('goch-kamera-platz').hidden}:null})()")
            check(rahmen and rahmen['allow'] == 'camera' and rahmen['src'].startswith('goch-kamera.html') and rahmen['sichtbar'], "Rahmen goch-kamera.html mit Kamera", rahmen)
            check(await ev("(()=>{const p=document.getElementById('goch-kamera-platz'),r=p.getBoundingClientRect(),s=getComputedStyle(p);return s.opacity==='0'&&r.width<=2&&r.height<=2;})()"), "kein sichtbares Vorschaubild (kein leuchtender Rahmen)")
            check(await ev("document.getElementById('scene').dataset.kamera") == 'bereit', "MediaPipe geladen (vom eigenen Server)")
            csp = await ev("fetch('goch-kamera.html').then(r=>r.text()).then(t=>(t.match(/Content-Security-Policy\" content=\"([^\"]+)/)||[])[1]||'')")
            check("connect-src 'self'" in csp and "default-src 'none'" in csp, "Rahmen sperrt fremde Verbindungen (CSP)", csp[:60])
            check(not any('googleapis' in u or 'odml' in u for _, u in requests) and extern() == [], "keine Anfrage an Google oder andere fremde Hosts", extern()[:3])
            gesicht = lambda wert: ev("clearInterval(window.__gesicht); window.__gesicht = setInterval(() => { const f = document.querySelector('#goch-kamera-platz iframe'); if (f) f.contentWindow.postMessage({typ:'test-gesicht', wert:" + json.dumps(wert) + "}, location.origin); }, 100)")
            n0 = len(neu_listen())
            await gesicht({"da": True, "x": .5, "y": .4, "groesse": .3, "schautHer": False}); await pump(0.6)
            check(await ev("document.getElementById('scene').dataset.gegenueber") == '1' and not await ev("document.getElementById('scene').dataset.blickkontakt"), "Goch bemerkt sein Gegenüber – ohne Blickkontakt")
            await ev("__sprich = true"); await pump(1.0); await ev("__sprich = false"); await pump(1.6)
            check(len(neu_listen()) == n0 and any('Schauen Sie Goch an' in b for b in await ev(bubbles)), "spricht, ohne ihn anzusehen: Goch hört nicht zu, ein Hinweis", len(neu_listen()) - n0)
            await ev("__bewegt.length = 0")
            await gesicht({"da": True, "x": .85, "y": .4, "groesse": .3, "schautHer": True}); await pump(0.8)
            check(await ev("document.getElementById('scene').dataset.blickkontakt") == '1', "Blickkontakt erkannt")
            check(any(b.strip() not in ('', '0.00deg', '0deg') for b in await ev("__bewegt")), "Goch wendet sich dem Gegenüber zu", (await ev("__bewegt"))[:3])
            await ev("__sprich = true"); await pump(1.0); await ev("__sprich = false"); await pump(2.5)
            check(len(neu_listen()) == n0 + 1, "mit Blickkontakt: Goch hört zu und antwortet", len(neu_listen()) - n0)
            print("6e. Jemand kommt wieder an den Bildschirm: Goch zwitschert und spricht an")
            await pump(1.0)
            gruss0 = await ev("+(document.getElementById('scene').dataset.gruss || 0)"); play0 = (await z())['play']
            await gesicht({"da": False}); await pump(2.2)
            check(not await ev("document.getElementById('scene').dataset.gegenueber"), "Gegenüber weg")
            await gesicht({"da": True, "x": .5, "y": .4, "groesse": .3, "schautHer": True}); await pump(2.8)
            last = fake('/_chats')[-1]
            check(last.get('anlass') == 'zurueck' and any('Da sind Sie wieder!' in b for b in await ev(bubbles)), "zurück am Bildschirm: Goch spricht an („Da sind Sie wieder!“)", last.get('anlass'))
            check(await ev("+(document.getElementById('scene').dataset.gruss || 0)") == gruss0 + 1 and (await z())['play'] > play0, "und zwitschert dabei (hörbar, weil die Stimme an ist)")
            n1 = len(fake('/_chats'))
            await gesicht({"da": False}); await pump(0.8); await gesicht({"da": True, "x": .5, "y": .4, "groesse": .3, "schautHer": True}); await pump(1.5)
            check(len(fake('/_chats')) == n1, "nur kurz weggeschaut: kein neuer Gruß")
            print("6f. Schaut her und schweigt: Goch fragt nach; weiter weg: Goch lockt, spricht beim Näherkommen an")
            n2 = len(fake('/_chats'))
            await pump(6.5)
            last = fake('/_chats')[-1]
            check(len(fake('/_chats')) == n2 + 1 and last.get('anlass') == 'nachfrage' and any('Möchten Sie wissen' in b for b in await ev(bubbles)), "schaut her, sagt nichts: Goch fragt von sich aus nach", last.get('anlass'))
            await gesicht({"da": False}); await pump(2.2)
            lock0 = await ev("+(document.getElementById('scene').dataset.lockt || 0)"); gruss1 = await ev("+(document.getElementById('scene').dataset.gruss || 0)"); n3 = len(fake('/_chats'))
            await gesicht({"da": True, "x": .5, "y": .4, "groesse": .08, "schautHer": False}); await pump(1.2)
            check(await ev("+(document.getElementById('scene').dataset.lockt || 0)") == lock0 + 1 and await ev("+(document.getElementById('scene').dataset.gruss || 0)") == gruss1 + 1 and len(fake('/_chats')) == n3, "weiter weg: Goch lockt mit Zwitschern, spricht noch nicht")
            await gesicht({"da": True, "x": .5, "y": .4, "groesse": .3, "schautHer": True}); await pump(2.8)
            check(len(fake('/_chats')) == n3 + 1 and fake('/_chats')[-1].get('anlass') == 'zurueck', "kommt näher und schaut her: Goch spricht an", fake('/_chats')[-1].get('anlass'))
            await ev("clearInterval(window.__gesicht)")
            await real_click('#goch-blick-an'); await pump(0.5)
            check(await ev("!document.querySelector('#goch-kamera-platz iframe') && document.getElementById('goch-kamera-platz').hidden && !document.getElementById('scene').dataset.kamera"), "Blickkontakt aus: Rahmen und Vorschaubild weg")
            await pump(1.0)
            print("6g. Stimme gestört mitten im Gespräch: Mikrofon und Kamera aus, weiter nur im Chat")
            await real_click('#goch-blick-an')
            for _ in range(60):
                if await ev("document.getElementById('scene').dataset.kamera") == 'bereit': break
                await pump(0.25)
            fake('/_modus?stimme=fehler')
            await ev("document.getElementById('goch-input').value='Was ist SmartFormular?'; document.getElementById('goch-send').click()"); await pump(2)
            check((await ev(bubbles))[-1] == NUR_CHAT and await ev("document.getElementById('goch-mikro-an').getAttribute('aria-pressed')") == 'false' and await laut() == 'false' and (await z())['offen'] == 0, "Hinweis „nur hier im Chat“, Mikrofon zu, Stimme aus")
            check(await ev("!document.querySelector('#goch-kamera-platz iframe') && !document.getElementById('scene').dataset.kamera && document.getElementById('goch-blick-an').getAttribute('aria-pressed') === 'false'"), "Kamera aus")
            fake('/_modus?stimme=ok')
            await real_click('#goch-laut'); await real_click('#goch-mikro-an'); await pump(0.8)
            check(await zustand() == 'hoert' and await laut() == 'true', "Stimme und Mikrofon wieder an")

            print("7. Spracheingabe: Grenze und ausgeschaltet")
            fake('/_modus?hoeren=grenze'); vorher = len(fake('/_chats'))
            await ev("__sprich = true"); await pump(1.0); await ev("__sprich = false"); await pump(2.0)
            check(await statustext() == 'Bitte tippen Sie Ihre Frage.' and len(fake('/_chats')) == vorher, "Grenze: Bitte zum Tippen, keine Anfrage an /chat, keine Fehlermeldung")
            check(await ev("document.getElementById('goch-mikro-an').getAttribute('aria-pressed')") == 'false' and (await z())['offen'] == 0 and await ev("document.activeElement.id") == 'goch-input', "Mikrofon aus, Fokus im Textfeld")
            fake('/_modus?hoeren=aus')
            await real_click('#goch-mikro-an'); await pump(0.6)
            await ev("__sprich = true"); await pump(1.0); await ev("__sprich = false"); await pump(2.0)
            check(await ev("document.getElementById('goch-mikro-an').getAttribute('aria-pressed')") == 'false' and 'ausgeschaltet' in await statustext() and (await z())['offen'] == 0, "ausgeschaltet: Mikrofon aus, Hinweis")
            fake('/_modus?hoeren=ok')

            print("8. Eine Minute Stille (im Test 2,5 s): Mikrofon aus")
            await goto(BASE + q('&t=8&stille=2500'), wait=2.5)
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await real_click('#goch-mikro-an'); await real_click('#goch-stimme-allow'); await pump(0.6)
            gum0 = (await z())['gum']
            check(await zustand() == 'hoert' and (await z())['offen'] == 1, "Goch hört zu")
            await pump(3.2)
            zz = await z()
            check(await zustand() == 'pause' and zz['offen'] == 0 and 'Stille' in await statustext() and await knopftext() == 'Weiter zuhören', "nach der Stille: Mikrofon zu, Hinweis, Knopf „Weiter zuhören“", zz)
            await real_click('#goch-mikro-knopf'); await pump(0.6)
            check(await zustand() == 'hoert' and (await z())['gum'] == gum0 + 1, "„Weiter zuhören“ öffnet es wieder")
            await escape(); await pump(0.3)
            check((await z())['offen'] == 0, "Gespräch geschlossen: Mikrofon zu")
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(0.5)
            check(await zustand() == 'pause' and (await z())['offen'] == 0, "wieder geöffnet: Mikrofon bleibt zu, bis „Weiter zuhören“")

            print("9. Sprechen beenden")
            await real_click('#goch-mikro-knopf'); await pump(0.5)
            await real_click('#goch-stimme-ende')
            check(await ev("document.getElementById('goch-laut').getAttribute('aria-pressed')") == 'false' and await ev("document.getElementById('goch-stimme-ende').hidden") and (await z())['offen'] == 0, "Mikrofon zu, Stimme aus, „Sprechen beenden“ verschwindet")
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
            check(labels[:2] == ['Goch listens', 'Goch speaks'], "Schalter auf Englisch", labels)
            await real_click('#goch-laut')
            check((await ev("document.querySelector('#goch-stimme-consent p').textContent")).startswith('Talking to Goch:'), "Einwilligung auf Englisch")
            await real_click('#goch-stimme-allow'); await ev("document.querySelector('.goch-starter').click()"); await pump(2.5)
            check((await ev(bubbles))[-1].startswith("goch: Just so you know: I'm an AI") and await ev("document.getElementById('goch-ki').textContent") == 'AI · synthetic voice', "KI-Hinweis auf Englisch")

            print("11b. Zwitschern in Gesprächspausen: unregelmäßig, höchstens viermal, hörbar nur mit Stimme, nie beim Tippen")
            await goto(BASE + q('&t=11b&lang=de&pausentakt=700'), wait=1)
            for _ in range(40):  # Zwitschern erst, wenn Goch gelandet ist
                if await ev("document.getElementById('scene').dataset.state") == 'rest': break
                await pump(0.25)
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(0.3)
            play0 = (await z())['play']
            await pump(2.6)
            p1 = await ev("+(document.getElementById('scene').dataset.pausenZwitschern || 0)")
            check(p1 >= 1 and (await z())['play'] == play0, "in der Pause zwitschert Goch sichtbar – ohne Stimme nicht hörbar", p1)
            await real_click('#goch-close'); await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(0.2)  # neues Gespräch: Zähler von vorn
            await real_click('#goch-laut'); await real_click('#goch-stimme-allow'); play1 = (await z())['play']
            await pump(3.5)
            p2 = await ev("+(document.getElementById('scene').dataset.pausenZwitschern || 0)")
            check(p2 >= 1 and (await z())['play'] > play1, "mit Stimme auch hörbar", f"{p2} Mal, {(await z())['play'] - play1} hörbar")
            await pump(4)
            check(await ev("+(document.getElementById('scene').dataset.pausenZwitschern || 0)") <= 4, "höchstens viermal je Gespräch")
            await real_click('#goch-close')
            check(await ev("document.getElementById('goch').hidden"), "Gespräch geschlossen")
            await ev("document.getElementById('goch-input').value = 'Ich tippe gerade'; document.getElementById('goch-input').dispatchEvent(new Event('input'))")
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await pump(3.5)
            check(await ev("+(document.getElementById('scene').dataset.pausenZwitschern || 0)") == 0, "während getippt wird: kein Zwitschern")
            await ev("document.getElementById('goch-input').value = ''")

            print("12. Ohne Schalter (?stimme=aus): alles wie vorher")
            await goto(BASE + f"?goch={urllib.parse.quote(ENDPOINT, safe='')}&stimme=aus&t=12", wait=4.5)
            check(not await ev("document.getElementById('scene').dataset.zwitschern") and await ev("document.getElementById('privacy-goch-stimme').hidden"), "kein Zwitschern, kein Datenschutzabsatz zur Stimme")
            await ev("window.scrollTo(0,0)"); await real_click('#scene')
            check(await ev("document.getElementById('goch-sprache').hidden") and (await z())['play'] == 0, "keine Schalter, kein Ton beim Öffnen")
            print("12b. Stimme an, Blickkontakt ohne eigenen Schalter (data-goch-blick): bleibt aus")
            await goto(BASE + f"?goch={urllib.parse.quote(ENDPOINT, safe='')}&stimme=an&t=12b", wait=4.5)
            check(await ev("document.getElementById('goch-blick-an').hidden && document.getElementById('privacy-goch-blick').hidden && !document.getElementById('privacy-goch-stimme').hidden"), "kein Knopf „Blickkontakt“, kein Datenschutzabsatz zur Kamera – der zur Stimme schon")

            print("13. Handy")
            await send("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
            await goto(BASE + q('&t=13'), wait=2.5)
            await ev("window.scrollTo(0,0)"); await real_click('#scene'); await real_click('#goch-mikro-an'); await real_click('#goch-stimme-allow')
            fits = await ev("(()=>{const p=document.getElementById('goch').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.bottom<=innerHeight&&getComputedStyle(document.getElementById('goch')).position==='fixed';})()")
            check(fits and await sichtbar('#goch-mikro'), "Blatt am unteren Rand mit Mikrofonknopf, passt auf den Bildschirm")
            await shot("05_handy")
            print("13b. Gesprächsmodus auf dem Handy: Goch im Fokus, zeigt eine Stelle, kommt zurück")
            check(await ev("document.documentElement.classList.contains('goch-fokus')"), "Sprechmodus an: Goch rückt in den Fokus")
            gross = await ev("""(()=>{const s=document.getElementById('scene'),r=s.getBoundingClientRect(),p=document.getElementById('goch').getBoundingClientRect();return {fest:getComputedStyle(s).position==='fixed',imFenster:r.top>=0,ueberBlatt:Math.round(p.top-r.bottom),frei:s.contains(document.elementFromPoint(r.left+r.width*.35,r.top+r.height*.4))};})()""")
            check(gross['fest'] and gross['imFenster'] and gross['frei'] and -26 <= gross['ueberBlatt'] <= 40, "Goch sitzt groß direkt über dem Blatt (seit 11.11.2026, vorher fest oben), nicht vom Gespräch verdeckt", gross)
            check(await ev("getComputedStyle(document.documentElement).overflow") == 'hidden' and await sichtbar('#goch-zur-seite'), "Seite steht still, „Seite ansehen“ da")
            await ev("document.getElementById('goch-input').value='Zeig mir die Werkzeuge'; document.getElementById('goch-send').click()"); await pump(2.5)
            check(fake('/_chats')[-1].get('kannZeigen') is True, "Anfrage meldet: die Seite kann zeigen")
            check(await ev("document.documentElement.classList.contains('goch-unterwegs')") and await ev("!document.getElementById('goch-mini').hidden") and await ev("scrollY") > 300, "Goch zeigt die Werkzeuge: Seite scrollt hin, kleiner Goch in der Ecke", await ev("scrollY"))
            check(await ev("document.querySelector('.goch-bubble.goch-goch:last-of-type .goch-zeigen, .goch-zeigen') && document.querySelector('.goch-zeigen').getAttribute('href')") == '#werkzeuge', "Verweis „Werkzeuge ansehen“ in der Antwort")
            await shot("06_handy_zeigt")
            await real_click('#goch-mini'); await pump(0.6)
            check(await ev("document.documentElement.classList.contains('goch-fokus')") and await ev("scrollY") == 0 and await ev("document.getElementById('goch-mini').hidden"), "Tipp auf den kleinen Goch: zurück im Fokus")
            await real_click('#goch-close'); await pump(0.4)
            check(not await ev("document.documentElement.classList.contains('goch-fokus') || document.documentElement.classList.contains('goch-unterwegs')"), "Gespräch zu: Seite wieder normal")
            await send("Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 1100, "deviceScaleFactor": 1, "mobile": False})

            print("14. Konsole und fremde Hosts")
            # MediaPipe schreibt Infozeilen über console.error (INFO:, W…/I… mit Datum) – keine Fehler der Seite
            fehler = [c for c in console if not re.match(r'^\s*(INFO:|[IW]\d{4} )', c)]
            check(not fehler, "keine Fehler", "; ".join(fehler)[:300])
            check(extern() == [], "keine fremden Hosts im letzten Lauf", extern()[:3])
    finally:
        proc.terminate()
        # Das Temp-Profil dieses Laufs wieder löschen (12.11.2026: Über viele Läufe lief sonst die Platte voll)
        try: proc.wait(timeout=5)
        except Exception: proc.kill()
        shutil.rmtree(profile, ignore_errors=True)
    print(f"\nBildschirmfotos: {OUT}")
    print("Alle Prüfungen bestanden." if not failures else f"{len(failures)} Prüfung(en) fehlgeschlagen: " + ", ".join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
