#!/bin/sh
# Wächter des Messegeräts (23.10.2026): startet Chromium neu, wenn die Seite länger als zwei Minuten kein Lebenszeichen
# an den lokalen Dienst geschickt hat (hängende Seite, abgestürzter Tab). Läuft jede Minute über goch-kiosk-waechter.timer.
# Den lokalen Dienst selbst überwacht systemd (WatchdogSec in goch-kiosk.service).
set -eu
zustand=$(curl -fsS --max-time 5 -H 'Host: localhost:8080' http://127.0.0.1:8080/kiosk/zustand) || exit 0  # Dienst startet gerade neu
puls=$(printf '%s' "$zustand" | python3 -c 'import json,sys; print(json.load(sys.stdin)["puls_s"])')
if [ "$puls" -gt 120 ]; then
  logger -t goch-kiosk "Seite ohne Lebenszeichen seit ${puls} s – Chromium wird neu gestartet"
  systemctl restart goch-kiosk-browser.service
fi
