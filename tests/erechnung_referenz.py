"""Referenzprüfung außerhalb des Browsers für den Abgleich (Abnahme 1): saxonche (Saxon-HE) mit denselben XSLT-Regeln der
KoSIT-Validator-Konfiguration, die auch das Werkzeug nutzt. Je Dokument und Regelsatz die gemeldeten Regeln (failed-assert und
successful-report) mit Kennzeichen.
Voraussetzung: python3 -m venv tools/erechnung/.cache/venv && tools/erechnung/.cache/venv/bin/pip install saxonche lxml
               cd tools/erechnung && node regeln-bauen.mjs && node testdaten-holen.mjs && cd ../.. && node tests/erechnung_korpus.mjs
Aufruf:        tools/erechnung/.cache/venv/bin/python tests/erechnung_referenz.py [prozesse=6]
Schreibt tools/erechnung/.cache/korpus/referenz.json."""
import json, os, sys, time, zipfile
from concurrent.futures import ProcessPoolExecutor

HIER = os.path.dirname(os.path.abspath(__file__))
WZ = os.path.join(HIER, "..", "tools", "erechnung")
KORPUS = os.path.join(WZ, ".cache", "korpus")
QUELLEN = json.load(open(os.path.join(WZ, "quellen.json")))
ZIP = os.path.join(WZ, ".cache", QUELLEN["konfiguration"]["url"].rsplit("/", 1)[1])
XSLT = {
    "en16931-ubl": "resources/ubl/2.1/xsl/EN16931-UBL-validation.xsl",
    "en16931-cii": "resources/cii/16b/xsl/EN16931-CII-validation.xsl",
    "xrechnung-ubl": "resources/xrechnung/3.0.2/xsl/XRechnung-UBL-validation.xsl",
    "xrechnung-cii": "resources/xrechnung/3.0.2/xsl/XRechnung-CII-validation.xsl",
}
NS = {"svrl": "http://purl.oclc.org/dsdl/svrl"}
_proc = _komp = None


def start():
    global _proc, _komp
    from saxonche import PySaxonProcessor
    _proc = PySaxonProcessor(license=False)
    xp = _proc.new_xslt30_processor()
    z = zipfile.ZipFile(ZIP)
    _komp = {k: xp.compile_stylesheet(stylesheet_text=z.read(v).decode("utf-8")) for k, v in XSLT.items()}


def pruefe(eintrag):
    from lxml import etree
    pfad = os.path.join(KORPUS, eintrag["datei"])
    out = {}
    try:
        knoten = _proc.parse_xml(xml_text=open(pfad, encoding="utf-8").read().lstrip("﻿"))
    except Exception as e:
        return eintrag["datei"], {"parse": str(e)[:200]}
    for s in eintrag["saetze"]:
        try:
            svrl = etree.fromstring(_komp[s].transform_to_string(xdm_node=knoten).encode("utf-8"))
            out[s] = sorted([a.get("id"), a.get("flag") or "", "assert" if a.tag.endswith("failed-assert") else "report"]
                            for a in svrl.xpath("//svrl:failed-assert|//svrl:successful-report", namespaces=NS))
        except Exception as e:
            out[s] = {"abbruch": str(e)[:300]}
    return eintrag["datei"], out


if __name__ == "__main__":
    prozesse = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    manifest = json.load(open(os.path.join(KORPUS, "manifest.json")))
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=prozesse, initializer=start) as ex:
        ergebnis = dict(ex.map(pruefe, manifest, chunksize=20))
    json.dump(ergebnis, open(os.path.join(KORPUS, "referenz.json"), "w"))
    abbrueche = sum(1 for v in ergebnis.values() for x in v.values() if isinstance(x, dict))
    print(f"Referenz (saxonche): {len(ergebnis)} Dokumente, {sum(len(e['saetze']) for e in manifest)} Prüfungen, {abbrueche} Abbrüche, {time.time() - t0:.0f} s")
