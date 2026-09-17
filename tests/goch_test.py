"""Prüft Goch, das Rotkehlchen von Robin, in einem frischen Headless-Chrome (CDP) gegen die
Worker-Attrappe (tests/goch_fake_worker.py).

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`, laufende Seite und Attrappe:
    python3 -m http.server 8788            (im Projektordner)
    python3 tests/goch_fake_worker.py 8787
Aufruf:  python3 tests/goch_test.py http://localhost:8788/ http://localhost:8787 [Ordner für Bildschirmfotos]

Geprüft wird: ohne Endpunkt bleibt die Seite wie vor Goch (Klick = Anflug); mit Endpunkt öffnet der
Klick die Sprechblase; keine Anfrage an den Endpunkt vor der Einwilligung; Ablehnen, Erlauben,
Widerruf; Einstiegsfragen; Antwort mit Kalender- und Kontaktverweis; Nachricht an Robin (Zusammen-
fassung, Bestätigung, Versand an die Attrappe); Serverfehler; Escape; Englisch; Handy-Ansicht;
Kalender-Einwilligung unberührt; keine Konsolenfehler."""
import asyncio, json, base64, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request
import websockets

BASE = sys.argv[1].rstrip('/') + '/'
FAKE = sys.argv[2].rstrip('/')
OUT = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix='rjl-goch-fotos-')
os.makedirs(OUT, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9335
ENDPOINT = FAKE + '/chat'
failures = []

def check(cond, label):
    print(('  ok   ' if cond else '  FAIL ') + label)
    if not cond: failures.append(label)

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-goch-')
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
            requests = []
            console = []
            pending = {}
            async def pump(timeout):
                end = time.time() + timeout
                while time.time() < end:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=max(0.01, end - time.time()))
                    except asyncio.TimeoutError:
                        break
                    handle(json.loads(raw))
            def handle(msg):
                if 'id' in msg and msg['id'] in pending:
                    pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Network.requestWillBeSent':
                    u = msg['params']['request']['url']
                    requests.append((msg['params']['request']['method'], u))
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
            async def shot(name):
                r = await send("Page.captureScreenshot", {"format": "png"})
                open(os.path.join(OUT, name + '.png'), "wb").write(base64.b64decode(r["data"]))
            async def goto(url, wait=5):
                requests.clear()
                await send("Page.navigate", {"url": url}); await pump(wait)
            async def viewport(w, h, mobile=False):
                await send("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": mobile})
            async def say(text, wait=1.5):
                await ev(f"document.getElementById('goch-input').value = {json.dumps(text)}; document.getElementById('goch-send').click()")
                await pump(wait)
            async def key(k, code):
                await send("Input.dispatchKeyEvent", {"type": "keyDown", "key": k, "code": k, "windowsVirtualKeyCode": code})
                await send("Input.dispatchKeyEvent", {"type": "keyUp", "key": k, "code": k, "windowsVirtualKeyCode": code})
                await pump(0.3)
            posts = lambda: [u for m, u in requests if m == 'POST' and u.startswith(ENDPOINT)]
            bubbles = "Array.from(document.querySelectorAll('.goch-bubble')).map(b => b.textContent)"
            state = ("({open: !document.getElementById('goch').hidden, chat: document.getElementById('scene').dataset.chat || '',"
                     " label: document.getElementById('scene').getAttribute('aria-label'), expanded: document.getElementById('scene').getAttribute('aria-expanded'),"
                     " consent: !document.getElementById('goch-consent').hidden, form: !document.getElementById('goch-form').hidden,"
                     " starters: !document.getElementById('goch-starters').hidden, withdraw: !document.getElementById('goch-withdraw').hidden,"
                     " withdrawText: document.getElementById('goch-withdraw').textContent, store: localStorage.getItem('rjl-goch-consent'),"
                     " calStore: localStorage.getItem('rjl-calendar-consent'), lang: document.documentElement.lang,"
                     " active: document.activeElement && document.activeElement.id, fixed: getComputedStyle(document.getElementById('goch')).position,"
                     " privacy: !!document.querySelector('[data-i18n=\"privacyGoch\"]')})")

            await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
            await viewport(1280, 1100)

            print("1. Ohne Endpunkt (?goch=off): Seite wie vor Goch")
            await goto(BASE + '?t=1&goch=off')
            await click('#consent-deny'); await pump(0.5)
            s = await ev(state)
            check(s['chat'] == '', "kein Gesprächsmodus am Vogel")
            check('anfliegen' in s['label'], f"Vogel-Beschriftung ist der Anflug ({s['label']})")
            check(s['privacy'], "Datenschutzabsatz zu Goch im Impressum")
            await ev("window.scrollTo(0, 0)"); await click('#scene'); await pump(0.3)
            s = await ev(state)
            check(not s['open'], "Klick öffnet keine Sprechblase")
            check(await ev("document.getElementById('scene').classList.contains('is-flying')"), "Klick wiederholt den Anflug")
            await pump(5)

            print("2. Mit Endpunkt: Klick öffnet Goch, keine Anfrage vor Einwilligung")
            await goto(BASE + f'?t=2&goch={urllib.parse.quote(ENDPOINT, safe="")}')
            s = await ev(state)
            check(s['chat'] == 'on' and 'Goch' in s['label'], f"Gesprächsmodus, Beschriftung ({s['label']})")
            check(not s['open'], "Sprechblase zunächst geschlossen")
            await ev("window.scrollTo(0, 0)"); await click('#scene'); await pump(0.5)
            s = await ev(state)
            check(s['open'] and s['expanded'] == 'true', "Sprechblase offen, aria-expanded")
            check(s['fixed'] == 'absolute', "am Ast (absolut), nicht als Blatt")
            b = await ev(bubbles)
            check(len(b) == 1 and b[0].startswith('Ich bin Goch, das Rotkehlchen von Robin.'), f"Gruß ({b})")
            check(s['starters'] and s['form'] and not s['consent'], "Einstiegsfragen und Eingabe sichtbar")
            check(s['active'] == 'goch-input', "Fokus im Eingabefeld")
            check(not await ev("document.getElementById('scene').classList.contains('is-flying')"), "kein Anflug beim Klick")
            await shot("01_offen")
            await click('.goch-starter'); await pump(0.5)
            s = await ev(state)
            check(s['consent'] and not s['form'] and not s['starters'], "Einwilligung erscheint vor dem ersten Wort")
            check(posts() == [], "keine Anfrage an den Endpunkt vor Zustimmung")
            check(s['active'] == 'goch-allow', "Fokus auf Erlauben")
            await shot("02_einwilligung")

            print("3. Ablehnen, dann Entscheidung ändern")
            await click('#goch-deny'); await pump(0.5)
            s = await ev(state)
            st = json.loads(s['store'] or 'null')
            check(st and st['allowed'] is False and st['expires'] - st['at'] == 180*86400000, f"Ablehnung gespeichert, 180 Tage ({st})")
            check(not s['form'] and not s['starters'] and s['withdraw'] and s['withdrawText'] == 'Entscheidung ändern', "Eingabe aus, Entscheidung ändern")
            b = await ev(bubbles)
            check(b[-1].startswith('Verstanden'), f"Hinweis nach Ablehnung ({b[-1][:40]})")
            check(posts() == [], "keine Anfrage")
            check(json.loads(s['calStore'])['allowed'] is False, "Kalender-Einwilligung unberührt (Ablehnung von vorhin)")
            await click('#goch-withdraw'); await pump(0.5)
            s = await ev(state)
            check(s['store'] is None and s['form'], "Entscheidung gelöscht, Eingabe wieder da")

            print("4. Erlauben: die wartende Frage geht raus, Antwort erscheint")
            await click('#goch-starters button:nth-child(2)'); await pump(0.5)
            await click('#goch-allow'); await pump(2)
            s = await ev(state); b = await ev(bubbles)
            st = json.loads(s['store'] or 'null')
            check(st and st['allowed'] is True, "Zustimmung gespeichert")
            check(len(posts()) == 1, f"genau eine Anfrage ({len(posts())})")
            check(b[-2] == 'Wer ist Robin?' and 'Balingen' in b[-1], f"Frage und Antwort im Verlauf ({b[-1][:50]})")
            check(not s['starters'] and s['form'] and s['withdraw'] and s['withdrawText'] == 'Einwilligung widerrufen', "Einstiegsfragen weg, Widerruf sichtbar")
            check(await ev("document.getElementById('goch-log').scrollTop > 0 || document.getElementById('goch-log').scrollHeight <= document.getElementById('goch-log').clientHeight + 1"), "Verlauf am Ende")
            await shot("03_antwort")

            print("5. Verweise: Kalender und Kontakt")
            await say("Kann ich einen Termin machen?")
            check(await ev("document.querySelector('.goch-log').lastChild.querySelector('a.goch-action[href=\"#kontakt\"]') !== null"), "Kalenderverweis als Link")
            await say("Wie ist die E-Mail?")
            check(await ev("(document.querySelector('.goch-log').lastChild.querySelector('a.goch-action') || {}).href || ''") == 'mailto:robinjameslewis@googlemail.com', "Kontaktverweis als mailto")

            print("6. Der Draht: Nachricht an Robin")
            before = json.load(urllib.request.urlopen(FAKE + '/_sent'))
            await say("Ich möchte Robin etwas ausrichten")
            await say("name: Anna Test, email: anna@example.org, text: Hallo Robin")
            b = await ev(bubbles)
            check('Soll ich das so senden' in b[-1], "Zusammenfassung mit Rückfrage")
            await say("Ja")
            b = await ev(bubbles)
            check(b[-1].startswith('Ausgerichtet'), f"Bestätigung ({b[-1]})")
            after = json.load(urllib.request.urlopen(FAKE + '/_sent'))
            check(len(after) == len(before) + 1 and after[-1]['email'] == 'anna@example.org', "Attrappe hat genau eine Nachricht erhalten")
            await shot("04_ausgerichtet")

            print("7. Serverfehler")
            await say("Fehler bitte")
            b = await ev(bubbles)
            check(b[-1].startswith('Gerade antworte ich nicht') and 'robinjameslewis@googlemail.com' in b[-1], f"Fehlertext mit E-Mail ({b[-1][:60]})")
            check(await ev("!document.getElementById('goch-input').disabled"), "Eingabe wieder frei")
            hist = await ev("document.querySelectorAll('.goch-you').length")
            check(hist == 7, f"gescheiterte Frage bleibt im Verlauf sichtbar ({hist})")

            print("8. Escape schließt, Fokus zurück zum Vogel")
            await ev("document.getElementById('goch-input').focus()")
            await key("Escape", 27)
            s = await ev(state)
            check(not s['open'] and s['expanded'] == 'false', "geschlossen")
            check(s['active'] == 'scene', f"Fokus auf dem Vogel ({s['active']})")
            await click('#scene'); await pump(0.3)
            b = await ev(bubbles)
            check((await ev(state))['open'] and len(b) >= 10, "wieder offen, Verlauf erhalten")

            print("9. Widerruf")
            await click('#goch-withdraw'); await pump(0.5)
            s = await ev(state); b = await ev(bubbles)
            check(s['store'] is None and b[-1].startswith('Einwilligung zurückgenommen'), "Widerruf gespeichert und angesagt")
            n = len(posts())
            await say("Wer ist Robin?", 0.5)
            s = await ev(state)
            check(s['consent'] and len(posts()) == n, "nächstes Wort fragt neu, ohne Anfrage")

            print("10. Englisch")
            await goto(BASE + f'?lang=en&t=3&goch={urllib.parse.quote(ENDPOINT, safe="")}')
            await click('#consent-deny'); await ev("window.scrollTo(0, 0)"); await click('#scene'); await pump(0.5)
            s = await ev(state); b = await ev(bubbles)
            check(s['lang'] == 'en' and b[0].startswith("I'm Goch, Robin's robin"), f"englischer Gruß ({b[0][:40]})")
            check("Goch" in s['label'], "englische Beschriftung am Vogel")
            check(await ev("document.querySelector('.goch-starter').textContent") == 'What is Robin working on?', "englische Einstiegsfrage")
            await click('.goch-starter'); await pump(0.3); await click('#goch-allow'); await pump(2)
            b = await ev(bubbles)
            check('final exam' in b[-1], f"englische Antwort ({b[-1][:40]})")
            check(await ev("document.querySelector('[data-i18n=\"privacyGoch\"]').textContent.startsWith('Conversation with Goch')"), "englischer Datenschutzabsatz")
            await shot("05_englisch")

            print("11. Handy-Ansicht")
            await viewport(390, 844, True)
            await goto(BASE + f'?t=4&goch={urllib.parse.quote(ENDPOINT, safe="")}')
            await click('#consent-deny'); await ev("window.scrollTo(0, 0)"); await click('#scene'); await pump(0.5)
            s = await ev(state)
            check(s['open'] and s['fixed'] == 'fixed', "als Blatt am unteren Rand")
            box = await ev("(r => ({w: r.width, right: r.right, bottom: r.bottom}))(document.getElementById('goch').getBoundingClientRect())")
            check(box['w'] <= 390 and box['right'] <= 390 and box['bottom'] <= 844, f"passt in den Bildschirm ({box})")
            check(await ev("document.documentElement.scrollWidth <= 390"), "kein waagerechtes Scrollen")
            await shot("06_handy")
            await viewport(1280, 1100)

            print("12. Reduzierte Bewegung: Klick öffnet trotzdem")
            await send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await goto(BASE + f'?t=5&goch={urllib.parse.quote(ENDPOINT, safe="")}', 3)
            await click('#consent-deny'); await click('#scene'); await pump(0.3)
            check((await ev(state))['open'], "Sprechblase offen")
            await send("Emulation.setEmulatedMedia", {"features": []})

            print("13. Konsole")
            check(console == [], f"keine Konsolenfehler ({console[:3]})")
    finally:
        proc.terminate()

asyncio.run(main())
print()
print(f"Bildschirmfotos: {OUT}")
if failures:
    print(f"{len(failures)} Prüfung(en) fehlgeschlagen:"); [print("  - " + f) for f in failures]; sys.exit(1)
print("Alle Prüfungen bestanden.")
