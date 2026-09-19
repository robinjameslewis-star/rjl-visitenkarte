"""Prüft den Blog-Editor der Redaktion in einem frischen Headless-Chrome (CDP) gegen die Attrappe
tests/admin_fake.mjs: Werkzeugleiste, Einfügen von Karte und Video, Live-Vorschau (Rahmen und eigenes
Fenster), lokale Sicherung.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets`, laufende Attrappe:
    node tests/admin_fake.mjs 8789
Aufruf:  python3 tests/admin_test.py [http://localhost:8789/admin]
"""
import asyncio, json, subprocess, sys, tempfile, time, urllib.request
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9224
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8789/admin"
failures = []

def check(cond, label, detail=""):
    print(("  ok   " if cond else "  FEHLT ") + label + (f" ({detail})" if detail else ""))
    if not cond: failures.append(label)

async def main():
    profile = tempfile.mkdtemp(prefix='rjl-admin-')
    proc = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={PORT}', f'--user-data-dir={profile}',
                             '--no-first-run', '--no-default-browser-check', '--window-size=1440,1000', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception: time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=50_000_000) as ws:
            mid = 0; pending = {}; console = []
            def handle(msg):
                if 'id' in msg and msg['id'] in pending: pending[msg['id']].set_result(msg.get('result', msg)); return
                m = msg.get('method')
                if m == 'Runtime.exceptionThrown': console.append(msg['params']['exceptionDetails'].get('text', ''))
                elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] == 'error':
                    console.append(' '.join(str(a.get('value', a.get('description', ''))) for a in msg['params']['args']))
            async def send(method, params=None):
                nonlocal mid; mid += 1
                fut = asyncio.get_event_loop().create_future(); pending[mid] = fut
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while not fut.done(): handle(json.loads(await ws.recv()))
                del pending[mid]; return fut.result()
            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'].get('text') + ' ' + json.dumps(r['exceptionDetails'].get('exception', {}))[:300])
                return r.get("result", {}).get("value")
            async def wait(ms): await asyncio.sleep(ms / 1000)
            async def real_click(selector):  # echter Klick (Nutzergeste) – nötig für window.open
                box = await ev(f"(()=>{{const e=document.querySelector({json.dumps(selector)});e.scrollIntoView({{block:'center'}});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];}})()")
                for t in ("mousePressed", "mouseReleased"):
                    await send("Input.dispatchMouseEvent", {"type": t, "x": box[0], "y": box[1], "button": "left", "clickCount": 1})
            await send("Runtime.enable"); await send("Page.enable")
            await send("Page.navigate", {"url": URL}); await wait(1200)
            await ev("localStorage.clear()")

            print("1. Editor öffnen, Live-Vorschau lädt")
            await ev("document.querySelector('#bposts button[data-slug]').click()"); await wait(1200)
            check(await ev("!document.getElementById('beditor').hidden"), "Editor sichtbar")
            check(await ev("!!document.getElementById('bframe').contentDocument.querySelector('article h1')"), "Vorschau-Rahmen zeigt den Beitrag",
                  await ev("document.getElementById('bframe').contentDocument.querySelector('article h1').textContent"))
            check(await ev("getComputedStyle(document.getElementById('ed')).gridTemplateColumns.split(' ').length===2"), "breiter Bildschirm: Text links, Vorschau rechts")

            print("2. Tippen – Vorschau folgt")
            await ev("(()=>{const T=document.getElementById('pbody');T.focus();T.setSelectionRange(T.value.length,T.value.length);document.execCommand('insertText',false,'\\n\\nNeuer **fetter** Satz.');})()")
            await wait(400)
            last = await ev("[...document.getElementById('bframe').contentDocument.querySelectorAll('article p')].pop().innerHTML")
            check(last == "Neuer <strong>fetter</strong> Satz.", "neuer Absatz erscheint gerendert", last)
            await ev("(()=>{const t=document.getElementById('ptitle');t.value='Anderer Titel';t.dispatchEvent(new Event('input'));const l=document.getElementById('plang');l.value='en';l.dispatchEvent(new Event('change'));})()")
            await wait(400)
            check(await ev("document.getElementById('bframe').contentDocument.querySelector('h1').textContent") == "Anderer Titel", "Titel folgt")
            check(await ev("document.getElementById('bframe').contentDocument.querySelector('.meta time').textContent") == "19 September 2026", "Datum in englischer Form nach Sprachwechsel")

            print("3. Werkzeuge")
            await ev("(()=>{const T=document.getElementById('pbody');const i=T.value.indexOf('Zweiter');T.focus();T.setSelectionRange(i,i+7);document.querySelector('#ptools button[data-t=\"b\"]').click();})()")
            check(await ev("document.getElementById('pbody').value.includes('**Zweiter** Absatz.')"), "Fett über Auswahl")
            await ev("(()=>{const T=document.getElementById('pbody');const i=T.value.indexOf('Dritter');T.setSelectionRange(i,i);document.querySelector('#ptools button[data-t=\"h\"]').click();})()")
            check(await ev("document.getElementById('pbody').value.includes('\\n\\n## Dritter Absatz.')"), "Überschrift aus der Zeile")
            await wait(300)
            check(await ev("[...document.getElementById('bframe').contentDocument.querySelectorAll('article h2')].some(h=>h.textContent==='Dritter Absatz.')"), "Überschrift in der Vorschau")

            print("4. Karte und Video einfügen")
            await ev("(()=>{const T=document.getElementById('pbody');T.setSelectionRange(T.value.length,T.value.length);const $=id=>document.getElementById(id);$('prurl').value='https://www.linkedin.com/posts/x';$('prtitle').value='Karte';$('prtext').value='Satz.';$('prok').click();$('pyurl').value='https://youtu.be/dQw4w9WgXcQ?si=1';$('pyurl').dispatchEvent(new Event('input'));$('pytitle').value='Video';$('pyok').click();})()")
            await wait(400)
            check((await ev("document.getElementById('pytext').textContent")).startswith("Video erkannt"), "YouTube-Adresse erkannt")
            check(await ev("!!document.getElementById('bframe').contentDocument.querySelector('article a.ref[href=\"https://www.linkedin.com/posts/x\"]')"), "Karte in der Vorschau")
            check(await ev("!!document.getElementById('bframe').contentDocument.querySelector('article .yt[data-video=\"dQw4w9WgXcQ\"] .yt-play')"), "Video-Platzhalter in der Vorschau")
            await ev("(()=>{const $=id=>document.getElementById(id);$('pyurl').value='https://vimeo.com/1';$('pyok').click();})()")
            check("keine YouTube-Adresse" in (await ev("document.getElementById('mY').textContent")), "falsche Video-Adresse wird abgelehnt")

            print("5. Eigenes Fenster (zweiter Bildschirm)")
            await real_click("#bpvwin"); await wait(800)
            check(await ev("!!(pvWin&&!pvWin.closed)"), "Fenster geöffnet")
            check(await ev("pvWin&&pvWin.document.querySelector('h1')&&pvWin.document.querySelector('h1').textContent") == "Anderer Titel", "Fenster zeigt den Beitrag")
            check(await ev("getComputedStyle(document.getElementById('pv')).display") == "none", "eingebaute Vorschau macht dem Text Platz")
            await ev("(()=>{const T=document.getElementById('pbody');T.focus();T.setSelectionRange(T.value.length,T.value.length);document.execCommand('insertText',false,'Zeile fürs Fenster.');})()")
            await wait(400)
            check(await ev("pvWin.document.body.innerText.includes('Zeile fürs Fenster.')"), "Fenster folgt beim Tippen")
            await ev("pvWin.close()"); await wait(1200)
            check(await ev("getComputedStyle(document.getElementById('pv')).display") != "none", "nach dem Schließen ist die eingebaute Vorschau zurück")
            check(await ev("document.getElementById('bframe').contentDocument.body.innerText.includes('Zeile fürs Fenster.')"), "und auf dem Stand")

            print("6. Ausblenden / Anzeigen")
            await ev("document.getElementById('bpvhide').click()"); await wait(200)
            check(await ev("getComputedStyle(document.getElementById('pv')).display") == "none" and await ev("!document.getElementById('bpvshow').hidden"), "ausgeblendet, Knopf „Vorschau anzeigen“ da")
            await ev("document.getElementById('bpvshow').click()"); await wait(300)
            check(await ev("getComputedStyle(document.getElementById('pv')).display") != "none", "wieder eingeblendet")

            print("7. Lokale Sicherung")
            await wait(800)
            check(await ev("Object.keys(localStorage).some(k=>k.startsWith('redaktion:entwurf:'))"), "Text ist lokal gesichert")
            await ev("document.getElementById('bcancel').click();document.querySelector('#bposts button[data-slug]').click()"); await wait(800)
            check(await ev("!document.getElementById('pdraft').hidden"), "nicht gespeicherter Text wird angeboten")
            await ev("document.getElementById('pdraftuse').click()"); await wait(400)
            check(await ev("document.getElementById('ptitle').value") == "Anderer Titel", "Wiederherstellen setzt Titel und Text")
            await ev("window.confirm=()=>true;document.getElementById('bpsave').click()"); await wait(800)
            check(await ev("Object.keys(localStorage).filter(k=>k.startsWith('redaktion:entwurf:')).length===0"), "nach dem Speichern ist die Sicherung weg")

            print("8. Konsole")
            check(not console, "keine Fehler", "; ".join(console)[:200])
    finally:
        proc.terminate()
    print("\nAlle Prüfungen bestanden." if not failures else f"\n{len(failures)} Prüfung(en) fehlgeschlagen: " + ", ".join(failures))
    sys.exit(1 if failures else 0)

asyncio.run(main())
