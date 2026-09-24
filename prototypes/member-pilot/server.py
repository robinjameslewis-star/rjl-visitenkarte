"""Local-only synthetic-data demo. No login, durable storage or external AI calls."""
from __future__ import annotations

import argparse
import base64
import binascii
import hmac
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from intake import DemoStore, IntakeError, MAX_PDF_BYTES

BASE_DIR = Path(__file__).resolve().parent
MAX_JSON_BYTES = ((MAX_PDF_BYTES + 2) // 3) * 4 + 16_384


def load_store(base_dir=BASE_DIR):
    schema = json.loads((base_dir / "questionnaire-schema.json").read_text(encoding="utf-8"))
    profile = json.loads((base_dir / "demo-profile.json").read_text(encoding="utf-8"))
    return DemoStore(schema, profile)


def static_files(base_dir):
    files = {"/": base_dir / "index.html", "/index.html": base_dir / "index.html"}
    for name in ("app.js", "styles.css", "questionnaire-schema.json"):
        files["/" + name] = base_dir / name
    for route, path in list(files.items()):
        files["/prototypes/member-pilot" + route] = path
    repo = base_dir.parents[1]
    for name in ("signatur-rotkehlchen.png", "favicon-32.png", "apple-touch-icon.png",
                 "fonts/eb-garamond-latin.woff2", "papier.jpg", "favicon.ico"):
        files["/assets/" + name] = repo / "assets" / name
    for language in ("de", "en"):
        name = f"pilot-questionnaire-{language}.pdf"
        files["/downloads/" + name] = base_dir / "downloads" / name
    return files


class DemoHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, port=8765, store=None, base_dir=BASE_DIR):
        self.store = store or load_store(base_dir)
        self.static = static_files(base_dir)
        super().__init__(("127.0.0.1", port), Handler)


class Handler(BaseHTTPRequestHandler):
    server_version = "RobinVisionLocalDemo/1"

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, _format, *_args):
        # Avoid logging questionnaire text, filenames or URLs from uploaded material.
        pass

    def _reply(self, status, body=b"", content_type="application/json; charset=utf-8", head=False):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def _json(self, status, payload, head=False):
        self._reply(status, json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8"), head=head)

    def _check_site(self, post=False):
        port = self.server.server_address[1]
        allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        hosts = self.headers.get_all("Host", [])
        if len(hosts) != 1 or hosts[0].lower() not in allowed_hosts:
            raise IntakeError("invalid_host", "Dieser Prototyp ist nur über den lokalen Demo-Host erreichbar.", 403)
        origins = self.headers.get_all("Origin", [])
        if origins and (len(origins) != 1 or origins[0] != "http://" + hosts[0].lower()):
            raise IntakeError("invalid_origin", "Die Anfrage stammt nicht von dieser lokalen Demo.", 403)
        if post:
            tokens = self.headers.get_all("X-Demo-Token", [])
            if len(tokens) != 1 or not hmac.compare_digest(tokens[0], self.server.store.csrf_token):
                raise IntakeError("demo_token_required", "Bitte die Demo neu laden; der lokale Prüftoken fehlt oder ist ungültig.", 403)

    def _read_json(self):
        if self.headers.get("Transfer-Encoding") or self.headers.get("Content-Encoding"):
            raise IntakeError("unsupported_encoding", "Komprimierte oder gestückelte Anfragen werden nicht unterstützt.", 415)
        if self.headers.get_content_type() != "application/json":
            raise IntakeError("json_required", "Bitte JSON übermitteln.", 415)
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1:
            raise IntakeError("length_required", "Eine eindeutige Inhaltslänge wird benötigt.", 411)
        try:
            length = int(lengths[0])
        except ValueError as exc:
            raise IntakeError("invalid_length", "Die Inhaltslänge ist ungültig.") from exc
        if length < 0 or length > MAX_JSON_BYTES:
            raise IntakeError("request_too_large", "Die Anfrage ist zu groß.", 413)
        raw = self.rfile.read(length)
        if len(raw) != length:
            raise IntakeError("incomplete_request", "Die Anfrage wurde nicht vollständig übertragen.")
        try:
            def reject_constant(_value):
                raise ValueError("Non-finite JSON number")
            def unique_keys(pairs):
                result = {}
                for key, value in pairs:
                    if key in result:
                        raise ValueError("Duplicate JSON key")
                    result[key] = value
                return result
            payload = json.loads(raw.decode("utf-8"), parse_constant=reject_constant, object_pairs_hook=unique_keys)
        except (UnicodeError, ValueError, RecursionError) as exc:
            raise IntakeError("invalid_json", "Die Anfrage enthält kein gültiges, eindeutiges JSON.") from exc
        if not isinstance(payload, dict):
            raise IntakeError("invalid_json", "Die Anfrage muss ein JSON-Objekt sein.")
        return payload

    def do_GET(self):
        self._get()

    def do_HEAD(self):
        self._get(head=True)

    def _get(self, head=False):
        try:
            self._check_site()
            path = urlsplit(self.path).path
            if path == "/api/state":
                return self._json(200, self.server.store.state(), head)
            if path == "/api/questionnaire":
                return self._json(200, self.server.store.schema, head)
            asset = self.server.static.get(path)
            if asset is None or not asset.is_file():
                raise IntakeError("not_found", "Dieser lokale Inhalt wurde nicht gefunden.", 404)
            kind = mimetypes.guess_type(asset.name)[0] or "application/octet-stream"
            if kind.startswith("text/") or kind in ("application/javascript", "application/json"):
                kind += "; charset=utf-8"
            return self._reply(200, asset.read_bytes(), kind, head)
        except IntakeError as exc:
            self._json(exc.status, exc.as_dict(), head)

    def do_POST(self):
        try:
            self._check_site(post=True)
            path = urlsplit(self.path).path
            if path not in ("/api/import", "/api/intake", "/api/publish"):
                raise IntakeError("not_found", "Dieser lokale API-Endpunkt wurde nicht gefunden.", 404)
            payload = self._read_json()
            if path == "/api/import":
                encoded = payload.get("pdfBase64")
                if not isinstance(encoded, str) or len(encoded) > ((MAX_PDF_BYTES + 2) // 3) * 4:
                    raise IntakeError("invalid_pdf_data", "Bitte eine PDF bis höchstens 2 MB übermitteln.", 413)
                try:
                    data = base64.b64decode(encoded, validate=True)
                except (ValueError, binascii.Error) as exc:
                    raise IntakeError("invalid_base64", "Die PDF-Übertragung ist nicht gültig kodiert.") from exc
                draft = self.server.store.import_pdf(data, payload.get("filename", ""))
                return self._json(200, {"draft": draft})
            if path == "/api/intake":
                draft = self.server.store.online_intake(payload.get("fields"), payload.get("mode"), payload.get("language", "de"))
                return self._json(200, {"draft": draft})
            profile = self.server.store.publish(payload)
            return self._json(200, {"profile": profile, "draft": None})
        except IntakeError as exc:
            self._json(exc.status, exc.as_dict())
        except (TimeoutError, ConnectionError):
            self.close_connection = True


def main():
    parser = argparse.ArgumentParser(description="Lokale Demo: nur synthetische Daten; kein Login und keine Persistenz.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("RV_PILOT_PORT", "8765")))
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    server = DemoHTTPServer(args.port)
    print(f"Synthetische lokale Demo: http://127.0.0.1:{args.port}/prototypes/member-pilot/", flush=True)
    print("Keine Anmeldung oder echte Rollenprüfung. Keine echten Kunden-/Mandantendaten verwenden.", flush=True)
    print("Alle Eingaben bleiben nur im RAM und verschwinden beim Beenden. Strg+C beendet den Server.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
