"""Attrappe des Goch-Workers für Tests ohne Cloudflare: antwortet auf POST /chat wie der echte
Worker, aber mit festen Texten. Nachrichten an Robin werden nicht versendet, sondern gezählt.

Aufruf:  python3 tests/goch_fake_worker.py [Port, Standard 8787]
Seite:   http://localhost:8788/?goch=http://localhost:8787/chat
Prüfen:  GET /_sent liefert die „versendeten“ Nachrichten als JSON, GET /_last die letzte Anfrage.
Sprechender Goch (23.10.2026): POST /listen nimmt ein WAV und liefert einen festen Text; /chat mit „stimme“ antwortet als
NDJSON mit einem kurzen WAV-Ton als Stimme (KI-Hinweis bei „erste“). GET /_modus?stimme=ok|grenze|fehler&hoeren=ok|grenze|aus
stellt das Verhalten um, GET /_listen und /_chats liefern, was ankam.
Messegerät: /kiosk/chat, /kiosk/listen, /kiosk/figur und /kiosk/lebenszeichen wie der Worker; GET /_auth liefert die
Authorization-Kopfzeilen, die ankamen (der lokale Dienst muss den Gerätenachweis mitschicken).

Echte Spracherkennung für Vorführungen am Mac (optional, 23.10.2026):
    python3 tests/goch_fake_worker.py 8787 --whisper <Ordner eines faster-whisper-Modells, z. B. „base“>
Braucht `pip install faster-whisper numpy`; das Modell lädt `python3 -c "from faster_whisper import download_model;
download_model('base', output_dir='…/base')"` (rund 145 MB). Erkannt wird lokal auf dem Mac, nichts verlässt den Rechner.
Die Antworten bleiben die festen Texte der Attrappe; echte Antworten gibt es nur mit dem Worker.

Stimme für Vorführungen (optional): `--stimme mac` vertont die Antworten serverseitig mit einer macOS-Stimme (Markus oder
Yannick in Premium, wenn geladen, sonst Reed; englisch Daniel) – jeder Besucher hört dieselbe Stimme, der Schnabel folgt
ihr. Nur ein Platzhalter, nicht die Stimme von Goch. `--stimme elevenlabs` nimmt die echte Stimme mit den Einstellungen aus
figur.json; Schlüssel und Voice ID nur aus der Umgebung (ELEVENLABS_API_KEY, GOCH_VOICE_ID), nie als Argument.
Ohne --stimme: kurzer Sinuston (Tests)."""
import base64, io, json, math, os, re, struct, subprocess, sys, tempfile, threading, time, urllib.parse, urllib.request, wave
from http.server import BaseHTTPRequestHandler, HTTPServer

ARGS = [a for a in sys.argv[1:]]
WHISPER = ARGS[ARGS.index('--whisper') + 1] if '--whisper' in ARGS else os.environ.get('GOCH_WHISPER', '')
STIMME = ARGS[ARGS.index('--stimme') + 1] if '--stimme' in ARGS else os.environ.get('GOCH_STIMME', '')
PORT = int(next((a for a in ARGS if a.isdigit()), 8787))
_modell, _sperre = None, threading.Lock()
KONTEXT = {'de': 'Gespräch mit Goch, dem Rotkehlchen von Robin. robin.vision, SmartFormular, FiBu lite, Workshops, Buchungsstapel, DATEV.',
           'en': "A conversation with Goch, Robin's robin. robin.vision, SmartFormular, FiBu lite, workshops, booking batch, DATEV."}
ERFUNDEN = re.compile(r'^(?:untertitel(?:ung)?\b.*|vielen dank(?:,)? fürs zuschauen.*|thanks? (?:you )?for watching.*|\W*(?:musik|music)\W*|\.+)$', re.I)

def erkennen(daten, lang):
    """WAV (16 Bit, mono) lokal mit faster-whisper in Text umwandeln – wie Whisper large-v3-turbo beim Worker, nur kleiner."""
    global _modell
    import numpy as np
    from faster_whisper import WhisperModel
    with _sperre:
        if _modell is None:
            _modell = WhisperModel(WHISPER, device='cpu', compute_type='int8')
        with wave.open(io.BytesIO(daten)) as w:
            if w.getsampwidth() != 2 or w.getnchannels() != 1 or w.getframerate() != 16000:
                return None
            audio = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
        segmente, _ = _modell.transcribe(audio, language=lang, vad_filter=True, beam_size=1, condition_on_previous_text=False, initial_prompt=KONTEXT[lang])
        text = ' '.join(s.text.strip() for s in segmente).strip()
    return '' if ERFUNDEN.match(text) else text[:600]
MAC_VORZUG = ['Markus', 'Yannick', 'Martin', 'Reed']  # warme Männerstimmen; englisch nur Daniel (britisch)
_mac = {}

def mac_stimme(lang):
    """Beste installierte Stimme (`say -v ?`): Premium vor Erweitert vor einfach, je Sprache einmal ermittelt."""
    if lang not in _mac:
        liste = subprocess.run(['say', '-v', '?'], capture_output=True, text=True).stdout
        stimmen = [(m.group(1).strip(), m.group(2)) for m in (re.match(r'^(.*?)\s+([a-z]{2}_[A-Z]{2})\s+#', z) for z in liste.splitlines()) if m]
        stimmen = [n for n, loc in stimmen if loc == ('en_GB' if lang == 'en' else 'de_DE')]
        guete = lambda n: 0 if 'Premium' in n else 1 if re.search('Erweitert|Enhanced', n) else 2
        _mac[lang] = next((sorted(t, key=guete)[0] for basis in (['Daniel'] if lang == 'en' else MAC_VORZUG)
                           for t in [[n for n in stimmen if n == basis or n.startswith(basis + ' (')]] if t), None)
    return _mac[lang]

def vertonen(text, lang):
    """Antwort als Stimme: (mime, base64) oder None. Ohne --stimme der Sinuston der Tests."""
    if STIMME == 'mac':
        name = mac_stimme(lang)
        if not name: return None
        with tempfile.TemporaryDirectory() as tmp:
            ziel = os.path.join(tmp, 'antwort.wav')
            r = subprocess.run(['say', '-v', name, '-r', '170', '--file-format=WAVE', '--data-format=LEI16@22050', '-o', ziel, text], capture_output=True)
            if r.returncode or not os.path.exists(ziel): return None
            return 'audio/wav', base64.b64encode(open(ziel, 'rb').read()).decode()
    if STIMME == 'elevenlabs':
        schluessel, voice = os.environ.get('ELEVENLABS_API_KEY', ''), os.environ.get('GOCH_VOICE_ID', '')
        if not schluessel or not voice: return None
        cfg = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'figuren', 'goch', 'figur.json'))).get('stimme', {})
        modell = os.environ.get('GOCH_TTS_MODELL') or cfg.get('modell') or 'eleven_v4'
        e = cfg.get('einstellungen', {})
        regler = {k: e[k] for k in ('stability', 'similarity_boost') if k in e} if re.match(r'eleven_v[34]', modell) else e
        daten = {'text': text, 'model_id': modell, 'voice_settings': regler, **({'seed': cfg['seed']} if isinstance(cfg.get('seed'), int) else {})}
        anfrage = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(voice)}?output_format=mp3_44100_64',
                                         data=json.dumps(daten).encode(), method='POST',
                                         headers={'xi-api-key': schluessel, 'content-type': 'application/json', 'accept': 'audio/mpeg'})
        try:
            with urllib.request.urlopen(anfrage, timeout=30) as r: return 'audio/mpeg', base64.b64encode(r.read()).decode()
        except Exception as fehler:
            print('ElevenLabs:', str(fehler)[:200], flush=True); return None
    return 'audio/wav', TON

SENT = []
CONTACT = []  # über das Formular „versendete“ Nachrichten
LAST = {}  # zuletzt empfangener Anfragekörper, für Tests des Verlaufs
CHATS = []  # alle Anfragekörper an /chat (Sprechender Goch: gesprochen, stimme, figur)
LISTEN = []  # was an /listen ankam: Größe, Kopf, Sprache, Inhaltstyp
MODUS = {'stimme': 'ok', 'hoeren': 'ok'}
AUTH = []  # Authorization der Kiosk-Anfragen
LEBENSZEICHEN = []
KUNDE = {'id': 'kunde-test', 'sprachen': ['de', 'en'], 'name': {'de': 'Muster', 'en': 'Muster'}, 'rolle': {'de': 'der Empfang der Muster GmbH', 'en': 'the Muster Ltd front desk'},
         'begruessung': {'de': 'Willkommen bei der Muster GmbH.', 'en': 'Welcome to Muster Ltd.'}, 'fragen': {'de': ['Was bieten Sie an?'], 'en': ['What do you offer?']}}
GRUSS = {'de': {'angekommen': 'Hallo! Schön, dass Sie vorbeischauen. Fragen Sie mich gern, woran Robin gerade arbeitet.', 'zurueck': 'Da sind Sie wieder! Wo waren wir stehen geblieben?'},
         'en': {'angekommen': "Hello! Nice of you to drop by. Feel free to ask me what Robin is working on.", 'zurueck': 'There you are again! Where were we?'}}
KI = {'de': 'Kurz vorab: Ich bin eine KI, und meine Stimme ist künstlich erzeugt. ', 'en': "Just so you know: I'm an AI, and my voice is artificially generated. "}

def ton(sekunden=0.6, hz=440):
    """Kurzer Sinuston als WAV – steht in den Tests für die Stimme (MP3 wäre für headless Chrome gleichwertig)."""
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(b''.join(struct.pack('<h', int(9000 * math.sin(2 * math.pi * hz * i / 16000))) for i in range(int(16000 * sekunden))))
    return base64.b64encode(buf.getvalue()).decode()
TON = ton()

REPLIES = {
    'de': {
        'zeigen': "Hier unten sehen Sie Robins Werkzeuge – vom SmartFormular bis zur Deklaration.",
        'work': "Robin lernt gerade für die Abschlussprüfung zum Steuerfachangestellten, schriftlich Ende November. Daneben bekommt diese Seite eine Landschaft, und er baut kleine Werkzeuge für seinen Mac.",
        'who': "Robin James Lewis lebt in Balingen am Fuß der Schwäbischen Alb, mit walisischen Wurzeln. Er wird Steuerfachangestellter und arbeitet daran, Verwaltung mit Software leichter zu machen. Sein Leitsatz: Selig sind die Friedensstifter, sie werden Kinder Gottes heißen.",
        'message': "Gern. Was soll ich Robin ausrichten – und wie heißt du, und unter welcher E-Mail-Adresse kann er dir antworten?",
        'confirm': "Ich richte Robin aus: {text} Von: {name}, {email}. Soll ich das so senden?",
        'sent': "Ausgerichtet. Robin antwortet dir persönlich per E-Mail an {email}.",
        'more': "Gern. Robin macht selbst Musik – am Synthesizer, House, Techno, Neo-Jazz – und er hat Kulturvereine in Balingen mitgegründet. Was möchtest du wissen?",
        'askmsg': "Gut, dann frage ich ihn. Wie heißt du, und unter welcher E-Mail-Adresse kann Robin dir persönlich antworten?",
        'calendar': "Ein Gespräch dauert 30 Minuten, per Video, Telefon oder in Balingen. Buchen kannst du hier:",
        'contact': "Robin erreichst du per E-Mail:",
        'music': "Selbst am Synthesizer: House, Techno, Neo-Jazz. Und er hört viel – gerade das hier.",
        'tax': "Steuerliche Beratung darf Robin nicht erteilen – das ist Steuerberatern vorbehalten, und er ist in Ausbildung. Ich auch nicht. Wenn du ein Gespräch möchtest, richte ich es gern aus.",
        'unknown': "Das weiß ich nicht. Soll ich Robin fragen?",
    },
    'en': {
        'zeigen': "Down here you can see Robin's tools – from SmartFormular to the declaration.",
        'work': "Robin is preparing for his final exam as a certified tax clerk, written papers in late November. This page is getting a landscape, and he builds small tools for his Mac.",
        'who': "Robin James Lewis lives in Balingen at the foot of the Swabian Alb, with Welsh roots. He is qualifying as a certified tax clerk and works on making administration lighter through software.",
        'message': "Gladly. What should I pass on to Robin – and what's your name and the email address he can reply to?",
        'confirm': "I'll pass on to Robin: {text} From: {name}, {email}. Shall I send it like this?",
        'sent': "Passed on. Robin will reply to you personally by email at {email}.",
        'more': "Gladly. Robin makes music himself – synthesizers, house, techno, neo-jazz – and co-founded cultural associations in Balingen. What would you like to know?",
        'askmsg': "Good, I'll ask him. What's your name, and which email address can Robin reply to?",
        'calendar': "A conversation takes 30 minutes, by video, phone or in Balingen. You can book here:",
        'contact': "You can reach Robin by email:",
        'music': "He plays synthesizer: house, techno, neo-jazz. And he listens a lot – this one right now.",
        'tax': "Robin cannot give tax advice – that is reserved for licensed tax advisers, and he is still in training. Neither can I.",
        'unknown': "I don't know that. Shall I ask Robin?",
    },
}

class Handler(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin') or '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def reply(self, obj, status=200):
        stimme = getattr(self, 'stimme', None)
        if stimme and status == 200 and isinstance(obj.get('reply'), str):  # Antwort mit Stimme: NDJSON wie der Worker
            if isinstance(stimme, dict) and stimme.get('erste'): obj = {**obj, 'reply': KI[self.lang] + obj['reply']}
            if MODUS['stimme'] == 'ok':
                t0 = time.time(); v = vertonen(obj['reply'], self.lang)
                zweite = {'stimme': {'mime': v[0], 'daten': v[1], 'zeichen': len(obj['reply']), 'ms': round((time.time() - t0) * 1000)}} if v \
                    else {'stimme': None, 'grund': 'fehler'}
            else: zweite = {'stimme': None, 'grund': MODUS['stimme']}
            body = (json.dumps({**obj, 'ki': True}, ensure_ascii=False) + '\n' + json.dumps(zweite) + '\n').encode()
            self.send_response(200); self.cors()
            self.send_header('Content-Type', 'application/x-ndjson; charset=utf-8')
            self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
            return
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status); self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        if self.path == '/_sent': return self.reply(SENT)
        if self.path == '/_last': return self.reply(LAST)
        if self.path == '/_contact': return self.reply(CONTACT)
        if self.path == '/_listen': return self.reply(LISTEN)
        if self.path == '/_chats': return self.reply(CHATS)
        if self.path == '/_auth': return self.reply(AUTH)
        if self.path == '/_lebenszeichen': return self.reply(LEBENSZEICHEN)
        if self.path.startswith('/kiosk/figur'):
            AUTH.append(self.headers.get('Authorization', ''))
            fid = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('id', ['goch'])[0]
            return self.reply(KUNDE if fid == 'kunde-test' else {'id': 'goch', 'texte': 'language.js'})
        if self.path.startswith('/_modus'):
            for k, v in urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query): MODUS[k] = v
            return self.reply(MODUS)
        if self.path == '/':
            self.send_response(200); self.cors(); self.send_header('Content-Type', 'text/plain'); self.end_headers(); self.wfile.write(b'Goch'); return
        self.reply({'error': 'Nicht gefunden.'}, 404)

    def do_POST(self):
        if self.path.startswith('/kiosk/'):  # Messegerät: wie /chat und /listen, Nachweis merken
            AUTH.append(self.headers.get('Authorization', ''))
            if self.path == '/kiosk/lebenszeichen':
                LEBENSZEICHEN.append(json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}'))
                return self.reply({'ok': True})
            self.path = self.path[len('/kiosk'):]
        if self.path == '/contact':  # Kontaktformular: prüfen wie der echte Worker, nur ohne Zeitprüfung und Versand
            try:
                body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or b'{}'))
            except Exception:
                return self.reply({'error': 'Ungültige Anfrage.'}, 400)
            if body.get('website'): return self.reply({'ok': True})
            if len(body.get('name', '')) < 2 or '@' not in body.get('email', '') or len(body.get('message', '')) < 10:
                return self.reply({'error': 'Bitte Name, eine gültige E-Mail-Adresse und eine Nachricht angeben.'}, 400)
            CONTACT.append({k: body.get(k, '') for k in ('name', 'email', 'phone', 'message', 'lang')})
            return self.reply({'ok': True})
        if self.path.startswith('/listen'):  # Spracheingabe: WAV prüfen, festen Text liefern
            data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            lang = 'en' if 'lang=en' in self.path else 'de'
            LISTEN.append({'bytes': len(data), 'kopf': data[:4].decode('latin1'), 'wave': data[8:12].decode('latin1'), 'lang': lang,
                           'typ': self.headers.get('Content-Type', ''), 'rate': struct.unpack('<I', data[24:28])[0] if len(data) >= 28 else 0})
            if MODUS['hoeren'] == 'aus': return self.reply({'error': 'Spracheingabe ist zurzeit ausgeschaltet.'}, 503)
            if MODUS['hoeren'] == 'grenze': return self.reply({'text': '', 'grenze': True})
            if data[:4] != b'RIFF' or data[8:12] != b'WAVE': return self.reply({'error': 'Bitte als WAV senden.'}, 415)
            if WHISPER:  # Vorführung: echte Erkennung auf dem Mac
                start = time.time()
                try:
                    text = erkennen(data, lang)
                except Exception as e:
                    print('Whisper:', type(e).__name__, e, flush=True)
                    return self.reply({'error': 'Ich habe Sie gerade nicht verstanden. Bitte tippen Sie Ihre Frage.'}, 502)
                if text is None: return self.reply({'error': 'Bitte als WAV (16 kHz, mono) senden.'}, 415)
                return self.reply({'text': text, 'sekunden': round((len(data) - 44) / 32000, 1), 'ms': round((time.time() - start) * 1000), 'lokal': True})
            return self.reply({'text': 'What is Robin working on?' if lang == 'en' else 'Woran arbeitet Robin gerade?', 'sekunden': round((len(data) - 44) / 32000, 1)})
        if self.path != '/chat': return self.reply({'error': 'Nicht gefunden.'}, 404)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or b'{}'))
        except Exception:
            return self.reply({'error': 'Ungültige Anfrage.'}, 400)
        global LAST; LAST = body
        CHATS.append(body)
        lang = 'en' if body.get('lang') == 'en' else 'de'
        self.stimme, self.lang = body.get('stimme'), lang
        if body.get('anlass') in ('angekommen', 'zurueck'):  # Blickkontakt: Goch spricht an, fester Satz wie beim Worker
            return self.reply({'reply': GRUSS[lang][body['anlass']], 'action': None, 'anlass': body['anlass']})
        T = REPLIES[lang]
        msgs = [m for m in body.get('messages', []) if m.get('role') in ('user', 'assistant')]
        if not msgs or msgs[-1]['role'] != 'user': return self.reply({'error': 'Keine Frage erhalten.'}, 400)
        last = msgs[-1]['content'].strip()
        low = last.lower()
        if low.startswith('fehler'):  # Testhaken: Serverfehler erzwingen
            return self.reply({'error': 'kaputt'}, 500)
        # Nachricht an Robin: "name: …, email: …, text: …" → Zusammenfassung; "ja"/"yes" danach → gesendet
        if low in ('ja', 'ja.', 'yes', 'yes.') and len(msgs) >= 2 and ('Soll ich das so senden' in msgs[-2]['content'] or 'Shall I send' in msgs[-2]['content']):
            prev = [m for m in msgs if m['role'] == 'user'][-2]['content']
            fields = dict(p.split(':', 1) for p in prev.split(',') if ':' in p)
            m = {k.strip().lower(): v.strip() for k, v in fields.items()}
            SENT.append(m)
            return self.reply({'reply': T['sent'].format(email=m.get('email', '')), 'action': 'message', 'sent': True})
        if low in ('ja', 'ja.', 'yes', 'yes.') and len(msgs) >= 2 and ('Soll ich Robin fragen' in msgs[-2]['content'] or 'Shall I ask Robin' in msgs[-2]['content']):
            return self.reply({'reply': T['askmsg'], 'action': None})
        if ('zeig' in low or 'show' in low) and body.get('kannZeigen'):  # Sprachmodus: Goch zeigt eine Stelle der Seite
            return self.reply({'reply': T['zeigen'], 'action': None, 'zeigen': 'werkzeuge'})
        if 'mehr' in low or 'more' in low: return self.reply({'reply': T['more'], 'action': None})
        if 'name:' in low and 'email:' in low:
            fields = dict(p.split(':', 1) for p in last.split(',') if ':' in p)
            m = {k.strip().lower(): v.strip() for k, v in fields.items()}
            return self.reply({'reply': T['confirm'].format(text=m.get('text', ''), name=m.get('name', ''), email=m.get('email', '')), 'action': None})
        if 'ausrichten' in low or 'message' in low: return self.reply({'reply': T['message'], 'action': None})
        if 'musik' in low or 'music' in low:  # Link aus links.md: einmal je Gespräch, danach nur Text
            label = 'Testlied bei YouTube' if lang == 'de' else 'Test song on YouTube'
            offered = any(m['role'] == 'assistant' and '(Link: ' + label + ')' in m['content'] for m in msgs)
            return self.reply({'reply': T['music'], 'action': None, 'link': None if offered else {'label': label, 'url': 'https://www.youtube.com/watch?v=test'}})
        if 'woran' in low or 'working' in low: return self.reply({'reply': T['work'], 'action': None})
        if 'wer ist' in low or 'who is' in low: return self.reply({'reply': T['who'], 'action': None})
        if 'termin' in low or 'appointment' in low or 'gespräch' in low: return self.reply({'reply': T['calendar'], 'action': 'calendar'})
        if 'e-mail' in low or 'email' in low or 'kontakt' in low: return self.reply({'reply': T['contact'], 'action': 'contact'})
        if 'steuer' in low or 'tax' in low: return self.reply({'reply': T['tax'], 'action': None})
        return self.reply({'reply': T['unknown'], 'action': None})

    def log_message(self, *args): pass

if __name__ == '__main__':
    stimme = {'mac': lambda: f'macOS-Stimme {mac_stimme("de")} / {mac_stimme("en")}', 'elevenlabs': lambda: 'ElevenLabs' + ('' if os.environ.get('ELEVENLABS_API_KEY') and os.environ.get('GOCH_VOICE_ID') else ' (ELEVENLABS_API_KEY oder GOCH_VOICE_ID fehlt – nur Text)')}.get(STIMME, lambda: 'Sinuston')()
    print(f'Goch-Attrappe auf http://localhost:{PORT}/chat' + (f' – Spracherkennung lokal mit {WHISPER}' if WHISPER else '') + f' – Stimme: {stimme}', flush=True)
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
