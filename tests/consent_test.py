"""Prüft die Einwilligung für den Cal.com-Kalender in einem frischen Headless-Chrome (CDP).

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`.
Aufruf:  python3 tests/consent_test.py http://localhost:8788/ [Ordner für Bildschirmfotos]
         python3 tests/consent_test.py https://robinjameslewis-star.github.io/rjl-visitenkarte/

Geprüft wird unter anderem: keine Anfrage an cal.com oder Google vor der Zustimmung, Ablehnen,
Erlauben, Widerruf mit Neuladen, Englisch, abgelaufene und defekte Speicherwerte, Handy-Ansicht,
keine Konsolenfehler. Bildschirmfotos landen im angegebenen Ordner (sonst in einem Temp-Ordner)."""
import asyncio, json, base64, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
OUT = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix='rjl-consent-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9334
failures = []

def check(cond, label):
    print(('  ok   ' if cond else '  FAIL ') + label)
    if not cond: failures.append(label)

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-consent-')
    proc = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}',
                             '--no-first-run', '--no-default-browser-check', '--window-size=1280,1100', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=50_000_000) as ws:
            mid = 0
            requests = []      # (host, url) aller Netzwerkanfragen
            console = []       # Fehler in der Konsole
            pending = {}
            async def pump(timeout):
                """Ereignisse einsammeln, bis timeout abgelaufen ist."""
                end = time.time() + timeout
                while time.time() < end:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=max(0.01, end - time.time()))
                    except asyncio.TimeoutError:
                        break
                    msg = json.loads(raw)
                    handle(msg)
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Network.requestWillBeSent':
                    u = msg['params']['request']['url']
                    requests.append((urllib.parse.urlparse(u).hostname, u))
                elif m == 'Runtime.exceptionThrown':
                    console.append(msg['params']['exceptionDetails'].get('text', ''))
                elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] == 'error':
                    console.append(' '.join(str(a.get('value', a.get('description', ''))) for a in msg['params']['args']))
            async def send(method, params=None):
                nonlocal mid; mid += 1
                fut = asyncio.get_event_loop().create_future(); pending[mid] = fut
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while not fut.done():
                    handle(json.loads(await ws.recv()))
                del pending[mid]
                return fut.result()
            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'].get('text') + ' ' + json.dumps(r['exceptionDetails'].get('exception', {}))[:300])
                return r.get("result", {}).get("value")
            async def click(selector):
                await ev(f"document.querySelector({json.dumps(selector)}).click()")
            async def shot(name, full=False):
                r = await send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": full})
                open(os.path.join(OUT, name + '.png'), "wb").write(base64.b64decode(r["data"]))
            async def goto(url, wait=3):
                requests.clear()
                await send("Page.navigate", {"url": url}); await pump(wait)
            async def viewport(w, h, mobile=False):
                await send("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": mobile})
            foreign = lambda: sorted({h for h, _ in requests if h not in ('localhost', '127.0.0.1', 'robinjameslewis-star.github.io')})
            cal = lambda: [u for h, u in requests if h and 'cal.com' in h]
            state = ("({banner: !document.getElementById('consent-banner').hidden, notice: !document.getElementById('booking-notice').hidden,"
                     " settings: !document.getElementById('consent-settings').hidden, close: !document.getElementById('consent-close').hidden,"
                     " iframe: !!document.querySelector('#cal-embed iframe'), calScript: !!document.querySelector('script[src*=\"cal.com\"]'),"
                     " store: localStorage.getItem('rjl-calendar-consent'), pad: getComputedStyle(document.body).paddingBottom,"
                     " lang: document.documentElement.lang, title: document.getElementById('consent-title').textContent,"
                     " allow: document.getElementById('consent-allow').textContent, fallback: getComputedStyle(document.getElementById('cal-fallback')).display,"
                     " expanded: document.getElementById('consent-settings').getAttribute('aria-expanded')})")

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await viewport(1280, 1100)

            print("1. Erster Besuch (kein Speicher)")
            await goto(BASE + '?t=1', 4)
            s = await ev(state)
            check(s['banner'], "Banner sichtbar")
            check(not s['close'], "kein Schließen-Knopf vor der Entscheidung")
            check(s['notice'], "Hinweis 'Kalender ausgeschaltet' sichtbar")
            check(s['settings'], "Knopf Datenschutzeinstellungen sichtbar")
            check(not s['iframe'] and not s['calScript'], "kein Cal.com-Iframe/-Skript im DOM")
            check(s['store'] is None, "nichts im localStorage")
            check(s['pad'] != '0px', f"Body-Innenabstand für Banner gesetzt ({s['pad']})")
            check(cal() == [], f"keine Anfrage an cal.com vor Zustimmung (fremde Hosts: {foreign()})")
            check(not any(h and 'google' in h for h, _ in requests), "keine Anfrage an Google (Fonts lokal)")
            check(any(u.endswith('eb-garamond-latin.woff2') for _, u in requests), "lokale Schriftdatei geladen")
            await shot("01_erstbesuch_de")
            await ev("document.querySelector('.contact').scrollIntoView()"); await pump(0.5)
            await shot("02_erstbesuch_de_kalenderbereich")

            print("2. Escape ohne Entscheidung schließt nicht")
            await ev("document.getElementById('consent-title').focus()")
            await send("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
            await send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
            await pump(0.3)
            check((await ev(state))['banner'], "Banner bleibt ohne Entscheidung offen")

            print("3. Ablehnen")
            await click('#consent-deny'); await pump(1)
            s = await ev(state)
            check(not s['banner'], "Banner geschlossen")
            check(s['notice'], "Hinweis sichtbar")
            check(s['fallback'] != 'none', "externer Link sichtbar")
            st = json.loads(s['store'] or 'null')
            check(st and st['allowed'] is False and st['expires'] - st['at'] == 180*86400000, f"Ablehnung gespeichert, 180 Tage ({st})")
            check(cal() == [], "weiterhin keine Anfrage an cal.com")
            check(s['pad'] == '0px', "Body-Innenabstand zurückgesetzt")
            await shot("03_abgelehnt")

            print("4. Neu laden nach Ablehnung")
            await goto(BASE + '?t=2', 3)
            s = await ev(state)
            check(not s['banner'] and s['notice'] and not s['iframe'], "Banner bleibt zu, Hinweis da, kein Iframe")
            check(cal() == [], "keine Anfrage an cal.com")

            print("5. Einstellungen öffnen → Erlauben")
            await click('#consent-settings'); await pump(0.5)
            s = await ev(state)
            check(s['banner'] and s['close'], "Banner offen, Schließen-Knopf da")
            check(s['expanded'] == 'true', "aria-expanded=true")
            check(await ev("document.activeElement.id") == 'consent-title', "Fokus auf Banner-Titel")
            await shot("05_einstellungen_offen")
            await click('#consent-allow'); await pump(8)
            s = await ev(state)
            check(not s['banner'], "Banner geschlossen")
            check(not s['notice'], "Hinweis weg")
            check(s['calScript'], "Cal.com-Skript eingefügt")
            check(s['iframe'], "Cal.com-Iframe vorhanden")
            check(len(cal()) > 0, f"Anfragen an cal.com erst jetzt ({len(cal())})")
            check(json.loads(s['store'])['allowed'] is True, "Zustimmung gespeichert")
            src = await ev("(document.querySelector('#cal-embed iframe')||{}).src || ''")
            check('/robin-james-lewis-ebbpnk/robin-james-lewis/embed' in src, f"deutscher Ereignistyp geladen ({src[:90]})")
            await ev("document.querySelector('.contact').scrollIntoView()"); await pump(0.5)
            await shot("06_erlaubt_kalender")

            print("6. Widerruf bei laufendem Kalender → Neuladen")
            await click('#consent-settings'); await pump(0.3)
            requests.clear()
            await click('#consent-deny'); await pump(4)
            s = await ev(state)
            check(not s['iframe'] and not s['calScript'], "nach Widerruf kein Iframe/Skript mehr")
            check(s['notice'] and not s['banner'], "Hinweis da, Banner zu")
            check(cal() == [], f"nach Widerruf keine Anfrage an cal.com (fremde Hosts: {foreign()})")

            print("7. Englisch mit gespeicherter Entscheidung")
            await goto(BASE + '?lang=en&t=3', 3)
            s = await ev(state)
            check(s['lang'] == 'en', "html lang=en")
            check(not s['banner'], "Banner bleibt zu (Entscheidung gilt sprachübergreifend)")
            await click('#consent-settings'); await pump(0.3)
            s = await ev(state)
            check(s['title'] == 'A calendar, a choice' and s['allow'] == 'Allow appointment booking', f"englische Banner-Texte ({s['title']!r})")
            texts = await ev("Array.from(document.querySelectorAll('.privacy-copy [data-i18n], #booking-notice, #consent-banner [data-i18n]')).map(e=>e.textContent)")
            check(all(not any(w in t for w in ['Datenschutz', 'Zustimmung', 'Kalender ']) for t in texts), "keine deutschen Reste in EN-Texten")
            await shot("07_en_einstellungen")
            await click('#consent-allow'); await pump(8)
            src = await ev("(document.querySelector('#cal-embed iframe')||{}).src || ''")
            check('/robin-james-lewis-en/embed' in src, f"englischer Ereignistyp geladen ({src[:90]})")

            print("8. Abgelaufene / fremde Speicherwerte")
            await ev("localStorage.setItem('rjl-calendar-consent', JSON.stringify({allowed:true, at: Date.now()-181*86400000, expires: Date.now()-86400000, version:'2026-09-14.1'}))")
            await goto(BASE + '?t=4', 3)
            s = await ev(state)
            check(s['banner'] and not s['iframe'] and cal() == [], "abgelaufene Zustimmung: Banner wieder da, kein Cal.com")
            await ev("localStorage.setItem('rjl-calendar-consent', JSON.stringify({allowed:true, at: Date.now(), expires: Date.now()+180*86400000, version:'alt'}))")
            await goto(BASE + '?t=5', 3)
            s = await ev(state)
            check(s['banner'] and cal() == [], "alte Textversion: Banner wieder da, kein Cal.com")
            await ev("localStorage.setItem('rjl-calendar-consent', 'kaputt{')")
            await goto(BASE + '?t=6', 3)
            s = await ev(state)
            check(s['banner'] and cal() == [], "defekter Wert: Banner, kein Cal.com")

            print("9. Datenschutz-Link im Banner öffnet die Klappe")
            await click('#consent-privacy'); await pump(0.5)
            check(await ev("document.getElementById('privacy').open"), "Impressum/Datenschutz aufgeklappt")
            check(await ev("location.hash") == '#privacy', "Sprungziel #privacy")
            await shot("09_datenschutz_offen", full=False)

            print("10. Handy-Ansicht (iPhone-Breite), erster Besuch")
            await ev("localStorage.clear()")
            await viewport(390, 844, True)
            await goto(BASE + '?t=7', 4)
            s = await ev(state)
            check(s['banner'], "Banner sichtbar")
            bh = await ev("document.getElementById('consent-banner').getBoundingClientRect().height")
            check(bh <= 844 * 0.65 + 1, f"Banner höchstens 65 % der Höhe ({bh:.0f}px)")
            check(await ev("(()=>{const b=document.getElementById('consent-banner');return b.scrollHeight<=b.clientHeight+1})()"), "Banner-Inhalt passt ohne Innen-Scrollen")
            btn = await ev("Array.from(document.querySelectorAll('.consent-button')).map(b=>b.getBoundingClientRect().height)")
            check(all(h >= 44 for h in btn), f"Knöpfe mind. 44 px hoch ({btn})")
            check(await ev("document.documentElement.scrollWidth <= innerWidth"), "kein horizontales Scrollen")
            await shot("10_handy_de")
            await goto(BASE + '?lang=en&t=8', 4)
            await shot("11_handy_en")
            await click('#consent-deny'); await pump(0.5)
            await ev("window.scrollTo(0, document.body.scrollHeight)"); await pump(0.3)
            await shot("12_handy_abgelehnt_fuss")

            print("11. Konsole")
            check(console == [], f"keine Konsolenfehler ({console[:3]})")
    finally:
        proc.terminate()
    print()
    print("Bildschirmfotos:", OUT)
    print("ERGEBNIS:", "alles bestanden" if not failures else f"{len(failures)} Prüfungen fehlgeschlagen: {failures}")
    return 0 if not failures else 1

sys.exit(asyncio.run(main()))
