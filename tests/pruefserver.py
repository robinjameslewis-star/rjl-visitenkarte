"""Prüfserver für die Browser-Tests: liefert den Projektordner aus wie `python3 -m http.server`, nimmt aber viele Verbindungen
auf einmal an. Der einfache Server hat eine Warteschlange von 5; lädt eine Seite 15 Dateien zugleich, gehen einzelne Anfragen
verloren, und Tests schlagen zufällig fehl (ein Bild oder ein Skript fehlt). Aufruf im Projektordner:
    python3 tests/pruefserver.py 8788"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Server(ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True

class Leise(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    Server(('127.0.0.1', port), Leise).serve_forever()
