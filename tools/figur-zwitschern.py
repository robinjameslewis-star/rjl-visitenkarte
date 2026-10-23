#!/usr/bin/env python3
"""Gochs Zwitschern aus einer Rotkehlchen-Aufnahme schneiden (Robin, 23.10.2026): sucht Gesangsphrasen (Energie im
Band 2–9 kHz deutlich über dem Grundrauschen), bewertet sie nach Pegel und Abwechslung der Tonhöhe (Rotkehlchen singen
viele kurze, wechselnde Töne – ein gleichbleibender Ton ist eher Grille oder Störung) und nimmt daraus ein Stück von
1,25 s mit möglichst vielen Tonwechseln und ruhigen Rändern. Entfernt tiefes Rauschen unter 1,2 kHz, normalisiert auf
−3 dBFS Spitze, blendet weich ein (25 ms) und aus (120 ms). Ausgabe Ogg/Opus (40 kbit/s) und MP3 (64 kbit/s), je unter
50 KB (FIGUREN.md, Signalton). Vor dem Einbau anhören; die Stelle lässt sich mit --start/--ende festlegen.

Oder erzeugt (Robin, 23.10.2026: „weniger echt, perfekter – passend zu einem gezeichneten Vogel, der spricht“): reine
Töne mit kurzen Tonhöhen-Bögen, ein wenig Oberton, weicher Ein- und Ausklang, ein Hauch Raum – ohne Feldrauschen.
Stile: tiu (zwei fallende Bögen und ein Pip), tschilp (drei steigende Bögen), triller (kurzer Triller mit Schluss-
Bogen), frage (freundlich fragend, steigend). Selbst erzeugt, keine fremden Rechte.
Braucht Python mit numpy und PyAV (`pip install av numpy`), kein ffmpeg.

  python3 tools/figur-zwitschern.py <aufnahme> figuren/goch/toene/zwitschern   # schreibt .ogg und .mp3
  python3 tools/figur-zwitschern.py <aufnahme> <ziel> --start 61.20 --ende 62.30   # Stelle von Hand
  python3 tools/figur-zwitschern.py --erzeugen tiu figuren/goch/toene/zwitschern   # gezeichnetes Zwitschern
"""
import argparse, sys
import av
import numpy as np

RATE = 48000

def laden(pfad):
    mit = av.open(pfad)
    resampler = av.AudioResampler(format='flt', layout='mono', rate=RATE)
    teile = []
    for frame in mit.decode(audio=0):
        for f in resampler.resample(frame):
            teile.append(f.to_ndarray().reshape(-1))
    mit.close()
    return np.concatenate(teile).astype(np.float32)

def bandenergie(x, fenster=1024, schritt=480):
    n = 1 + (len(x) - fenster) // schritt
    idx = np.arange(fenster)[None, :] + schritt * np.arange(n)[:, None]
    spek = np.abs(np.fft.rfft(x[idx] * np.hanning(fenster), axis=1)) ** 2
    f = np.fft.rfftfreq(fenster, 1 / RATE)
    return spek[:, (f >= 2000) & (f <= 8000)].sum(axis=1), schritt / RATE

def phrase_finden(x, laenge=1.25):
    fenster, schritt = 1024, 480
    n = 1 + (len(x) - fenster) // schritt
    idx = np.arange(fenster)[None, :] + schritt * np.arange(n)[:, None]
    spek = np.abs(np.fft.rfft(x[idx] * np.hanning(fenster), axis=1)) ** 2
    f = np.fft.rfftfreq(fenster, 1 / RATE); band = (f >= 2000) & (f <= 9000)
    e = spek[:, band].sum(axis=1); dt = schritt / RATE
    mitte = (spek[:, band] * f[band]).sum(axis=1) / np.maximum(e, 1e-12)  # Schwerpunkt der Tonhöhe
    boden = np.percentile(e, 20)
    # Phrasen: aktive Fenster, Lücken unter 120 ms zusammengefasst
    laeufe, beginn, luecke = [], None, 0
    for i, a in enumerate(e > boden * 5):
        if a:
            if beginn is None: beginn = i
            luecke = 0
        elif beginn is not None:
            luecke += 1
            if luecke * dt > .12: laeufe.append((beginn, i - luecke)); beginn, luecke = None, 0
    def wert(a, b):
        c = mitte[a:b + 1]
        return np.sum(np.abs(np.diff(c)) > 400) / ((b - a + 1) * dt) * np.std(c) / 1000 * min(10 * np.log10(e[a:b + 1].mean() / boden), 30)
    phrasen = [(wert(a, b), a, b) for a, b in laeufe if .8 <= (b - a + 1) * dt <= 3.0]
    if not phrasen: sys.exit('Keine passende Phrase gefunden – bitte --start und --ende angeben')
    _, a, b = max(phrasen)
    w = int(laenge / dt)
    if b - a + 1 <= w: return a * dt, (b + 1) * dt
    # Stück mit den meisten Tonwechseln, Ränder möglichst leise
    best, beste = a, -1
    for s0 in range(a, b - w + 2):
        c = mitte[s0:s0 + w]
        punkte = np.sum(np.abs(np.diff(c)) > 400) - 3 * (e[s0] + e[s0 + w - 1]) / e[s0:s0 + w].max()
        if punkte > beste: best, beste = s0, punkte
    return best * dt, (best + w) * dt

def bearbeiten(x, start, ende):
    a, b = int(max(0, start - .04) * RATE), int(min(len(x) / RATE, ende + .06) * RATE)
    y = x[a:b].astype(np.float64)
    # Hochpass über die FFT: unter 1,0 kHz aus, bis 1,2 kHz weich hinein
    spek = np.fft.rfft(y); f = np.fft.rfftfreq(len(y), 1 / RATE)
    spek *= np.clip((f - 1000) / 200, 0, 1)
    y = np.fft.irfft(spek, len(y))
    rein, raus = int(.025 * RATE), int(.12 * RATE)
    y[:rein] *= np.linspace(0, 1, rein); y[-raus:] *= np.linspace(1, 0, raus) ** 2
    y *= 10 ** (-3 / 20) / max(np.abs(y).max(), 1e-9)
    return y.astype(np.float32)

def ton(f0, f1, dauer, form=1.0, vibrato=0.0, oberton=.12):
    """Ein Bogen von f0 nach f1 Hz (form < 1: schnell zu Beginn, > 1: schnell am Ende), weich ein- und ausgeblendet."""
    n = int(dauer * RATE); t = np.arange(n) / RATE; u = t / dauer
    f = f0 + (f1 - f0) * u ** form
    if vibrato: f *= 1 + vibrato * np.sin(2 * np.pi * 32 * t)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    y = np.sin(phase) + oberton * np.sin(2 * phase + .4)
    rein = np.clip(t / .006, 0, 1); raus = np.clip((dauer - t) / min(.04, dauer * .45), 0, 1)
    return y * (3 * rein ** 2 - 2 * rein ** 3) * np.sin(np.pi / 2 * raus) ** 2

def triller(f, hub, rate, dauer):
    n = int(dauer * RATE); t = np.arange(n) / RATE
    phase = 2 * np.pi * np.cumsum(f + hub * np.sin(2 * np.pi * rate * t)) / RATE
    huelle = np.sin(np.pi * t / dauer) ** .7
    return (np.sin(phase) + .1 * np.sin(2 * phase)) * huelle

STILE = {  # (Ton oder Pause in Sekunden), nacheinander
    'tiu': [ton(4300, 3000, .10, .6), .055, ton(4500, 3100, .11, .6), .07, ton(3500, 4200, .05, 1.4)],
    'tschilp': [ton(2900, 4500, .06, 1.5), .045, ton(3000, 4700, .06, 1.5), .045, ton(3100, 5000, .12, 1.3, vibrato=.012)],
    'triller': [triller(3700, 520, 27, .26), .03, ton(3300, 4800, .11, 1.6)],
    'frage': [ton(3000, 3350, .08, 1.0), .06, ton(3150, 4900, .15, 1.8, vibrato=.008)],
}

def erzeugen(stil):
    teile = [np.zeros(int(.02 * RATE))]
    for s in STILE[stil]:
        teile.append(np.zeros(int(s * RATE)) if isinstance(s, float) else s)
    y = np.concatenate(teile + [np.zeros(int(.12 * RATE))])
    # ein Hauch Raum: kurzer, abklingender Nachhall (18 dB leiser), damit es nicht ganz trocken klingt
    rng = np.random.default_rng(23); n = int(.09 * RATE)
    hall = rng.standard_normal(n) * np.exp(-np.arange(n) / (.025 * RATE)); hall *= .125 / np.sqrt((hall ** 2).sum())
    y = y + np.convolve(y, hall)[:len(y)]
    while len(y) < int(.55 * RATE): y = np.append(y, 0.0)  # mindestens 0,5 s (FIGUREN.md)
    return (y * 10 ** (-3 / 20) / np.abs(y).max()).astype(np.float32)

def schreiben(y, ziel, format_, codec, rate, bitrate):
    out = av.open(ziel, 'w', format=format_)
    s = out.add_stream(codec, rate=rate); s.layout = 'mono'; s.bit_rate = bitrate
    resampler = av.AudioResampler(format=s.format.name if s.format else 'fltp', layout='mono', rate=rate)
    rahmen = av.AudioFrame.from_ndarray(y.reshape(1, -1), format='flt', layout='mono'); rahmen.sample_rate = RATE
    for f in resampler.resample(rahmen) + resampler.resample(None):
        for p in s.encode(f): out.mux(p)
    for p in s.encode(None): out.mux(p)
    out.close()

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--erzeugen':
        stil, ziel = sys.argv[2], sys.argv[3]
        y = erzeugen(stil)
        schreiben(y, ziel + '.ogg', 'ogg', 'libopus', 48000, 40000)
        schreiben(y, ziel + '.mp3', 'mp3', 'libmp3lame', 44100, 64000)
        print(f'Stil {stil}, Ton {len(y) / RATE:.2f} s → {ziel}.ogg, {ziel}.mp3')
        sys.exit(0)
    arg = argparse.ArgumentParser(); arg.add_argument('aufnahme'); arg.add_argument('ziel')
    arg.add_argument('--start', type=float); arg.add_argument('--ende', type=float)
    a = arg.parse_args()
    x = laden(a.aufnahme)
    start, ende = (a.start, a.ende) if a.start is not None else phrase_finden(x)
    y = bearbeiten(x, start, ende)
    schreiben(y, a.ziel + '.ogg', 'ogg', 'libopus', 48000, 40000)
    schreiben(y, a.ziel + '.mp3', 'mp3', 'libmp3lame', 44100, 64000)
    print(f'Phrase {start:.2f}–{ende:.2f} s der Aufnahme, Ton {len(y) / RATE:.2f} s → {a.ziel}.ogg, {a.ziel}.mp3')
