#!/usr/bin/env python3
"""MediaPipe Tasks Vision für Gochs Blickkontakt übernehmen (Robin, 23.10.2026): kopiert aus dem npm-Paket nur, was die
Seite braucht, prüft die Prüfsummen und schaltet die Nutzungsmeldung an Google ab (MediaPipe schickt sonst alle 60 s
Messwerte an odml.pa.googleapis.com – laut eigenem Datenschutzhinweis; die Bilder selbst verlassen das Gerät nie). Die
Seite lädt alles von robin.vision; goch-kamera.html sperrt fremde Verbindungen zusätzlich per Content-Security-Policy.

Aufruf vom Repository-Stamm (Paket und Modell vorher in einen eigenen, leeren Ordner laden):
  npm pack @mediapipe/tasks-vision@1.0.1 --ignore-scripts && tar -xzf mediapipe-tasks-vision-1.0.1.tgz
  curl -O https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
  curl -O https://www.apache.org/licenses/LICENSE-2.0.txt
  python3 tools/mediapipe-uebernehmen.py <ordner mit package/, face_landmarker.task, LICENSE-2.0.txt>
"""
import hashlib, shutil, sys
from pathlib import Path

VERSION = '1.0.1'
PRUEFSUMMEN = {  # npm-Paket @mediapipe/tasks-vision 1.0.1 (31.07.2026) und Modell face_landmarker float16/1
    'package/vision_bundle.mjs': 'd885630c297c0b20b1fe86096cb06291c4c8080876f27852e724f24ac603713f',
    'package/wasm/vision_wasm_internal.js': 'e170ee67dd4e16c1a6fcd8840a206687e5a59b22c20e4a902bc445b095454d73',
    'package/wasm/vision_wasm_internal.wasm': '8da277a733926eacd0474b8704b36742d6ec3231c57a860c5b889dff8f1df886',
    'face_landmarker.task': '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
}
# Nutzungsmeldung abschalten: Der Protokollierer gilt von Anfang an als gestört – er sammelt nichts, sendet nichts und
# stellt keinen Zeitgeber. Genau eine Stelle; ändert sich der Code in einer anderen Version, bricht das Werkzeug ab.
ALT = 'constructor(t){this.h=[],this.m=new Eh,this.j=t??"",this.g=setInterval(()=>{this.flush()},6e4)}'
NEU = 'constructor(t){this.h=[],this.m=new Eh,this.j="",this.error=Error("robin.vision: Nutzungsmeldung an Google abgeschaltet")}'
KOPF = ('/* robin.vision, 23.10.2026: geändert gegenüber @mediapipe/tasks-vision ' + VERSION + ' (Apache-2.0) – Nutzungsmeldung an '
        'Google abgeschaltet (Protokollierer sendet nie). Siehe vendor/mediapipe/HINWEIS.md und tools/mediapipe-uebernehmen.py. */\n')

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

if __name__ == '__main__':
    quelle = Path(sys.argv[1]).resolve()
    ziel = Path(__file__).resolve().parent.parent / 'vendor' / 'mediapipe'
    for name, soll in PRUEFSUMMEN.items():
        ist = sha(quelle / name)
        if ist != soll: sys.exit(f'Prüfsumme stimmt nicht: {name} {ist}')
    (ziel / 'wasm').mkdir(parents=True, exist_ok=True); (ziel / 'modelle').mkdir(exist_ok=True)
    js = (quelle / 'package/vision_bundle.mjs').read_text()
    if js.count(ALT) != 1: sys.exit('Stelle der Nutzungsmeldung nicht eindeutig gefunden – Version prüfen')
    js = KOPF + js.replace(ALT, NEU)
    if 'setInterval(()=>{this.flush()}' in js: sys.exit('Zeitgeber der Nutzungsmeldung noch vorhanden')
    (ziel / 'vision_bundle.mjs').write_text(js)
    for name, nach in (('package/wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.js'),
                       ('package/wasm/vision_wasm_internal.wasm', 'wasm/vision_wasm_internal.wasm'),
                       ('face_landmarker.task', 'modelle/face_landmarker.task'), ('LICENSE-2.0.txt', 'LICENSE')):
        shutil.copyfile(quelle / name, ziel / nach)
    for p in sorted(ziel.rglob('*')):
        if p.is_file(): print(p.relative_to(ziel.parent.parent), round(p.stat().st_size / 1024), 'KB')
