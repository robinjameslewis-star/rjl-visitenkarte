"""Radar HLK-LD2410 (Hi-Link, 24 GHz) über USB-Seriell: Berichtsrahmen lesen und Anwesenheit ableiten (Messegerät, 23.10.2026).

Der Sensor meldet etwa zehnmal je Sekunde einen Rahmen:
    F4 F3 F2 F1 | Länge (2 Byte, LE) | Typ (01 Technik / 02 Grund) AA | Zustand | Abstand bewegt (2) | Energie |
    Abstand ruhend (2) | Energie | Erkennungsabstand (2) | [Technikdaten] | 55 00 | F8 F7 F6 F5
Zustand: 0 niemand, 1 bewegt, 2 ruhend, 3 beides; Abstände in Zentimetern. Nur Anwesenheit und Abstand – keine Bilder,
keine Kennung einer Person. Lesen braucht pyserial (Debian: python3-serial); die Auswertung selbst nur die Standardbibliothek.
"""
from dataclasses import dataclass

KOPF = b'\xf4\xf3\xf2\xf1'
ENDE = b'\xf8\xf7\xf6\xf5'


@dataclass
class Bericht:
    zustand: int
    bewegt_cm: int
    still_cm: int
    erkennung_cm: int

    @property
    def jemand(self):
        return self.zustand in (1, 2, 3)

    @property
    def abstand_m(self):
        """Abstand der nächsten Person in Metern (bewegt, ruhend oder beides)."""
        werte = {1: [self.bewegt_cm], 2: [self.still_cm], 3: [self.bewegt_cm, self.still_cm]}.get(self.zustand, [])
        werte = [w for w in werte if w > 0]
        return min(werte) / 100 if werte else None


class Rahmenleser:
    """Setzt Rahmen aus beliebig zerstückelten Bytes zusammen; kaputte Rahmen werden verworfen."""

    def __init__(self):
        self.puffer = b''

    def fuettern(self, daten):
        self.puffer += daten
        berichte = []
        while True:
            start = self.puffer.find(KOPF)
            if start < 0:
                self.puffer = self.puffer[-3:]
                return berichte
            if len(self.puffer) < start + 6:
                self.puffer = self.puffer[start:]
                return berichte
            laenge = int.from_bytes(self.puffer[start + 4:start + 6], 'little')
            ende = start + 6 + laenge
            if laenge > 64:  # kein gültiger Berichtsrahmen
                self.puffer = self.puffer[start + 4:]
                continue
            if len(self.puffer) < ende + 4:
                self.puffer = self.puffer[start:]
                return berichte
            rahmen, schluss = self.puffer[start + 6:ende], self.puffer[ende:ende + 4]
            self.puffer = self.puffer[ende + 4:]
            if schluss != ENDE or len(rahmen) < 13 or rahmen[0] not in (1, 2) or rahmen[1] != 0xAA or rahmen[-2:] != b'\x55\x00':
                continue
            d = rahmen[2:]
            berichte.append(Bericht(zustand=d[0], bewegt_cm=int.from_bytes(d[1:3], 'little'),
                                    still_cm=int.from_bytes(d[4:6], 'little'), erkennung_cm=int.from_bytes(d[7:9], 'little')))


class Anwesenheit:
    """Meldet „anwesend“, wenn jemand halten_s lang im Bereich [von_m, bis_m] steht, „abwesend“ nach weg_s ohne Person."""

    def __init__(self, von_m=1.0, bis_m=3.0, halten_s=0.5, weg_s=3.0):
        self.von, self.bis, self.halten, self.weg = von_m, bis_m, halten_s, weg_s
        self.im_bereich_seit = None
        self.zuletzt_gesehen = None
        self.anwesend = False

    def melden(self, bericht, jetzt):
        """Neuer Bericht → 'anwesend', 'abwesend' oder None (keine Änderung)."""
        abstand = bericht.abstand_m if bericht.jemand else None
        if abstand is not None:
            self.zuletzt_gesehen = jetzt
        im_bereich = abstand is not None and self.von <= abstand <= self.bis
        if im_bereich:
            if self.im_bereich_seit is None:
                self.im_bereich_seit = jetzt
            if not self.anwesend and jetzt - self.im_bereich_seit >= self.halten:
                self.anwesend = True
                return 'anwesend'
        else:
            self.im_bereich_seit = None
        if self.anwesend and (self.zuletzt_gesehen is None or jetzt - self.zuletzt_gesehen >= self.weg):
            self.anwesend = False
            return 'abwesend'
        return None


def rahmen(zustand, bewegt_cm=0, still_cm=0, technik=False):
    """Baut einen Berichtsrahmen – für Tests und zum Ausprobieren ohne Sensor."""
    daten = bytes([1 if technik else 2, 0xAA, zustand]) + bewegt_cm.to_bytes(2, 'little') + b'\x40' + \
        still_cm.to_bytes(2, 'little') + b'\x30' + max(bewegt_cm, still_cm).to_bytes(2, 'little')
    if technik:
        daten += bytes(20)  # Energien je Entfernungstor
    daten += b'\x55\x00'
    return KOPF + len(daten).to_bytes(2, 'little') + daten + ENDE


def lesen(port, melden, baud=256000, stopp=None):
    """Liest vom Sensor und ruft melden(Bericht) für jeden Rahmen. Blockiert; im eigenen Thread starten."""
    import serial  # pyserial
    leser = Rahmenleser()
    with serial.Serial(port, baud, timeout=0.5) as s:
        while not (stopp and stopp.is_set()):
            for b in leser.fuettern(s.read(256)):
                melden(b)
