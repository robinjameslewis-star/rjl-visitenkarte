"""Lokaler Dienst des Messegeräts (Robin, 23.10.2026) – läuft auf dem Linux-Mini-PC neben Chromium im Kiosk-Modus.

- liefert die Seite (fester Commit der Website, nur die Dateien des Kiosks) unter http://localhost:8080 aus,
- reicht /kiosk/chat, /kiosk/listen und /kiosk/figur an den Worker weiter und hängt dabei den Gerätenachweis an
  (er liegt nur hier, in /etc/goch-kiosk/geraet.json, nie im Browser), auf Wunsch mit Client-Zertifikat,
- puffert ohne Netz bestätigte Nachrichten an Robin und sendet sie später (Datei nur auf dem Gerät, höchstens 14 Tage),
- meldet Radar-Anwesenheit (HLK-LD2410) und Netzstatus als Ereignisse an die Seite (/ereignisse, Server-Sent Events),
- schickt alle fünf Minuten ein Lebenszeichen an den Worker und meldet sich bei systemd (Watchdog).
Nur Standardbibliothek; für das Radar zusätzlich pyserial. Gesprächsinhalte werden nie protokolliert.

Aufruf (siehe kiosk/README.md):
    python3 goch_kiosk.py --seite /opt/goch-kiosk/seite --figuren /var/lib/goch-kiosk/figuren --daten /var/lib/goch-kiosk \\
        --geraet /etc/goch-kiosk/geraet.json --konfiguration /etc/goch-kiosk/konfiguration.json [--port 8080] [--test]
--test öffnet zusätzlich /kiosk/test/radar und /kiosk/test/netz (nur für die Prüfungen)."""
import argparse, json, mimetypes, os, queue, re, socket, ssl, stat, subprocess, sys, threading, time, urllib.error, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radar_ld2410  # noqa: E402

VERSION = '1'
# Was die Seite braucht – sonst nichts aus dem Repository
SEITE = re.compile(r'^(kiosk\.html|kiosk\.js|figur\.js|goch-audio\.js|language\.js|assets/papier\.jpg|assets/fonts/[A-Za-z0-9._-]+)$')
KONFIG_FUER_SEITE = ('figur', 'fassung', 'sprache', 'sprachwahl', 'lautstaerke', 'zwitschern', 'ruhezeiten', 'inaktivitaet_s', 'taste',
                     'aufnahme_s', 'stimme', 'groesse', 'zeiger')
CONFIRM = re.compile(r'^\s*(ja|yes|yep|jo|jap|ok|okay|sure|passt|stimmt|genau|richtig|sende|senden|schick|send|go ahead|do it|absenden)\b', re.I)
MARKER = ('Soll ich das so senden', 'Shall I send it like this')
GEPUFFERT = {'de': 'Ich habe gerade keine Verbindung. Ich schicke das an Robin, sobald ich wieder online bin.',
             'en': "I have no connection just now. I'll send it to Robin as soon as I'm back online."}


def log(*teile):
    print(time.strftime('%Y-%m-%d %H:%M:%S'), *teile, flush=True)


class Dienst:
    def __init__(self, args):
        self.args = args
        self.seite = os.path.realpath(args.seite)
        self.figuren = os.path.realpath(args.figuren)
        self.daten = os.path.realpath(args.daten)
        os.makedirs(self.daten, exist_ok=True)
        self.geraet = self.lies_json(args.geraet, geheim=True)
        self.konfig = self.lies_json(args.konfiguration)
        self.worker = self.geraet.get('worker', 'https://goch.robin.vision').rstrip('/')
        self.ssl = ssl.create_default_context()
        if self.worker.startswith('https://') and self.geraet.get('zertifikat'):
            self.ssl.load_cert_chain(self.geraet['zertifikat'], self.geraet.get('schluessel'))
        self.online = True
        self.radar = 'aus'
        self.puls = time.time()
        self.zuhoerer = []
        self.sperre = threading.Lock()
        self.puffer_datei = os.path.join(self.daten, 'puffer.jsonl')
        self.stopp = threading.Event()

    def lies_json(self, pfad, geheim=False):
        with open(pfad, encoding='utf-8') as f:
            daten = json.load(f)
        if geheim and os.name == 'posix' and os.stat(pfad).st_mode & (stat.S_IRWXG | stat.S_IRWXO):
            log('WARNUNG:', pfad, 'ist für andere lesbar – chmod 600, Besitzer der Dienstbenutzer.')
        return daten

    # ---------- Ereignisse an die Seite ----------
    def senden(self, ereignis):
        daten = json.dumps(ereignis, ensure_ascii=False)
        with self.sperre:
            for q in list(self.zuhoerer):
                q.put(daten)

    def netz(self, online):
        if online != self.online:
            self.online = online
            log('Netz', 'wieder da' if online else 'weg')
            self.senden({'typ': 'netz', 'online': online})

    # ---------- Worker ----------
    def worker_anfrage(self, methode, pfad, daten=None, typ='application/json', zeit=30):
        kopf = {'authorization': 'Bearer ' + self.geraet['token'], 'user-agent': 'goch-kiosk/' + VERSION}
        if daten is not None:
            kopf['content-type'] = typ
        req = urllib.request.Request(self.worker + pfad, data=daten, headers=kopf, method=methode)
        try:
            with urllib.request.urlopen(req, timeout=zeit, context=self.ssl if self.worker.startswith('https://') else None) as r:
                antwort = (r.status, r.headers.get('content-type', 'application/json'), r.read())
        except urllib.error.HTTPError as e:  # der Worker hat geantwortet – das Netz ist da
            antwort = (e.code, e.headers.get('content-type', 'application/json'), e.read())
        self.netz(True)
        return antwort

    # ---------- Puffer für Nachrichten an Robin (nur ohne Netz) ----------
    @staticmethod
    def ist_bestaetigung(body):
        msgs = [m for m in body.get('messages', []) if isinstance(m, dict)]
        return len(msgs) >= 2 and msgs[-1].get('role') == 'user' and CONFIRM.match(str(msgs[-1].get('content', ''))) \
            and msgs[-2].get('role') == 'assistant' and any(m in str(msgs[-2].get('content', '')) for m in MARKER)

    def puffern(self, body):
        eintrag = json.dumps({'at': time.time(), 'body': {**body, 'stimme': None}}, ensure_ascii=False) + '\n'
        with self.sperre:
            fd = os.open(self.puffer_datei, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(fd, 'a', encoding='utf-8') as f:
                f.write(eintrag)
        log('Nachricht an Robin gepuffert (ohne Netz)')

    def puffer_zahl(self):
        try:
            with open(self.puffer_datei, encoding='utf-8') as f:
                return sum(1 for z in f if z.strip())
        except FileNotFoundError:
            return 0

    def puffer_leeren(self):
        with self.sperre:
            try:
                with open(self.puffer_datei, encoding='utf-8') as f:
                    eintraege = [json.loads(z) for z in f if z.strip()]
            except FileNotFoundError:
                return
        offen = []
        for e in eintraege:
            if time.time() - e['at'] > 14 * 86400:
                log('Gepufferte Nachricht älter als 14 Tage verworfen')
                continue
            try:
                status, _, _ = self.worker_anfrage('POST', '/kiosk/chat', json.dumps(e['body']).encode())
                if status != 200:
                    offen.append(e)
                else:
                    log('Gepufferte Nachricht an Robin gesendet')
            except (urllib.error.URLError, OSError, TimeoutError):
                self.netz(False)
                offen.append(e)
        with self.sperre:
            if offen:
                fd = os.open(self.puffer_datei + '.neu', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(fd, 'w', encoding='utf-8') as f:
                    f.writelines(json.dumps(e, ensure_ascii=False) + '\n' for e in offen)
                os.replace(self.puffer_datei + '.neu', self.puffer_datei)
            elif os.path.exists(self.puffer_datei):
                os.remove(self.puffer_datei)

    # ---------- Hintergrund: Lebenszeichen, Puffer, Radar, systemd ----------
    def commit(self):
        try:
            return subprocess.run(['git', '-C', self.seite, 'rev-parse', 'HEAD'], capture_output=True, text=True, timeout=5).stdout.strip()[:40]
        except Exception:
            return ''

    def lebenszeichen(self):
        takt = self.args.lebenszeichen_takt
        commit = self.commit()
        while not self.stopp.is_set():
            try:
                daten = {'version': VERSION, 'commit': commit, 'figur': self.konfig.get('figur', 'goch'), 'online': True,
                         'radar': self.radar, 'puffer': self.puffer_zahl()}
                self.worker_anfrage('POST', '/kiosk/lebenszeichen', json.dumps(daten).encode(), zeit=15)
                if self.puffer_zahl():
                    self.puffer_leeren()
            except (urllib.error.URLError, OSError, TimeoutError):
                self.netz(False)
            self.stopp.wait(takt if self.online else min(takt, 30))

    def radar_lesen(self):
        r = self.konfig.get('radar') or {}
        port = r.get('port')
        if not port:
            return
        z = self.konfig.get('zwitschern') or {}
        von, bis = (z.get('entfernung_m') or [1, 3])
        anwesenheit = radar_ld2410.Anwesenheit(von, bis)

        def melden(bericht):
            ergebnis = anwesenheit.melden(bericht, time.monotonic())
            if ergebnis == 'anwesend':
                self.senden({'typ': 'anwesend', 'entfernung': bericht.abstand_m})
            elif ergebnis == 'abwesend':
                self.senden({'typ': 'abwesend'})
        while not self.stopp.is_set():
            try:
                self.radar = 'ok'
                radar_ld2410.lesen(port, melden, baud=r.get('baud', 256000), stopp=self.stopp)
            except ImportError:
                self.radar = 'fehler: pyserial fehlt'
                log('Radar: pyserial fehlt (apt install python3-serial)')
                return
            except Exception as e:  # Kabel gezogen o. Ä.: neu versuchen
                self.radar = 'fehler'
                log('Radar:', type(e).__name__)
                self.stopp.wait(5)

    def systemd(self, nachricht):
        adresse = os.environ.get('NOTIFY_SOCKET')
        if not adresse:
            return
        if adresse.startswith('@'):
            adresse = '\0' + adresse[1:]
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as s:
                s.connect(adresse)
                s.sendall(nachricht.encode())
        except OSError:
            pass

    def waechter(self):
        while not self.stopp.wait(20):
            self.systemd('WATCHDOG=1')

    def starten(self):
        for ziel in (self.lebenszeichen, self.radar_lesen, self.waechter):
            threading.Thread(target=ziel, daemon=True).start()
        server = ThreadingHTTPServer(('127.0.0.1', self.args.port), handler(self))
        server.daemon_threads = True
        log(f'Messegerät bereit: http://localhost:{self.args.port}/kiosk.html (Worker {self.worker})')
        self.systemd('READY=1')
        try:
            server.serve_forever()
        finally:
            self.stopp.set()


def handler(dienst):
    hosts = {f'localhost:{dienst.args.port}', f'127.0.0.1:{dienst.args.port}', f'[::1]:{dienst.args.port}'}

    class Handler(BaseHTTPRequestHandler):
        server_version = 'goch-kiosk'
        sys_version = ''

        def log_message(self, *args):  # keine Anfragen, keine Inhalte im Protokoll
            pass

        def antwort(self, status, daten, typ='application/json; charset=utf-8', extra=None):
            if isinstance(daten, (dict, list)):
                daten = json.dumps(daten, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', typ)
            self.send_header('Content-Length', str(len(daten)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(daten)

        def erlaubt(self):
            # Nur die eigene Seite: Host-Kopf prüfen (Schutz gegen DNS-Rebinding), keine CORS-Kopfzeilen
            if self.headers.get('Host') not in hosts:
                self.antwort(403, {'error': 'Nur localhost.'})
                return False
            return True

        def body(self):
            n = int(self.headers.get('Content-Length') or 0)
            if n > 2_000_000:
                raise ValueError('zu groß')
            return self.rfile.read(n)

        def datei(self, wurzel, rel):
            pfad = os.path.realpath(os.path.join(wurzel, rel))
            if not pfad.startswith(wurzel + os.sep) or not os.path.isfile(pfad):
                return self.antwort(404, {'error': 'Nicht gefunden.'})
            typ = mimetypes.guess_type(pfad)[0] or 'application/octet-stream'
            if pfad.endswith('.js'):
                typ = 'text/javascript; charset=utf-8'
            with open(pfad, 'rb') as f:
                self.antwort(200, f.read(), typ)

        def do_GET(self):
            if not self.erlaubt():
                return
            u = urllib.parse.urlparse(self.path)
            pfad = urllib.parse.unquote(u.path)
            if pfad == '/':
                return self.antwort(302, b'', extra={'Location': '/kiosk.html'})
            if SEITE.match(pfad.lstrip('/')):
                return self.datei(dienst.seite, pfad.lstrip('/'))
            m = re.match(r'^/figur/([a-z0-9-]{1,40})/(.+)$', pfad)
            if m:  # Figurenpaket: Goch aus der Website, Kundenfiguren nur vom Gerät
                fid, rel = m.groups()
                wurzel = os.path.join(dienst.figuren, fid) if os.path.isdir(os.path.join(dienst.figuren, fid)) else \
                    (os.path.join(dienst.seite, 'figuren', 'goch') if fid == 'goch' else None)
                return self.datei(os.path.realpath(wurzel), rel) if wurzel else self.antwort(404, {'error': 'Figur nicht auf dem Gerät.'})
            if pfad == '/kiosk/konfiguration':
                k = {key: dienst.konfig[key] for key in KONFIG_FUER_SEITE if key in dienst.konfig}
                k.setdefault('figur', 'goch')
                k['figurBasis'] = '/figur/' + k['figur'] + '/'
                return self.antwort(200, k)
            if pfad == '/kiosk/figur':
                fid = (urllib.parse.parse_qs(u.query).get('id') or [dienst.konfig.get('figur', 'goch')])[0]
                if not re.match(r'^[a-z0-9-]{1,40}$', fid):
                    return self.antwort(400, {'error': 'Ungültige Figur.'})
                cache = os.path.join(dienst.daten, 'figur-' + fid + '.json')
                try:
                    status, typ, daten = dienst.worker_anfrage('GET', '/kiosk/figur?id=' + fid, zeit=10)
                    if status == 200:
                        with open(cache, 'wb') as f:
                            f.write(daten)
                    return self.antwort(status, daten, typ)
                except (urllib.error.URLError, OSError, TimeoutError):
                    dienst.netz(False)
                    if os.path.exists(cache):
                        with open(cache, 'rb') as f:
                            return self.antwort(200, f.read())
                    return self.antwort(503, {'offline': True})
            if pfad == '/kiosk/offline':
                datei = os.path.join(dienst.daten, 'offline', dienst.konfig.get('figur', 'goch'), 'antworten.json')
                if os.path.exists(datei):
                    with open(datei, 'rb') as f:
                        return self.antwort(200, f.read())
                return self.antwort(200, {'antworten': []})
            m = re.match(r'^/kiosk/offline/([A-Za-z0-9._-]{1,80}\.(?:mp3|ogg|wav))$', pfad)
            if m:
                return self.datei(os.path.realpath(os.path.join(dienst.daten, 'offline', dienst.konfig.get('figur', 'goch'))), m.group(1))
            if pfad == '/kiosk/zustand':  # für den Wächter (waechter.sh)
                return self.antwort(200, {'puls_s': round(time.time() - dienst.puls), 'online': dienst.online, 'radar': dienst.radar, 'puffer': dienst.puffer_zahl()})
            if pfad == '/ereignisse':
                return self.ereignisse()
            self.antwort(404, {'error': 'Nicht gefunden.'})

        def ereignisse(self):
            q = queue.Queue()
            with dienst.sperre:
                dienst.zuhoerer.append(q)
            try:
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(('data: ' + json.dumps({'typ': 'netz', 'online': dienst.online}) + '\n\n').encode())
                self.wfile.flush()
                while not dienst.stopp.is_set():
                    try:
                        self.wfile.write(('data: ' + q.get(timeout=15) + '\n\n').encode())
                    except queue.Empty:
                        self.wfile.write(b': still da\n\n')
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                with dienst.sperre:
                    dienst.zuhoerer.remove(q)

        def do_POST(self):
            if not self.erlaubt():
                return
            pfad = urllib.parse.urlparse(self.path).path
            try:
                daten = self.body()
            except ValueError:
                return self.antwort(413, {'error': 'Zu groß.'})
            if pfad == '/kiosk/puls':
                dienst.puls = time.time()
                return self.antwort(200, {'ok': True})
            if pfad in ('/kiosk/chat', '/kiosk/listen'):
                query = urllib.parse.urlparse(self.path).query
                typ = self.headers.get('Content-Type', 'application/json')
                try:
                    status, rtyp, antwort = dienst.worker_anfrage('POST', pfad + ('?' + query if query else ''), daten, typ)
                    return self.antwort(status, antwort, rtyp)
                except (urllib.error.URLError, OSError, TimeoutError):
                    dienst.netz(False)
                    if pfad == '/kiosk/chat':
                        try:
                            body = json.loads(daten or b'{}')
                        except ValueError:
                            body = {}
                        if Dienst.ist_bestaetigung(body):
                            dienst.puffern(body)
                            return self.antwort(200, {'reply': GEPUFFERT['en' if body.get('lang') == 'en' else 'de'], 'action': None, 'gepuffert': True})
                    return self.antwort(503, {'offline': True})
            if dienst.args.test and pfad == '/kiosk/test/radar':
                b = json.loads(daten or b'{}')
                if 'rahmen' in b:  # Rohdaten wie vom Sensor (Hex) durch Rahmenleser und Anwesenheit
                    leser = getattr(dienst, '_testleser', None) or radar_ld2410.Rahmenleser()
                    dienst._testleser = leser
                    an = getattr(dienst, '_testanwesenheit', None) or radar_ld2410.Anwesenheit(*((dienst.konfig.get('zwitschern') or {}).get('entfernung_m') or [1, 3]), halten_s=0)
                    dienst._testanwesenheit = an
                    for bericht in leser.fuettern(bytes.fromhex(b['rahmen'])):
                        e = an.melden(bericht, time.monotonic())
                        if e == 'anwesend':
                            dienst.senden({'typ': 'anwesend', 'entfernung': bericht.abstand_m})
                        elif e == 'abwesend':
                            dienst.senden({'typ': 'abwesend'})
                else:
                    dienst.senden({'typ': 'anwesend', 'entfernung': b.get('entfernung')})
                return self.antwort(200, {'ok': True})
            if dienst.args.test and pfad == '/kiosk/test/netz':
                dienst.netz(bool(json.loads(daten or b'{}').get('online')))
                return self.antwort(200, {'ok': True})
            self.antwort(404, {'error': 'Nicht gefunden.'})

    return Handler


def main():
    p = argparse.ArgumentParser(description='Lokaler Dienst des Messegeräts (Goch, robin.vision)')
    p.add_argument('--seite', required=True, help='Website-Checkout (fester Commit)')
    p.add_argument('--figuren', required=True, help='Figurenpakete auf dem Gerät (Kundenfiguren)')
    p.add_argument('--daten', required=True, help='Puffer, Zwischenspeicher, Offline-Antworten')
    p.add_argument('--geraet', required=True, help='Gerätenachweis (JSON, chmod 600)')
    p.add_argument('--konfiguration', required=True, help='Gerätekonfiguration (JSON)')
    p.add_argument('--port', type=int, default=8080)
    p.add_argument('--lebenszeichen-takt', type=float, default=300)
    p.add_argument('--test', action='store_true')
    Dienst(p.parse_args()).starten()


if __name__ == '__main__':
    main()
