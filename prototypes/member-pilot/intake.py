"""Read-only questionnaire import and in-memory review workflow for a local demo."""
from __future__ import annotations

import copy
import io
import re
import secrets
import threading
import unicodedata
import uuid
from datetime import date, datetime, timezone
from typing import Any

from pypdf import PdfReader

MAX_PDF_BYTES = 2 * 1024 * 1024
MAX_PDF_PAGES = 8
REQUIRED_FIELDS = ("org_name", "vision", "pain", "priority")
SEGMENTS = {"accounting", "business", "startup", "nonprofit"}


class IntakeError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: Any = None):
        super().__init__(message)
        self.code, self.message, self.status, self.details = code, message, status, details

    def as_dict(self):
        result = {"code": self.code, "message": self.message}
        if self.details is not None:
            result["details"] = self.details
        return {"error": result}


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def clean_text(value: Any, maximum: int, name: str):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise IntakeError("invalid_field", "Ein Textfeld enthält keinen Text.", 422, {"field": name})
    value = unicodedata.normalize("NFC", value.replace("\r\n", "\n").replace("\r", "\n")).strip()
    if any(unicodedata.category(c) == "Cc" and c not in "\n\t" for c in value):
        raise IntakeError("invalid_field", "Das Feld enthält unzulässige Steuerzeichen.", 422, {"field": name})
    if len(value) > maximum:
        raise IntakeError("field_too_long", "Ein Feld überschreitet die erlaubte Länge.", 422,
                          {"field": name, "maxLength": maximum})
    return value


def normalize_boolean(value: Any, name: str):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, int) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        key = value.strip().lstrip("/").casefold()
        if key in {"yes", "ja", "true", "on", "1", "checked"}:
            return True
        if key in {"", "off", "no", "nein", "false", "0", "unchecked"}:
            return False
    raise IntakeError("invalid_checkbox", "Eine Checkbox enthält einen unbekannten Wert.", 422, {"field": name})


def normalize_fields(raw: Any, schema: dict):
    if not isinstance(raw, dict):
        raise IntakeError("invalid_fields", "fields muss ein Objekt mit Feldnamen sein.", 422)
    definitions = {field["name"]: field for field in schema["fields"]}
    unknown = sorted(set(raw) - set(definitions))
    if unknown:
        raise IntakeError("unknown_fields", "Unbekannte Fragebogenfelder werden nicht übernommen.", 422,
                          {"fields": unknown})
    fields = {}
    for name, definition in definitions.items():
        value = raw.get(name)
        if definition["type"] == "checkbox":
            fields[name] = normalize_boolean(value, name)
            continue
        if isinstance(value, list):
            if len(value) > 1:
                raise IntakeError("invalid_field", "Mehrfachauswahl wird hier nicht unterstützt.", 422,
                                  {"field": name})
            value = value[0] if value else ""
        value = clean_text(value, definition.get("maxLength", 1000), name)
        if definition["type"] == "choice":
            variants = definition["options"]
            canonical = variants["de"]
            choices = {unicodedata.normalize("NFC", option).strip().casefold(): canonical[index]
                       for language_options in variants.values()
                       for index, option in enumerate(language_options)}
            placeholders = {options[0].strip().casefold() for options in variants.values()}
            key = value.casefold()
            if not key or key in placeholders:
                value = ""
            elif key in choices:
                value = choices[key]
            else:
                raise IntakeError("invalid_choice", "Ein Auswahlfeld enthält einen unbekannten Wert.", 422,
                                  {"field": name})
        fields[name] = value
    return fields


def missing_fields(fields):
    return [name for name in REQUIRED_FIELDS if not fields.get(name)]


def _object(value):
    return value.get_object() if hasattr(value, "get_object") else value


def _inherited(widget, key):
    node, seen = widget, set()
    for _ in range(16):
        node = _object(node)
        if not isinstance(node, dict) or id(node) in seen:
            return None
        seen.add(id(node))
        if key in node:
            return _object(node[key])
        node = node.get("/Parent")
    raise IntakeError("invalid_pdf", "Die Formularstruktur ist zu tief verschachtelt.")


def _widget_name(widget):
    parts, node, seen = [], widget, set()
    for _ in range(16):
        node = _object(node)
        if not isinstance(node, dict) or id(node) in seen:
            break
        seen.add(id(node))
        if node.get("/T") is not None:
            parts.insert(0, str(node["/T"]))
        node = node.get("/Parent")
    return ".".join(parts)


def _pdf_value(value):
    value = _object(value)
    if value is None:
        return ""
    if isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, list):
        return [_pdf_value(item) for item in value]
    raise IntakeError("invalid_pdf_field", "Ein Formularwert hat ein nicht unterstütztes Format.", 422)


def _reject_active_content(container):
    if not isinstance(container, dict):
        return
    # Field dictionaries are read; PDF actions, scripts, attachments and XFA are never run.
    if any(key in container for key in ("/OpenAction", "/AA", "/A", "/XFA")):
        raise IntakeError("active_pdf", "PDFs mit Aktionen oder XFA werden im Prototyp nicht importiert.", 422)
    names = _object(container.get("/Names", {}))
    if isinstance(names, dict) and any(key in names for key in ("/JavaScript", "/EmbeddedFiles")):
        raise IntakeError("active_pdf", "PDFs mit Skripten oder eingebetteten Dateien werden nicht importiert.", 422)


def read_pdf(data: bytes, filename: str, schema: dict):
    if not isinstance(data, bytes) or not data:
        raise IntakeError("invalid_pdf", "Es wurden keine PDF-Daten übermittelt.")
    if len(data) > MAX_PDF_BYTES:
        raise IntakeError("pdf_too_large", "Die PDF darf höchstens 2 MB groß sein.", 413)
    if not data.startswith(b"%PDF-"):
        raise IntakeError("invalid_pdf", "Die Datei ist keine lesbare PDF.")
    filename = clean_text(filename, 200, "filename").split("/")[-1].split("\\")[-1]
    if not filename or not filename.lower().endswith(".pdf"):
        raise IntakeError("invalid_filename", "Bitte eine PDF-Datei auswählen.", 422)
    warnings = []
    try:
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise IntakeError("encrypted_pdf", "Verschlüsselte PDFs werden im Prototyp nicht unterstützt.", 422)
        if not 1 <= len(reader.pages) <= MAX_PDF_PAGES:
            raise IntakeError("too_many_pages", "Die PDF muss 1 bis 8 Seiten enthalten.", 422)
        root = _object(reader.trailer["/Root"])
        _reject_active_content(root)
        form = _object(root.get("/AcroForm", {}))
        _reject_active_content(form)
        metadata = reader.metadata or {}
        version = next((str(metadata[key]) for key in ("/RVFormVersion", "/RJLFormVersion", "/FormVersion", "/QuestionnaireVersion")
                        if metadata.get(key) is not None), None)
        if version is not None and version != schema["schemaVersion"]:
            raise IntakeError("unsupported_version", "Diese Fragebogenversion wird nicht unterstützt.", 422)
        if version is None:
            warnings.append("Formularversion fehlt; bekannte Feldnamen wurden dennoch geprüft.")
        language_value = next((str(metadata[key]) for key in ("/RVLanguage", "/Language")
                               if metadata.get(key)), str(root.get("/Lang", "")))
        language = language_value.lower().replace("_", "-").split("-")[0]
        if language not in ("de", "en"):
            language = "en" if re.search(r"(?:^|[-_])en(?:[-_.]|$)", filename.lower()) else "de"
            warnings.append("PDF-Sprache wurde aus dem Dateinamen bzw. als Deutsch angenommen.")
        fields, signed = {}, False
        pdf_fields = reader.get_fields() or {}
        for name, field in pdf_fields.items():
            _reject_active_content(field)
            if str(field.get("/FT")) == "/Sig":
                signed = True
                continue
            fields[str(name)] = _pdf_value(field.get("/V"))
        # Some PDF tools leave the AcroForm tree incomplete but preserve widget values.
        for page in reader.pages:
            _reject_active_content(page)
            for reference in page.get("/Annots", []):
                widget = _object(reference)
                _reject_active_content(widget)
                if str(widget.get("/Subtype")) != "/Widget":
                    continue
                if str(_inherited(widget, "/FT")) == "/Sig":
                    signed = True
                    continue
                name = _widget_name(widget)
                if not name:
                    raise IntakeError("unknown_fields", "Ein Formularfeld besitzt keinen bekannten Feldnamen.", 422)
                value = _inherited(widget, "/V")
                if value is None and str(_inherited(widget, "/FT")) == "/Btn":
                    value = widget.get("/AS")
                value = _pdf_value(value)
                if name in fields and fields[name] not in (None, "") and value not in (None, "") and fields[name] != value:
                    raise IntakeError("conflicting_pdf_values", "Ein PDF-Feld enthält widersprüchliche Werte.", 422,
                                      {"field": name})
                if value not in (None, "") or name not in fields:
                    fields[name] = value
        if not fields:
            raise IntakeError("no_form_fields", "Keine ausfüllbaren Fragebogenfelder gefunden. Scans und flache PDFs werden nicht per OCR gelesen.", 422)
        normalized = normalize_fields(fields, schema)
        if signed or root.get("/Perms"):
            warnings.append("Signatur vorhanden: nicht geprüft. Die Originaldatei wird ausschließlich gelesen und nicht verändert.")
        return {"fields": normalized,
                "source": {"filename": filename, "language": language, "kind": "pdf"},
                "missing": missing_fields(normalized), "warnings": warnings}
    except IntakeError:
        raise
    except Exception as exc:
        raise IntakeError("invalid_pdf", "Die PDF konnte nicht zuverlässig als Formular gelesen werden.", 422) from exc


def _followup(value):
    if value is None or value == "":
        return {"nextAt": None, "text": ""}
    if isinstance(value, str):
        value = {"nextAt": value, "text": ""}
    if not isinstance(value, dict):
        raise IntakeError("invalid_followup", "Die Wiedervorlage hat ein ungültiges Format.", 422)
    next_at = value.get("nextAt", value.get("date")) or None
    if next_at is not None:
        if not isinstance(next_at, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", next_at):
            raise IntakeError("invalid_followup", "Die Wiedervorlage benötigt ein ISO-Datum.", 422)
        try:
            date.fromisoformat(next_at)
        except ValueError as exc:
            raise IntakeError("invalid_followup", "Das Wiedervorlagedatum ist ungültig.", 422) from exc
    return {"nextAt": next_at, "text": clean_text(value.get("text", ""), 800, "followup.text")}


class DemoStore:
    def __init__(self, schema: dict, profile: dict):
        self.schema = copy.deepcopy(schema)
        self.profile = copy.deepcopy(profile)
        if self.profile.get("id") != "demo-firm":
            raise ValueError("Only the synthetic demo-firm profile is supported.")
        self.profile["fields"] = normalize_fields(self.profile.get("fields", {}), schema)
        self.draft = None
        self.csrf_token = secrets.token_urlsafe(32)
        self.lock = threading.RLock()

    def state(self):
        with self.lock:
            return copy.deepcopy({"profile": self.profile, "draft": self.draft, "csrfToken": self.csrf_token})

    def _save_draft(self, content, status):
        draft = {"id": "draft-" + uuid.uuid4().hex, **content,
                 "status": status, "createdAt": now_iso(), "profileId": self.profile["id"]}
        with self.lock:
            self.draft = draft
            return copy.deepcopy(draft)

    def import_pdf(self, data, filename):
        return self._save_draft(read_pdf(data, filename, self.schema), "submitted")

    def online_intake(self, fields, mode, language="de"):
        if mode not in ("save", "submit"):
            raise IntakeError("invalid_mode", "mode muss save oder submit sein.", 422)
        if language not in ("de", "en"):
            raise IntakeError("invalid_language", "Die Sprache wird nicht unterstützt.", 422)
        normalized = normalize_fields(fields, self.schema)
        return self._save_draft({"fields": normalized,
                                "source": {"filename": None, "language": language, "kind": "online"},
                                "missing": missing_fields(normalized),
                                "warnings": ["Selbstauskunft: noch nicht von Robin geprüft oder freigegeben."]},
                               "saved" if mode == "save" else "submitted")

    def publish(self, payload):
        with self.lock:
            if payload.get("confirmed") is not True:
                raise IntakeError("confirmation_required", "Die Prüfung muss ausdrücklich bestätigt werden.", 422)
            if not self.draft or payload.get("draftId") != self.draft["id"]:
                raise IntakeError("stale_draft", "Dieser Entwurf ist nicht mehr aktuell. Bitte den aktuellen Stand laden.", 409)
            if payload.get("profileId", self.profile["id"]) != self.profile["id"] or self.draft["profileId"] != self.profile["id"]:
                raise IntakeError("profile_mismatch", "Der Entwurf gehört nicht zu diesem Demoprofil.", 409)
            fields = normalize_fields(payload.get("fields"), self.schema)
            if not fields["org_name"]:
                raise IntakeError("organization_required", "Vor der Freigabe wird ein Organisationsname benötigt.", 422,
                                  {"field": "org_name"})
            informal = payload.get("informalAddressApproved")
            if not isinstance(informal, bool):
                raise IntakeError("invalid_address_approval", "Die Freigabe der Du-Ansprache muss true oder false sein.", 422)
            segments = payload.get("segments")
            if not isinstance(segments, list) or not segments or len(segments) > len(SEGMENTS) or any(not isinstance(item, str) or item not in SEGMENTS for item in segments):
                raise IntakeError("invalid_segments", "Bitte mindestens ein bekanntes Segment auswählen.", 422)
            review_note = clean_text(payload.get("reviewNote", ""), 2000, "reviewNote")
            followup = _followup(payload.get("nextFollowUp", self.profile.get("followup")))
            updated = {"id": self.profile["id"], "fields": fields,
                       "informalAddressApproved": informal, "segments": list(dict.fromkeys(segments)),
                       "review": {"status": "reviewed", "updatedAt": now_iso(), "note": review_note},
                       "followup": followup, "source": copy.deepcopy(self.draft["source"])}
            self.profile = updated
            self.draft = None
            return copy.deepcopy(updated)
