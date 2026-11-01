"""Beispiel-PDF für SmartFormular E-Rechnung lite bauen: sichtbare Rechnung (zugferd-ansicht.html) mit Chrome als PDF drucken und die
Rechnungsdaten (zugferd.xml, Profil EN 16931) als factur-x.xml einbetten – mit der Bibliothek factur-x (Akretion, BSD) nur zum Bauen.
Einmalig:  python3 -m venv .cache/venv && .cache/venv/bin/pip install factur-x
Aufruf:    .cache/venv/bin/python beispiele-bauen.py            (schreibt beispiele/zugferd.pdf)
           .cache/venv/bin/python beispiele-bauen.py <html> <xml> <pdf-ziel> [profil]   (für Testdaten; profil z. B. minimum, basicwl)
"""
import os, subprocess, sys, tempfile
from facturx import generate_from_binary

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
hier = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
html, xml, ziel = (args[:3] if len(args) >= 3 else (os.path.join(hier, "beispiele", "zugferd-ansicht.html"), os.path.join(hier, "beispiele", "zugferd.xml"), os.path.join(hier, "beispiele", "zugferd.pdf")))
profil = args[3] if len(args) > 3 else "en16931"
with tempfile.TemporaryDirectory() as tmp:
    roh = os.path.join(tmp, "ansicht.pdf")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={roh}", "file://" + os.path.abspath(html)], check=True, capture_output=True)
    pdf = open(roh, "rb").read()
    if profil == "ohne":
        open(ziel, "wb").write(pdf)
    else:
        daten = open(xml, "rb").read()
        out = generate_from_binary(pdf, daten, flavor="factur-x", level=profil, check_xsd=True,
                                   pdf_metadata={"author": "robin.vision (Beispiel)", "title": "Beispielrechnung", "subject": "Factur-X/ZUGFeRD-Beispiel, frei erfunden"})
        open(ziel, "wb").write(out)
print("geschrieben:", ziel, os.path.getsize(ziel), "Bytes")
