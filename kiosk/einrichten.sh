#!/bin/sh
# Einrichtung des Messegeräts (Debian 12 oder Ubuntu 24.04 LTS, Linux-Mini-PC), als root auf dem Gerät ausführen.
# Liest nichts aus dem Netz außer den Debian-Paketen und dem Website-Repository; schreibt keine Geheimnisse.
# Vorher: kiosk/README.md lesen. Danach: /etc/goch-kiosk/geraet.json mit dem Nachweis aus der Redaktion füllen.
set -eu
COMMIT="${1:?Aufruf: einrichten.sh <Commit der Website, z. B. abc1234>}"

apt-get update
apt-get install -y --no-install-recommends chromium cage python3 python3-serial git curl pipewire pipewire-pulse wireplumber

id goch >/dev/null 2>&1 || useradd --system --home /var/lib/goch-kiosk --shell /usr/sbin/nologin goch
id kiosk >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --groups audio,video,input kiosk
usermod -aG dialout goch

install -d -o goch -g goch -m 750 /var/lib/goch-kiosk /var/lib/goch-kiosk/figuren /var/lib/goch-kiosk/offline
install -d -m 755 /etc/goch-kiosk /etc/chromium/policies/managed

# Website zum festen Commit (nur lesend; der Dienst liefert daraus kiosk.html und die Bausteine aus)
if [ ! -d /opt/goch-kiosk/seite/.git ]; then
  git clone https://github.com/robinjameslewis-star/rjl-visitenkarte.git /opt/goch-kiosk/seite
fi
git -C /opt/goch-kiosk/seite fetch --quiet origin
git -C /opt/goch-kiosk/seite -c advice.detachedHead=false checkout --quiet "$COMMIT"

K=/opt/goch-kiosk/seite/kiosk
[ -f /etc/goch-kiosk/konfiguration.json ] || install -m 644 "$K/konfiguration.beispiel.json" /etc/goch-kiosk/konfiguration.json
[ -f /etc/goch-kiosk/geraet.json ] || install -o goch -g goch -m 600 "$K/geraet.beispiel.json" /etc/goch-kiosk/geraet.json
install -m 644 "$K/chromium/goch-kiosk.json" /etc/chromium/policies/managed/goch-kiosk.json
install -m 644 "$K"/systemd/goch-kiosk.service "$K"/systemd/goch-kiosk-browser.service "$K"/systemd/goch-kiosk-waechter.service "$K"/systemd/goch-kiosk-waechter.timer /etc/systemd/system/

systemctl daemon-reload
systemctl enable goch-kiosk.service goch-kiosk-browser.service goch-kiosk-waechter.timer
systemctl set-default graphical.target
echo "Fertig. Jetzt /etc/goch-kiosk/geraet.json (Nachweis) und /etc/goch-kiosk/konfiguration.json anpassen, dann: systemctl restart goch-kiosk goch-kiosk-browser"
