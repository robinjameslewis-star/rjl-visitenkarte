// Gochs Blickkontakt im eigenen Rahmen (goch-kamera.html; Robin, 23.10.2026): Kamera an, MediaPipe Face Landmarker
// (vendor/mediapipe, Nutzungsmeldung an Google abgeschaltet), etwa acht Auswertungen je Sekunde. An die Startseite gehen
// nur Zahlen aus goch-blickrechnung.js (da, Lage, Größe, Kopfrichtung, schaut her) – kein Bild, keine Ausdruckswerte.
// Nichts wird gespeichert. Hört auf, wenn die Startseite „stopp“ schickt oder der Rahmen verschwindet.
import { FaceLandmarker } from './vendor/mediapipe/vision_bundle.mjs';
import { auswerten } from './goch-blickrechnung.js';

const bild = document.getElementById('bild');
const pfad = p => new URL(p, location.href).href;
const melden = d => parent.postMessage({ typ: 'goch-blick', ...d }, location.origin);
let stream = null, erkenner = null, takt = 0, aus = false;

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false,
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } } });
  } catch (_) { melden({ fehler: 'kamera' }); return; }
  if (aus) { stoppen(); return; }
  bild.srcObject = stream;
  await bild.play().catch(() => {});
  try {
    const dateien = { wasmLoaderPath: pfad('vendor/mediapipe/wasm/vision_wasm_internal.js'), wasmBinaryPath: pfad('vendor/mediapipe/wasm/vision_wasm_internal.wasm') };
    const optionen = delegate => ({ baseOptions: { modelAssetPath: pfad('vendor/mediapipe/modelle/face_landmarker.task'), delegate },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: true });
    try { erkenner = await FaceLandmarker.createFromOptions(dateien, optionen('GPU')); }
    catch (_) { erkenner = await FaceLandmarker.createFromOptions(dateien, optionen('CPU')); }
  } catch (_) { melden({ fehler: 'modell' }); return; }
  if (aus) { stoppen(); return; }
  melden({ bereit: true });
  let zuletzt = -1;
  takt = setInterval(() => {
    if (aus || bild.readyState < 2 || !bild.videoWidth || !bild.videoHeight || bild.currentTime === zuletzt) return;
    zuletzt = bild.currentTime;
    try {
      const r = erkenner.detectForVideo(bild, performance.now());
      const m = r.facialTransformationMatrixes && r.facialTransformationMatrixes[0];
      melden(auswerten(r.faceLandmarks && r.faceLandmarks[0], m && m.data));
    } catch (_) { /* einzelnes Bild verworfen */ }
  }, 125);
}

function stoppen() {
  aus = true;
  clearInterval(takt);
  if (stream) stream.getTracks().forEach(tr => tr.stop());
  stream = null;
  if (erkenner) { try { erkenner.close(); } catch (_) {} erkenner = null; }
}

addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== parent) return;
  if (e.data === 'stopp') stoppen();
  // Testhaken nur lokal: ein Gesicht vorspielen (headless Chrome hat keins)
  if (e.data && e.data.typ === 'test-gesicht' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) melden(e.data.wert);
});
addEventListener('pagehide', stoppen);
start();
