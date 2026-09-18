"""Attrappe des Goch-Workers für Tests ohne Cloudflare: antwortet auf POST /chat wie der echte
Worker, aber mit festen Texten. Nachrichten an Robin werden nicht versendet, sondern gezählt.

Aufruf:  python3 tests/goch_fake_worker.py [Port, Standard 8787]
Seite:   http://localhost:8788/?goch=http://localhost:8787/chat
Prüfen:  GET /_sent liefert die „versendeten“ Nachrichten als JSON, GET /_last die letzte Anfrage."""
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
SENT = []
LAST = {}  # zuletzt empfangener Anfragekörper, für Tests des Verlaufs

REPLIES = {
    'de': {
        'work': "Robin lernt gerade für die Abschlussprüfung zum Steuerfachangestellten, schriftlich Ende November. Daneben bekommt diese Seite eine Landschaft, und er baut kleine Werkzeuge für seinen Mac.",
        'who': "Robin James Lewis lebt in Balingen am Fuß der Schwäbischen Alb, mit walisischen Wurzeln. Er wird Steuerfachangestellter und arbeitet daran, Verwaltung mit Software leichter zu machen. Sein Leitsatz: Glücklich sind die Friedensstifter, sie sind Kinder Gottes.",
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
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status); self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        if self.path == '/_sent': return self.reply(SENT)
        if self.path == '/_last': return self.reply(LAST)
        if self.path == '/':
            self.send_response(200); self.cors(); self.send_header('Content-Type', 'text/plain'); self.end_headers(); self.wfile.write(b'Goch'); return
        self.reply({'error': 'Nicht gefunden.'}, 404)

    def do_POST(self):
        if self.path != '/chat': return self.reply({'error': 'Nicht gefunden.'}, 404)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or b'{}'))
        except Exception:
            return self.reply({'error': 'Ungültige Anfrage.'}, 400)
        global LAST; LAST = body
        lang = 'en' if body.get('lang') == 'en' else 'de'
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
    print(f'Goch-Attrappe auf http://localhost:{PORT}/chat')
    HTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
