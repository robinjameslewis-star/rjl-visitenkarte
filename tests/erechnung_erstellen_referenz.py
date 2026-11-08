"""Referenz für „Erstellen“ (tests/erechnung_erstellen_test.mjs ruft das auf): die erzeugten Rechnungen aus
tools/erechnung/.cache/erstellen/ so prüfen wie der Validator der KoSIT – XML-Schema mit lxml gegen UBL-Invoice-2.1.xsd und die
Schematron-Regeln (EN 16931 und XRechnung) mit saxonche, beides aus derselben Validator-Konfiguration, die auch das Werkzeug nutzt.
Verglichen wird je Datei die Liste der Meldungen (Regelsatz, Regel, Kennzeichen) mit der des eigenen Prüfkerns im Browser (manifest.json).
Voraussetzung: Python-Umgebung mit saxonche und lxml; die Konfiguration als ZIP in tools/erechnung/.cache/ (regeln-bauen.mjs) oder in
ERECHNUNG_ZIP. Ausgabe: eine Zeile JSON mit den Zahlen (letzte Zeile)."""
import hashlib, json, os, sys, tempfile, zipfile
from concurrent.futures import ProcessPoolExecutor

HIER = os.path.dirname(os.path.abspath(__file__))
WZ = os.path.join(HIER, "..", "tools", "erechnung")
ORDNER = os.path.join(WZ, ".cache", "erstellen")
QUELLEN = json.load(open(os.path.join(WZ, "quellen.json")))
ZIP = os.environ.get("ERECHNUNG_ZIP") or os.path.join(WZ, ".cache", QUELLEN["konfiguration"]["url"].rsplit("/", 1)[1])
XSLT = {
    "en16931-ubl": "resources/ubl/2.1/xsl/EN16931-UBL-validation.xsl",
    "xrechnung-ubl": "resources/xrechnung/3.0.2/xsl/XRechnung-UBL-validation.xsl",
}
XSD = "resources/ubl/2.1/xsd/maindoc/UBL-Invoice-2.1.xsd"
NS = {"svrl": "http://purl.oclc.org/dsdl/svrl"}
_proc = _komp = _schema = None


def start():
    global _proc, _komp, _schema
    from saxonche import PySaxonProcessor
    from lxml import etree
    z = zipfile.ZipFile(ZIP)
    _proc = PySaxonProcessor(license=False)
    xp = _proc.new_xslt30_processor()
    _komp = {k: xp.compile_stylesheet(stylesheet_text=z.read(v).decode("utf-8")) for k, v in XSLT.items()}
    # Schema samt eingebundener Teile aus dem ZIP in einen Temp-Ordner (lxml löst die relativen Verweise im Dateisystem auf)
    ziel = tempfile.mkdtemp(prefix="rv-ubl-xsd-")
    z.extractall(ziel, [n for n in z.namelist() if n.startswith("resources/ubl/2.1/xsd/")])
    _schema = etree.XMLSchema(etree.parse(os.path.join(ziel, XSD)))


def pruefe(eintrag):
    from lxml import etree
    pfad = os.path.join(ORDNER, eintrag["datei"])
    text = open(pfad, encoding="utf-8").read()
    doc = etree.fromstring(text.encode("utf-8"))
    xsd = _schema.validate(doc)
    fehler_xsd = "" if xsd else str(_schema.error_log.last_error)[:200]
    knoten = _proc.parse_xml(xml_text=text)
    befunde, abbruch = [], ""
    for s in eintrag["saetze"]:
        try:
            svrl = etree.fromstring(_komp[s].transform_to_string(xdm_node=knoten).encode("utf-8"))
            befunde += [[s, a.get("id"), a.get("flag") or ""] for a in svrl.xpath("//svrl:failed-assert|//svrl:successful-report", namespaces=NS)]
        except Exception as e:
            abbruch = str(e)[:200]
    return {"datei": eintrag["datei"], "xsd": xsd, "fehlerXsd": fehler_xsd, "befunde": sorted(befunde), "eigene": sorted(eintrag["befunde"]), "abbruch": abbruch}


if __name__ == "__main__":
    if hashlib.sha256(open(ZIP, "rb").read()).hexdigest() != QUELLEN["konfiguration"]["sha256"]:
        sys.exit("Prüfsumme der Konfiguration stimmt nicht: " + ZIP)
    manifest = json.load(open(os.path.join(ORDNER, "manifest.json")))
    with ProcessPoolExecutor(max_workers=int(os.environ.get("PROZESSE", "6")), initializer=start) as ex:
        ergebnisse = list(ex.map(pruefe, manifest, chunksize=10))
    xsd = [r for r in ergebnisse if not r["xsd"]]
    abw = [r for r in ergebnisse if r["befunde"] != r["eigene"]]
    print(json.dumps({"dateien": len(ergebnisse), "xsdUngueltig": len(xsd), "xsdBeispiele": [f'{r["datei"]}: {r["fehlerXsd"]}' for r in xsd[:3]],
                      "abweichungen": len(abw), "abbrueche": sum(1 for r in ergebnisse if r["abbruch"]), "befunde": sum(len(r["befunde"]) for r in ergebnisse),
                      "beispiele": [f'{r["datei"]}: Referenz {r["befunde"][:4]} / Werkzeug {r["eigene"][:4]}' for r in abw[:3]]}))
