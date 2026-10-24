"""Prüft den lokalen Dienst des Messegeräts (kiosk/dienst/goch_kiosk.py, 23.10.2026) gegen die Worker-Attrappe:
nur die Dateien des Kiosks, Host-Prüfung, Weiterleitung mit Gerätenachweis (nie zur Seite), Lebenszeichen, Ereignisse
(Radar, Netz), Puffer bestätigter Nachrichten ohne Netz und Nachsenden, Zwischenspeicher der Figurentexte, keine
Gesprächsinhalte im Protokoll; dazu der Rahmenleser des Radars HLK-LD2410. Workshop-Bühne (24.10.2026): buehne.html,
Kapitelliste und Videos mit Range aus dem Vortragsordner (--vortrag), als Strom, Abbrüche ohne Traceback.

Aufruf:  python3 tests/kiosk_dienst_test.py      (startet Attrappe und Dienst selbst; nur Standardbibliothek)"""
import http.client, json, os, socket, stat, struct, subprocess, sys, tempfile, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'kiosk', 'dienst'))
import radar_ld2410 as radar  # noqa: E402

UP, DIENST = 8797, 8796
TOKEN = 'messe-1.' + 'T' * 43
failures = []

def check(cond, label, detail=''):
    print(('  ok   ' if cond else '  FAIL ') + label + (f' ({detail})' if detail != '' else ''))
    if not cond: failures.append(label)

def anfrage(methode, pfad, body=None, typ='application/json', host=f'localhost:{DIENST}'):
    c = http.client.HTTPConnection('127.0.0.1', DIENST, timeout=10)
    c.request(methode, pfad, body=body, headers={'Host': host, **({'Content-Type': typ} if body is not None else {})})
    r = c.getresponse()
    daten = r.read()
    c.close()
    return r.status, dict(r.getheaders()), daten

def upstream(pfad):
    c = http.client.HTTPConnection('127.0.0.1', UP, timeout=5); c.request('GET', pfad); d = json.loads(c.getresponse().read()); c.close(); return d

def warte_port(port, offen=True, sekunden=8):
    ende = time.time() + sekunden
    while time.time() < ende:
        try:
            socket.create_connection(('127.0.0.1', port), 0.2).close()
            if offen: return True
        except OSError:
            if not offen: return True
        time.sleep(0.1)
    return False

def wav(sek):
    n = int(sek * 16000) * 2
    return b'RIFF' + struct.pack('<I', 36 + n) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, 16000, 32000, 2, 16) + b'data' + struct.pack('<I', n) + bytes(n)

print('Radar HLK-LD2410: Rahmenleser und Anwesenheit')
leser = radar.Rahmenleser()
r1 = radar.rahmen(1, bewegt_cm=180); r2 = radar.rahmen(2, still_cm=250, technik=True)
berichte = leser.fuettern(b'\x00\x13' + r1[:7]) + leser.fuettern(r1[7:] + b'mull' + r2)
check(len(berichte) == 2 and berichte[0].abstand_m == 1.8 and berichte[1].abstand_m == 2.5 and berichte[1].zustand == 2, 'Rahmen über Stückgrenzen, Technikmodus, Müll dazwischen', [(b.zustand, b.abstand_m) for b in berichte])
check(leser.fuettern(radar.rahmen(3, 300, 120)[:-1] + b'\x00')[:1] == [], 'kaputtes Rahmenende wird verworfen')
an = radar.Anwesenheit(1, 3, halten_s=0.5, weg_s=3)
folge = [an.melden(radar.Bericht(1, 200, 0, 200), t) for t in (0, 0.3, 0.6, 1.0)] + [an.melden(radar.Bericht(0, 0, 0, 0), t) for t in (2.0, 4.1)]
check(folge == [None, None, 'anwesend', None, None, 'abwesend'], 'anwesend nach 0,5 s im Bereich, abwesend nach 3 s ohne Person', folge)
weit = radar.Anwesenheit(1, 3, halten_s=0)
check(weit.melden(radar.Bericht(1, 450, 0, 450), 0) is None and weit.melden(radar.Bericht(1, 60, 0, 60), 1) is None, 'außerhalb von 1–3 m keine Meldung')

tmp = tempfile.mkdtemp(prefix='rjl-kiosk-dienst-')
daten, figuren = os.path.join(tmp, 'daten'), os.path.join(tmp, 'figuren')
os.makedirs(os.path.join(figuren, 'kunde-test', 'bilder')); os.makedirs(daten)
open(os.path.join(figuren, 'kunde-test', 'figur.json'), 'w').write('{"format":1,"id":"kunde-test"}')
geraet = os.path.join(tmp, 'geraet.json')
fd = os.open(geraet, os.O_WRONLY | os.O_CREAT, 0o600)
with os.fdopen(fd, 'w') as f: json.dump({'worker': f'http://127.0.0.1:{UP}', 'token': TOKEN}, f)
vortrag = os.path.join(tmp, 'vortrag'); os.makedirs(os.path.join(vortrag, 'folien'))
VIDEO = bytes(range(256)) * 40  # 10.240 Bytes, kein echtes Video – es geht um Range
open(os.path.join(vortrag, 'Kapitel_00_Test.mp4'), 'wb').write(VIDEO)
GROSS = bytes(range(256)) * 12288  # 3 MB: Antworten gehen als Strom in Blöcken hinaus
open(os.path.join(vortrag, 'Kapitel_01_Gross.mp4'), 'wb').write(GROSS)
open(os.path.join(vortrag, 'folien', 'folie-01.jpg'), 'wb').write(b'\xff\xd8\xff')
json.dump({'kapitel': 'Kapitel 0', 'titel': 'Test', 'video': 'Kapitel_00_Test.mp4', 'dauer': 3.0,
           'absaetze': [{'id': '0.0', 'von': 0, 'bis': 1.2, 'text': 'Hallo.', 'folie': 'folie-01.jpg'}]},
          open(os.path.join(vortrag, 'Kapitel_00_Test.marken.json'), 'w'))
open(os.path.join(tmp, 'geheim.txt'), 'w').write('nicht ausliefern')
konfig = os.path.join(tmp, 'konfiguration.json')
json.dump({'figur': 'goch', 'sprache': 'de', 'inaktivitaet_s': 60, 'zwitschern': {'an': True, 'entfernung_m': [1, 3]}, 'radar': {}}, open(konfig, 'w'))
PY = sys.executable
fake = lambda: subprocess.Popen([PY, os.path.join(ROOT, 'tests', 'goch_fake_worker.py'), str(UP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
up = fake(); warte_port(UP)
logdatei = open(os.path.join(tmp, 'dienst.log'), 'w')
dienst = subprocess.Popen([PY, os.path.join(ROOT, 'kiosk', 'dienst', 'goch_kiosk.py'), '--seite', ROOT, '--figuren', figuren, '--daten', daten,
                           '--geraet', geraet, '--konfiguration', konfig, '--vortrag', vortrag, '--port', str(DIENST), '--lebenszeichen-takt', '1', '--test'],
                          stdout=logdatei, stderr=subprocess.STDOUT)
try:
    check(warte_port(DIENST), 'Dienst lauscht auf 127.0.0.1')

    print('Auslieferung: nur die Dateien des Kiosks')
    s, h, d = anfrage('GET', '/kiosk.html')
    check(s == 200 and b'kiosk.js' in d, 'kiosk.html')
    check(anfrage('GET', '/')[0] == 302, '/ leitet auf kiosk.html')
    for pfad in ('/index.html', '/worker/wrangler.toml', '/kiosk/dienst/goch_kiosk.py', '/kiosk.html/../worker/src/index.js', '/figur/goch/../../../worker/wrangler.toml', '/figur/kunde-test/../../geraet.json'):
        if anfrage('GET', pfad)[0] != 404: check(False, 'gesperrt: ' + pfad)
    check(True, 'alles andere 404 (index.html, Worker, Dienst, Pfade mit ..)')
    check(anfrage('GET', '/figur/goch/figur.json')[0] == 200 and anfrage('GET', '/figur/goch/bilder/bestand/vogel.webp')[1].get('Content-Type') == 'image/webp', 'Goch aus der Website (/figur/goch/)')
    check(anfrage('GET', '/figur/kunde-test/figur.json')[0] == 200 and anfrage('GET', '/figur/kunde-fehlt/figur.json')[0] == 404, 'Kundenfigur nur vom Gerät')
    check(anfrage('GET', '/kiosk.html', host='boese.example')[0] == 403 and anfrage('GET', '/kiosk.html', host='127.0.0.1:' + str(DIENST))[0] == 200, 'fremder Host-Kopf: 403 (DNS-Rebinding)')
    k = json.loads(anfrage('GET', '/kiosk/konfiguration')[2])
    check(k['figur'] == 'goch' and k['figurBasis'] == '/figur/goch/' and 'radar' not in k and TOKEN not in json.dumps(k), 'Konfiguration für die Seite ohne Nachweis und Radar-Port')

    print('Workshop-Bühne: Seite, Kapitelliste, Videos mit Range')
    check(anfrage('GET', '/buehne.html')[0] == 200 and anfrage('GET', '/buehne.js')[0] == 200, 'buehne.html und buehne.js')
    s, h, d = anfrage('GET', '/vortrag/liste')
    check(s == 200 and json.loads(d) == [{'marken': 'Kapitel_00_Test.marken.json', 'kapitel': 'Kapitel 0', 'titel': 'Test', 'video': 'Kapitel_00_Test.mp4', 'dauer': 3.0}], 'Kapitelliste aus den Absatzmarken', d[:120])
    def bereich(r, datei='Kapitel_00_Test.mp4'):
        c = http.client.HTTPConnection('127.0.0.1', DIENST, timeout=10)
        c.request('GET', '/vortrag/' + datei, headers={'Host': f'localhost:{DIENST}', **({'Range': r} if r else {})})
        x = c.getresponse(); b = x.read(); c.close(); return x.status, dict(x.getheaders()), b
    s, h, d = bereich(None)
    check(s == 200 and d == VIDEO and h.get('Content-Type') == 'video/mp4' and h.get('Accept-Ranges') == 'bytes', 'Video ganz (200, Accept-Ranges)')
    s, h, d = bereich('bytes=1000-1999')
    check(s == 206 and d == VIDEO[1000:2000] and h.get('Content-Range') == f'bytes 1000-1999/{len(VIDEO)}', 'Bereich 1000–1999 (206)', h.get('Content-Range'))
    s, h, d = bereich('bytes=10000-')
    check(s == 206 and d == VIDEO[10000:], 'offener Bereich bis zum Ende')
    s, h, d = bereich('bytes=-240')
    check(s == 206 and d == VIDEO[-240:], 'letzte 240 Bytes')
    check(bereich('bytes=20000-')[0] == 416, 'Bereich hinter dem Ende: 416')
    check(bereich('bytes=-0')[0] == 416, 'leerer Endbereich „bytes=-0“: 416')
    for r in ('bytes=0-1,5-6', 'bytes=abc', 'bytes=5-3', 'bytes=-'):
        s, h, d = bereich(r)
        if s != 200 or d != VIDEO: check(False, 'ganze Datei bei ' + r, s)
    check(True, 'kaputte oder mehrfache Bereiche: ganze Datei (200)')
    s, h, d = bereich('bytes=1000000-2999999', 'Kapitel_01_Gross.mp4')
    check(s == 206 and d == GROSS[1000000:3000000] and h.get('Content-Length') == '2000000' and h.get('Content-Range') == f'bytes 1000000-2999999/{len(GROSS)}'
          and h.get('X-Content-Type-Options') == 'nosniff' and h.get('Cache-Control') == 'no-store', 'geschlossener Bereich aus 3 MB genau (206, Strom)', h.get('Content-Range'))
    s, h, d = bereich(f'bytes=0-{len(GROSS) - 1}', 'Kapitel_01_Gross.mp4')
    check(s == 206 and d == GROSS and h.get('Content-Range') == f'bytes 0-{len(GROSS) - 1}/{len(GROSS)}', 'ganze 3 MB als Bereich wie bei Safari (206)')
    s, h, d = bereich(None, 'Kapitel_01_Gross.mp4')
    check(s == 200 and d == GROSS and h.get('Content-Length') == str(len(GROSS)) and h.get('Accept-Ranges') == 'bytes', '3 MB ganz (200, Strom)')
    v = socket.socket(); v.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4096); v.connect(('127.0.0.1', DIENST))
    v.sendall(f'GET /vortrag/Kapitel_01_Gross.mp4 HTTP/1.1\r\nHost: localhost:{DIENST}\r\nRange: bytes=0-\r\n\r\n'.encode())
    erste = v.recv(64); v.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack('ii', 1, 0)); v.close(); time.sleep(0.5)
    protokoll = open(os.path.join(tmp, 'dienst.log')).read()
    check(b' 206 ' in erste[:16] and 'Traceback' not in protokoll and anfrage('GET', '/vortrag/liste')[0] == 200, 'abgebrochener Abruf (Sprung im Video): kein Traceback, Dienst läuft weiter', protokoll.count('Traceback'))
    json.dump({'kapitel': 'Kapitel 1', 'titel': 'Gross', 'video': 'Kapitel_01_Gross.mp4', 'dauer': 9.5}, open(os.path.join(vortrag, 'Kapitel_01_Gross.marken.json'), 'w'))
    json.dump([1, 2], open(os.path.join(vortrag, 'Kapitel_02_Liste.marken.json'), 'w'))
    json.dump('nur Text', open(os.path.join(vortrag, 'Kapitel_03_Text.marken.json'), 'w'))
    s, h, d = anfrage('GET', '/vortrag/liste')
    check(s == 200 and [k['marken'] for k in json.loads(d)] == ['Kapitel_00_Test.marken.json', 'Kapitel_01_Gross.marken.json'], 'Absatzmarken ohne Objekt (Liste, Text) übersprungen, gültige bleiben', d[:160])
    os.rename(vortrag, vortrag + '-weg')
    s, h, d = anfrage('GET', '/vortrag/liste')
    os.rename(vortrag + '-weg', vortrag)
    check(s == 503 and 'error' in json.loads(d), 'Vortragsordner weg (Stick gezogen): 503 mit Fehler', s)
    check(anfrage('GET', '/vortrag/folien/folie-01.jpg')[0] == 200, 'Folienbild')
    for pfad in ('/vortrag/../geheim.txt', '/vortrag/%2e%2e/geheim.txt', '/vortrag/folien/../../geheim.txt', '/vortrag/fehlt.mp4'):
        if anfrage('GET', pfad)[0] != 404: check(False, 'gesperrt: ' + pfad)
    check(True, 'nichts außerhalb des Vortragsordners (..)')
    try:  # eigener kurzer Start auf anderem Port: fehlender Vortragsordner bricht mit Hinweis ab
        r = subprocess.run([PY, os.path.join(ROOT, 'kiosk', 'dienst', 'goch_kiosk.py'), '--seite', ROOT, '--figuren', figuren, '--daten', os.path.join(tmp, 'daten-2'),
                            '--geraet', geraet, '--konfiguration', konfig, '--vortrag', os.path.join(tmp, 'vortrag-fehlt'), '--port', '8761'], capture_output=True, text=True, timeout=5)
        start = (r.returncode, r.stderr.strip())
    except subprocess.TimeoutExpired:
        start = (0, 'läuft trotzdem')
    check(start[0] != 0 and 'Vortragsordner nicht gefunden' in start[1] and not os.path.exists(os.path.join(tmp, 'daten-2')), 'fehlender Vortragsordner: Abbruch beim Start mit Hinweis', start[1][-120:])

    print('Weiterleitung an den Worker mit Gerätenachweis')
    s, h, d = anfrage('POST', '/kiosk/chat', json.dumps({'figur': 'goch', 'lang': 'de', 'messages': [{'role': 'user', 'content': 'Wer ist Robin? Geheimes Anliegen 4711'}]}))
    check(s == 200 and json.loads(d)['reply'].startswith('Robin James Lewis'), 'Antwort kommt durch', s)
    check(upstream('/_auth')[-1] == 'Bearer ' + TOKEN, 'Nachweis nur zwischen Dienst und Worker')
    check(TOKEN not in json.dumps(h) + d.decode() and not any(k.lower().startswith('access-control') for k in h), 'kein Nachweis und keine CORS-Kopfzeilen zur Seite')
    s, h, d = anfrage('POST', '/kiosk/listen?lang=en', wav(1.2), 'audio/wav')
    li = upstream('/_listen')[-1]
    check(s == 200 and json.loads(d)['text'] == 'What is Robin working on?' and li['lang'] == 'en' and li['typ'] == 'audio/wav' and li['kopf'] == 'RIFF', 'Spracheingabe mit Sprache und WAV')
    meta = json.loads(anfrage('GET', '/kiosk/figur?id=kunde-test')[2])
    check(meta['name']['de'] == 'Muster' and os.path.exists(os.path.join(daten, 'figur-kunde-test.json')), 'Figurentexte vom Worker, auf dem Gerät zwischengespeichert')
    time.sleep(1.5)
    lz = upstream('/_lebenszeichen')
    check(lz and lz[-1].get('version') == '1' and lz[-1].get('figur') == 'goch' and 'radar' in lz[-1] and 'puffer' in lz[-1], 'Lebenszeichen an den Worker', lz[-1:] )

    print('Ereignisse an die Seite: Netz und Radar')
    ereignisse = []
    def lauschen():
        c = http.client.HTTPConnection('127.0.0.1', DIENST, timeout=30)
        c.request('GET', '/ereignisse', headers={'Host': f'localhost:{DIENST}'})
        r = c.getresponse()
        while True:
            zeile = r.fp.readline()
            if not zeile: break
            if zeile.startswith(b'data: '): ereignisse.append(json.loads(zeile[6:]))
    threading.Thread(target=lauschen, daemon=True).start(); time.sleep(0.5)
    check(ereignisse and ereignisse[0] == {'typ': 'netz', 'online': True}, 'erst der Netzstatus')
    anfrage('POST', '/kiosk/test/radar', json.dumps({'rahmen': radar.rahmen(1, bewegt_cm=200).hex()}))
    anfrage('POST', '/kiosk/test/radar', json.dumps({'rahmen': radar.rahmen(1, bewegt_cm=220).hex()}))
    time.sleep(0.3)
    an = [e for e in ereignisse if e['typ'] == 'anwesend']
    check(len(an) == 1 and an[0]['entfernung'] == 2.0, 'Radar-Rahmen bei 2 m → einmal „anwesend“ (nicht bei jedem Rahmen)', an)

    print('Ohne Netz: Hinweis, Puffer, Nachsenden')
    up.terminate(); up.wait(); warte_port(UP, offen=False)
    s, h, d = anfrage('POST', '/kiosk/chat', json.dumps({'figur': 'goch', 'lang': 'de', 'messages': [{'role': 'user', 'content': 'Wer ist Robin?'}]}))
    check(s == 503 and json.loads(d) == {'offline': True}, 'Frage ohne Netz: 503 offline')
    time.sleep(0.3)
    check({'typ': 'netz', 'online': False} in ereignisse, 'Seite erfährt „offline“')
    zusammenfassung = 'Ich richte Robin aus: Bitte zurückrufen – Von: Max Muster, max@example.com. Soll ich das so senden?'
    bestaetigung = {'figur': 'goch', 'lang': 'de', 'messages': [{'role': 'user', 'content': 'Ich möchte Robin etwas ausrichten'}, {'role': 'assistant', 'content': zusammenfassung}, {'role': 'user', 'content': 'Ja'}]}
    s, h, d = anfrage('POST', '/kiosk/chat', json.dumps(bestaetigung))
    puffer = os.path.join(daten, 'puffer.jsonl')
    check(s == 200 and json.loads(d).get('gepuffert') is True and 'sobald ich wieder online bin' in json.loads(d)['reply'], 'bestätigte Nachricht: gepuffert, freundliche Antwort')
    check(os.path.exists(puffer) and stat.S_IMODE(os.stat(puffer).st_mode) == 0o600, 'Puffer nur für den Dienst lesbar (600)')
    check(json.loads(anfrage('GET', '/kiosk/figur?id=kunde-test')[2])['name']['de'] == 'Muster', 'Figurentexte offline aus dem Zwischenspeicher')
    up = fake(); warte_port(UP); time.sleep(4)
    chats = upstream('/_chats')
    check(any(c.get('messages', [{}])[-1].get('content') == 'Ja' for c in chats) and not os.path.exists(puffer), 'Netz wieder da: Nachricht nachgesendet, Puffer gelöscht')
    time.sleep(0.3)
    check(ereignisse[-1] == {'typ': 'netz', 'online': True} or {'typ': 'netz', 'online': True} in ereignisse[ereignisse.index({'typ': 'netz', 'online': False}):], 'Seite erfährt „wieder online“')

    print('Protokoll ohne Inhalte, Zustand für den Wächter')
    z = json.loads(anfrage('GET', '/kiosk/zustand')[2])
    anfrage('POST', '/kiosk/puls', b'')
    check('puls_s' in z and json.loads(anfrage('GET', '/kiosk/zustand')[2])['puls_s'] <= 1, 'Puls der Seite für den Wächter')
    logdatei.flush(); protokoll = open(os.path.join(tmp, 'dienst.log')).read()
    check('4711' not in protokoll and 'Max Muster' not in protokoll and TOKEN.split('.')[1] not in protokoll, 'keine Gesprächsinhalte, Namen oder Nachweise im Protokoll')
finally:
    dienst.terminate(); up.terminate()
print('\nAlle Prüfungen bestanden.' if not failures else f'\n{len(failures)} Prüfung(en) fehlgeschlagen: ' + ', '.join(failures))
sys.exit(1 if failures else 0)
