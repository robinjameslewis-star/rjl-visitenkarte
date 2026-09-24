"""Synthetic, in-memory regression tests; no customer files or external services."""
import base64
import copy
import http.client
import io
import json
import threading
import unittest
from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, NameObject, NumberObject, TextStringObject

from intake import DemoStore, IntakeError, MAX_PDF_BYTES, normalize_fields, read_pdf
from server import DemoHTTPServer

HERE = Path(__file__).resolve().parent
SCHEMA = json.loads((HERE / "questionnaire-schema.json").read_text(encoding="utf-8"))
PROFILE = json.loads((HERE / "demo-profile.json").read_text(encoding="utf-8"))
CORE = {"org_name": "Synthetische Kanzlei Müller & Söhne", "vision": "Mehr Überblick 👁",
        "pain": "Rückfragen zu Übergaben", "priority": "Einen Ablauf aufnehmen"}


def pdf(fields=None, *, language="de", version="rv-pilot-1", tree=True, pages=1, signature=False, script=False):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=612, height=792)
    definitions = {f["name"]: f for f in SCHEMA["fields"]}
    refs = ArrayObject()
    for name, value in (fields or {}).items():
        kind = definitions.get(name, {}).get("type", "text")
        field_type = "/Btn" if kind == "checkbox" else "/Ch" if kind == "choice" else "/Tx"
        widget = DictionaryObject({NameObject("/Type"): NameObject("/Annot"),
                                   NameObject("/Subtype"): NameObject("/Widget"),
                                   NameObject("/FT"): NameObject(field_type),
                                   NameObject("/T"): TextStringObject(name),
                                   NameObject("/Rect"): ArrayObject([NumberObject(0), NumberObject(0), NumberObject(100), NumberObject(20)])})
        if kind == "checkbox":
            state = "/Yes" if value else "/Off"
            widget[NameObject("/V")] = NameObject(state)
            widget[NameObject("/AS")] = NameObject(state)
        elif value is not None:
            widget[NameObject("/V")] = TextStringObject(str(value))
        refs.append(writer._add_object(widget))
    if signature:
        refs.append(writer._add_object(DictionaryObject({NameObject("/FT"): NameObject("/Sig"),
                    NameObject("/Subtype"): NameObject("/Widget"), NameObject("/T"): TextStringObject("Signature1")})))
    writer.pages[0][NameObject("/Annots")] = refs
    if tree:
        writer._root_object[NameObject("/AcroForm")] = writer._add_object(DictionaryObject({NameObject("/Fields"): refs}))
    metadata = {"/RVLanguage": language}
    if version is not None:
        metadata["/RVFormVersion"] = version
    writer.add_metadata(metadata)
    if script:
        writer.add_js("app.alert('synthetic test');")
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.store = DemoStore(SCHEMA, PROFILE)

    def assertCode(self, code, action):
        with self.assertRaises(IntakeError) as context:
            action()
        self.assertEqual(context.exception.code, code)

    def approved_payload(self, draft):
        return {"draftId": draft["id"], "confirmed": True, "fields": draft["fields"],
                "informalAddressApproved": False, "segments": ["accounting"],
                "reviewNote": "Synthetische Angaben geprüft.",
                "nextFollowUp": {"nextAt": "2026-10-22", "text": "Nächsten Schritt klären."}}

    def test_filled_pdf_unicode_and_boolean(self):
        fields = {**CORE, "sector": "Kanzlei", "support_process": True, "support_people": False}
        draft = self.store.import_pdf(pdf(fields), "demo-de.pdf")
        self.assertEqual(draft["fields"]["org_name"], CORE["org_name"])
        self.assertEqual(draft["fields"]["vision"], CORE["vision"])
        self.assertIs(draft["fields"]["support_process"], True)
        self.assertIs(draft["fields"]["support_people"], False)
        self.assertEqual(draft["missing"], [])

    def test_english_choices_use_canonical_german_values(self):
        result = read_pdf(pdf({**CORE, "sector": "Tax / accounting firm", "collaboration": "Mainly in writing"}, language="en"), "demo-en.pdf", SCHEMA)
        self.assertEqual(result["source"]["language"], "en")
        self.assertEqual(result["fields"]["sector"], "Kanzlei")
        self.assertEqual(result["fields"]["collaboration"], "Vorwiegend schriftlich")

    def test_blank_choices_are_missing_not_answers(self):
        result = read_pdf(pdf({"org_name": "", "sector": "Please select", "team_size": "Bitte wählen"}), "blank.pdf", SCHEMA)
        self.assertEqual(result["fields"]["sector"], "")
        self.assertEqual(result["fields"]["team_size"], "")
        self.assertEqual(set(result["missing"]), {"org_name", "vision", "pain", "priority"})

    def test_widgets_without_acroform_tree(self):
        result = read_pdf(pdf({**CORE, "support_process": True}, tree=False), "widgets.pdf", SCHEMA)
        self.assertEqual(result["fields"]["org_name"], CORE["org_name"])
        self.assertTrue(result["fields"]["support_process"])

    def test_unknown_fields_and_versions_rejected(self):
        self.assertCode("unknown_fields", lambda: read_pdf(pdf({"not_in_schema": "x"}), "x.pdf", SCHEMA))
        self.assertCode("unsupported_version", lambda: read_pdf(pdf(CORE, version="rv-pilot-99"), "x.pdf", SCHEMA))
        result = read_pdf(pdf(CORE, version=None), "x.pdf", SCHEMA)
        self.assertTrue(result["warnings"])

    def test_malformed_and_flat_pdf(self):
        self.assertCode("invalid_pdf", lambda: read_pdf(b"not a PDF", "x.pdf", SCHEMA))
        self.assertCode("invalid_pdf", lambda: read_pdf(b"%PDF-1.7\nbroken", "x.pdf", SCHEMA))
        self.assertCode("no_form_fields", lambda: read_pdf(pdf(), "flat.pdf", SCHEMA))

    def test_size_and_page_limits(self):
        self.assertCode("pdf_too_large", lambda: read_pdf(b"%PDF-" + b"x" * MAX_PDF_BYTES, "large.pdf", SCHEMA))
        self.assertCode("too_many_pages", lambda: read_pdf(pdf(CORE, pages=9), "long.pdf", SCHEMA))
        result = read_pdf(pdf(CORE, pages=8), "eight.pdf", SCHEMA)
        self.assertEqual(result["missing"], [])

    def test_javascript_is_rejected(self):
        self.assertCode("active_pdf", lambda: read_pdf(pdf(CORE, script=True), "active.pdf", SCHEMA))

    def test_signature_is_read_only_and_not_verified(self):
        original = pdf(CORE, signature=True)
        before = bytes(original)
        result = read_pdf(original, "signed.pdf", SCHEMA)
        self.assertEqual(original, before)
        self.assertTrue(any("Signatur" in warning for warning in result["warnings"]))
        self.assertNotIn("Signature1", result["fields"])

    def test_boolean_and_unicode_normalization(self):
        result = normalize_fields({"org_name": "Mu\u0308ller", "support_people": "/Ja", "support_delivery": "false"}, SCHEMA)
        self.assertEqual(result["org_name"], "Müller")
        self.assertTrue(result["support_people"])
        self.assertFalse(result["support_delivery"])
        self.assertCode("invalid_checkbox", lambda: normalize_fields({"support_people": "perhaps"}, SCHEMA))
        self.assertCode("field_too_long", lambda: normalize_fields({"org_name": "x" * 101}, SCHEMA))
        self.assertCode("invalid_choice", lambda: normalize_fields({"sector": "law firm"}, SCHEMA))

    def test_intake_is_self_reported_until_review(self):
        before = self.store.state()["profile"]
        draft = self.store.online_intake(CORE, "submit")
        self.assertEqual(self.store.state()["profile"], before)
        self.assertEqual(draft["source"]["kind"], "online")
        self.assertIn("Selbstauskunft", draft["warnings"][0])
        published = self.store.publish(self.approved_payload(draft))
        self.assertEqual(published["fields"]["org_name"], CORE["org_name"])
        self.assertEqual(published["review"]["status"], "reviewed")
        self.assertIsNone(self.store.state()["draft"])

    def test_progressive_save_and_no_implicit_mixing(self):
        self.store.online_intake(CORE, "submit")
        draft = self.store.online_intake({"org_name": "Anderes synthetisches Beispiel"}, "save")
        self.assertEqual(draft["fields"]["vision"], "")
        self.assertEqual(draft["status"], "saved")
        self.assertIn("vision", draft["missing"])

    def test_stale_cross_profile_and_repeated_publish_rejected(self):
        old = self.store.online_intake(CORE, "save")
        fresh = self.store.online_intake({**CORE, "org_name": "Neues Demobeispiel"}, "submit")
        self.assertCode("stale_draft", lambda: self.store.publish(self.approved_payload(old)))
        wrong = {**self.approved_payload(fresh), "profileId": "another-customer"}
        self.assertCode("profile_mismatch", lambda: self.store.publish(wrong))
        self.store.publish(self.approved_payload(fresh))
        self.assertCode("stale_draft", lambda: self.store.publish(self.approved_payload(fresh)))

    def test_confirmation_and_organization_required(self):
        draft = self.store.online_intake(CORE, "submit")
        payload = self.approved_payload(draft)
        payload["confirmed"] = "true"
        self.assertCode("confirmation_required", lambda: self.store.publish(payload))
        payload = self.approved_payload(draft)
        payload["fields"]["org_name"] = ""
        self.assertCode("organization_required", lambda: self.store.publish(payload))

    def test_failed_import_and_failed_publish_preserve_state(self):
        draft = self.store.online_intake(CORE, "submit")
        before = self.store.state()
        self.assertCode("invalid_pdf", lambda: self.store.import_pdf(b"no", "x.pdf"))
        self.assertEqual(self.store.state(), before)
        payload = self.approved_payload(draft)
        payload["nextFollowUp"] = {"nextAt": "2026-02-30", "text": "x"}
        self.assertCode("invalid_followup", lambda: self.store.publish(payload))
        self.assertEqual(self.store.state(), before)

    def test_state_is_not_a_mutable_reference(self):
        result = self.store.state()
        result["profile"]["id"] = "other"
        self.assertEqual(self.store.state()["profile"]["id"], "demo-firm")


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = DemoHTTPServer(0, store=DemoStore(SCHEMA, PROFILE), base_dir=HERE)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.server.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self):
        self.server.store = DemoStore(SCHEMA, PROFILE)

    def request(self, method, path, payload=None, headers=None, raw=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=3)
        body = raw if raw is not None else json.dumps(payload).encode() if payload is not None else None
        request_headers = {"Content-Type": "application/json"} if body is not None else {}
        request_headers.update(headers or {})
        connection.request(method, path, body=body, headers=request_headers)
        response = connection.getresponse()
        data = response.read()
        result = (response.status, dict(response.getheaders()), json.loads(data) if data else None)
        connection.close()
        return result

    def token_headers(self):
        _, _, state = self.request("GET", "/api/state")
        return {"X-Demo-Token": state["csrfToken"], "Origin": f"http://127.0.0.1:{self.port}"}

    def test_state_schema_and_cache(self):
        status, headers, result = self.request("GET", "/api/state")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertIsNone(result["draft"])
        self.assertEqual(self.request("GET", "/api/questionnaire")[2]["schemaVersion"], "rv-pilot-1")

    def test_token_origin_and_host(self):
        body = {"fields": CORE, "mode": "save"}
        self.assertEqual(self.request("POST", "/api/intake", body)[0], 403)
        headers = self.token_headers()
        self.assertEqual(self.request("POST", "/api/intake", body, headers=headers)[0], 200)
        headers["Origin"] = "https://external.example"
        self.assertEqual(self.request("POST", "/api/intake", body, headers=headers)[0], 403)
        self.assertEqual(self.request("GET", "/api/state", headers={"Host": "external.example"})[0], 403)

    def test_json_and_base64_errors(self):
        headers = self.token_headers()
        self.assertEqual(self.request("POST", "/api/import", {"filename": "x.pdf", "pdfBase64": "%%%"}, headers)[0], 400)
        self.assertEqual(self.request("POST", "/api/intake", headers=headers, raw=b'{"fields":{},"mode":"save","mode":"submit"}')[0], 400)
        self.assertEqual(self.request("POST", "/api/intake", headers=headers, raw=b'{"fields":NaN}')[0], 400)
        self.assertEqual(self.request("POST", "/api/intake", headers=headers, raw=b'[]')[0], 400)

    def test_pdf_import_and_explicit_publish(self):
        headers = self.token_headers()
        status, _, result = self.request("POST", "/api/import", {"filename": "synthetic.pdf", "pdfBase64": base64.b64encode(pdf(CORE)).decode()}, headers)
        self.assertEqual(status, 200)
        draft = result["draft"]
        payload = {"draftId": draft["id"], "fields": draft["fields"], "confirmed": True,
                   "informalAddressApproved": True, "segments": ["accounting"],
                   "reviewNote": "Test", "nextFollowUp": {"nextAt": "2026-10-22", "text": "Test"}}
        status, _, result = self.request("POST", "/api/publish", payload, headers)
        self.assertEqual(status, 200)
        self.assertTrue(result["profile"]["informalAddressApproved"])
        self.assertIsNone(result["draft"])
        self.assertEqual(self.request("POST", "/api/publish", payload, headers)[0], 409)

    def test_private_paths_never_served(self):
        for path in ("/server.py", "/demo-profile.json", "/../demo-profile.json", "/%2e%2e/demo-profile.json"):
            self.assertEqual(self.request("GET", path)[0], 404)


if __name__ == "__main__":
    unittest.main()
