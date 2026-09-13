#!/bin/zsh
# Exportiert die Termine des Apple-Kalenders „Frei“ (nächste 90 Tage) nach termine.json.
# Jeder Kalendereintrag wird in 30-Minuten-Zeiten zerlegt (DAUER anpassen).
# Nutzung:  tools/frei-export.sh   → schreibt termine.json im Repository-Stamm; danach committen/hochladen.
set -e
cd "$(dirname "$0")/.."
KALENDER="${KALENDER:-Frei}"; DAUER="${DAUER:-30}"; TAGE="${TAGE:-90}"
osascript -l JavaScript - "$KALENDER" "$TAGE" <<'JXA' > /tmp/frei_events.txt
function run(argv) {
  const name = argv[0], tage = parseInt(argv[1], 10);
  const Cal = Application('Calendar');
  const cal = Cal.calendars.whose({ name: name })[0];
  if (!cal) { return 'FEHLER: Kalender „' + name + '“ nicht gefunden'; }
  const now = new Date(); const end = new Date(now.getTime() + tage * 86400000);
  const evs = cal.events.whose({ _and: [{ startDate: { _greaterThan: now } }, { startDate: { _lessThan: end } }] })();
  const out = [];
  for (const e of evs) { out.push(e.startDate().toISOString() + '|' + e.endDate().toISOString()); }
  return out.join('\n');
}
JXA
if grep -q '^FEHLER' /tmp/frei_events.txt; then cat /tmp/frei_events.txt; exit 1; fi
python3 - "$DAUER" <<'PY'
import sys, json, datetime as dt, zoneinfo
dauer = int(sys.argv[1]); tz = zoneinfo.ZoneInfo("Europe/Berlin")
days = {}
for line in open("/tmp/frei_events.txt"):
    line=line.strip()
    if not line: continue
    s,e = line.split("|")
    s = dt.datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(tz); e = dt.datetime.fromisoformat(e.replace("Z","+00:00")).astimezone(tz)
    t = s
    while t + dt.timedelta(minutes=dauer) <= e:
        days.setdefault(t.strftime("%Y-%m-%d"), set()).add(t.strftime("%H:%M")); t += dt.timedelta(minutes=dauer)
frei = [{"datum": d, "zeiten": sorted(z)} for d,z in sorted(days.items())]
json.dump({"dauerMin": dauer, "zeitzone": "Europe/Berlin", "stand": dt.datetime.now(tz).strftime("%Y-%m-%d %H:%M"), "frei": frei}, open("termine.json","w"), ensure_ascii=False, indent=2)
print(f"termine.json: {len(frei)} Tage, {sum(len(x['zeiten']) for x in frei)} Zeiten")
PY
