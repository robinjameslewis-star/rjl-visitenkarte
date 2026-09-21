#!/usr/bin/env python3
"""Schablone der Bühne für Bildagenten (ChatGPT, Nano Banana …): Bildschirmfoto der echten Startseite
(Schreibtisch 1536 px, Landschaft an, Bilder der Ebenen ausgeblendet) plus eingezeichnete Zonen – Himmel,
Krone, Ferne, Horizont, Tabu (Goch, Ast, Name, Links) – und eine Legende. Dazu die leere Bühne ohne Zonen.

Voraussetzungen: Google Chrome, Python 3 mit `pip install websockets Pillow`, ein statischer Server auf dem
Repository (z. B. `python3 -m http.server 8788`). Neu erzeugen, wenn sich die Bühne ändert (Layout, Ast, Name).
    python3 tools/landschaft-schablone.py [Zielordner] [http://localhost:8788/]
Schreibt 20_Landschaft_Schablone_Buehne.png und 20_Landschaft_Buehne_leer.png (Vault: 90_Meta/Design/Entwuerfe/).
"""
import asyncio, base64, json, subprocess, sys, tempfile, textwrap, time, urllib.request
from pathlib import Path

import websockets
from PIL import Image, ImageDraw, ImageFont

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9226
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
SITE = (sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8788/").rstrip("/") + "/"
URL = SITE + "index.html?landschaft=burgberg-herbst&zeit=2026-10-15T13:00"
W, SHOT_H, TOP, LEG = 1536, 1024, 560, 275
ORANGE, BLUE, RED, GREEN, INK, PAPER = (196, 120, 52), (70, 95, 120), (166, 61, 47), (46, 90, 70), (43, 42, 40), (246, 241, 232)


async def capture():
    """Startseite laden, Rechtecke der Bühnenelemente messen, dann Ebenenbilder ausblenden und fotografieren."""
    profile = tempfile.mkdtemp(prefix="rjl-schablone-")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={profile}",
                             "--no-first-run", "--hide-scrollbars", f"--window-size={W},{SHOT_H}", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception:
                time.sleep(0.2)
        page = [t for t in targets if t["type"] == "page"][0]
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=80_000_000) as ws:
            mid = 0

            async def send(method, params=None):
                nonlocal mid
                mid += 1
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while True:
                    msg = json.loads(await ws.recv())
                    if msg.get("id") == mid:
                        return msg.get("result", msg)

            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
                return r.get("result", {}).get("value")

            await send("Emulation.setDeviceMetricsOverride", {"width": W, "height": SHOT_H, "deviceScaleFactor": 1, "mobile": False})
            await send("Page.navigate", {"url": URL})
            await asyncio.sleep(9)  # Anflug des Vogels abwarten
            rects = await ev("""(()=>{const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom];};
              const horizon=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--horizon'));const stage=document.querySelector('.stage').getBoundingClientRect();
              return {crown:r('.landscape-crown'),far:r('.landscape-far'),scene:r('.scene'),branch:r('.branch'),name:r('.name'),lang:r('.language-nav'),nav:r('.site-nav'),horizon:stage.top+horizon};})()""")
            await ev("""(()=>{const s=document.createElement('style');s.textContent='.landscape-picture,.landscape-particles,.landscape-sky,.landscape-stars,.landscape-orb,.consent-banner,.bird-flight{display:none!important}.bird-rest{opacity:1!important}';document.head.append(s);})()""")
            await asyncio.sleep(1)
            shot = await send("Page.captureScreenshot", {"format": "png", "clip": {"x": 0, "y": 0, "width": W, "height": SHOT_H, "scale": 1}})
            return Image.open(__import__("io").BytesIO(base64.b64decode(shot["data"]))).convert("RGBA"), rects
    finally:
        proc.terminate()


def draw(raw, R):
    font = lambda size, bold=False: ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size, index=1 if bold else 0)
    F, FB, FS, FL, FT = font(19), font(22, True), font(17), font(18), font(23, True)
    stage = raw.crop((0, 0, W, TOP))
    canvas = Image.new("RGBA", (W, TOP + LEG), PAPER + (255,)); canvas.paste(stage, (0, 0))
    ov = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)

    def label(x, y, text, color, f=FB):
        bb = d.textbbox((x, y), text, font=f); d.rectangle((bb[0]-6, bb[1]-4, bb[2]+6, bb[3]+4), fill=PAPER + (235,)); d.text((x, y), text, font=f, fill=color)

    def box(r, fill, outline, width=3, hatch=False):
        x0, y0, x1, y1 = [int(v) for v in r]; x1 = min(x1, W-2); y0 = max(y0, 1)
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=outline, width=width)
        if hatch:
            for k in range(x0-(y1-y0), x1, 18): d.line((k, y1, k+(y1-y0), y0), fill=outline + (80,), width=2)

    hy = int(R["horizon"])
    box((0, 0, W, hy), (120, 160, 200, 26), BLUE, width=2); label(14, 118, "HIMMEL – kommt aus dem Code: nicht malen", BLUE)
    cr = R["crown"]; box(cr, (214, 140, 60, 70), ORANGE); label(int(cr[0])+12, 118, "KRONE – Ebene 2, von oben rechts", ORANGE)
    fr = R["far"]; box(fr, (90, 110, 140, 55), BLUE)
    y_fade = fr[1] + (fr[3]-fr[1]) * .58; d.line((fr[0], y_fade, fr[2], y_fade), fill=BLUE + (170,), width=2)
    label(int(fr[0])+12, int(fr[3])-36, "FERNE – Ebene 1, hinter dem Vogel · unten Auslauf", BLUE, F)
    for x in range(0, W, 24): d.line((x, hy, x+12, hy), fill=GREEN + (255,), width=3)
    label(14, hy+8, "Horizont: Sonne und Mond gehen hier unter – Bergkämme der Ferne liegen auf dieser Höhe", GREEN, F)
    sc = R["scene"]; bird = (sc[0] + (sc[2]-sc[0]) * .23, sc[1], sc[0] + (sc[2]-sc[0]) * .81, sc[3] - 35)  # Vogel innerhalb der Szene
    box(bird, (166, 61, 47, 36), RED, hatch=True); label(int(bird[0])+12, int(bird[1])+8, "GOCH – bleibt frei", RED)
    br = R["branch"]; box((br[0], br[1]-3, W, br[3]+3), (166, 61, 47, 26), RED, hatch=True); label(int(br[0])+12, int(br[3])-31, "AST – bleibt frei", RED)
    n = R["name"]; box((n[0]-10, n[1]-8, n[2]+10, n[3]+8), (166, 61, 47, 26), RED, width=2); label(int(n[0])-10, int(n[1])-38, "NAME – bleibt lesbar", RED, F)
    for key, text in (("lang", "Sprachwahl – bleibt lesbar"), ("nav", "Menü – bleibt lesbar")):
        r = R[key]; box((r[0]-8, r[1]-4, r[2]+8, r[3]+4), (166, 61, 47, 26), RED, width=2); label(int(r[0])-8, int(r[3])+12, text, RED, FS)
    canvas = Image.alpha_composite(canvas, ov)
    d = ImageDraw.Draw(canvas); y = TOP + 14
    d.text((24, y), "Schablone der Bühne · robinjameslewis · Schreibtisch, 1536 px breit (Handy: alles rückt zusammen, die Krone sitzt unter der Menüzeile)", font=FT, fill=INK); y += 38
    paras = [
        ("Geliefert werden zwei Bilder, jedes als eigenes PNG auf reinem Weiß (#FFFFFF): ohne Himmel, ohne Sonne und Mond, ohne Schlagschatten, ohne Text, ohne Rahmen. Weiß wird durchsichtig – Papier, Himmel und nachts das Dunkel scheinen durch.", INK),
        ("FERNE (blau): Querformat, mindestens 1536 px breit. Motiv als liegender Streifen mit ruhiger Oberkante; alles Dunkle und Detaillierte liegt unten, nach oben Dunst, der ins Weiß übergeht. Die Ferne steht hinter dem Vogel auf Körperhöhe.", BLUE),
        ("KRONE (orange): 3:2 oder Hochformat, mindestens 1024 px breit. Der Baum berührt die obere und die rechte Bildkante und wächst von dort in die Fläche; unten und links bleibt Weiß. Das Laub endet vor Goch.", ORANGE),
        ("Rot ist tabu: Goch, sein Ast, der Name und die Links liegen vor den Ebenen und kommen aus dem Code. Licht, Tageszeit und Nacht legt die Seite selbst über die Bilder – deshalb neutral-diffus malen, ohne Lichtstimmung und ohne Schatten in eine Richtung.", RED),
    ]
    for text, color in paras:
        for line in textwrap.wrap(text, width=175): d.text((24, y), line, font=FL, fill=color); y += 23
        y += 5
    return canvas.convert("RGB"), stage.convert("RGB")


raw, rects = asyncio.run(capture())
OUT.mkdir(parents=True, exist_ok=True)
template, empty = draw(raw, rects)
template.save(OUT / "20_Landschaft_Schablone_Buehne.png", optimize=True)
empty.save(OUT / "20_Landschaft_Buehne_leer.png", optimize=True)
print(f"Schablone: {OUT / '20_Landschaft_Schablone_Buehne.png'} ({template.size[0]}×{template.size[1]}), leere Bühne: {OUT / '20_Landschaft_Buehne_leer.png'}")
