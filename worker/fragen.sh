#!/bin/sh
# Listet die Fragen, die Goch in den letzten 30 Tagen nicht beantworten konnte (ohne Personenbezug),
# mit Häufigkeit – Grundlage für die monatliche Durchsicht des Profils (Briefing Abschnitt 11).
# Aufruf im Ordner worker/:  sh fragen.sh
cd "$(dirname "$0")" || exit 1
npx wrangler kv key list --binding USAGE --remote --prefix "unanswered:" 2>/dev/null \
  | python3 -c '
import json, subprocess, sys
raw = sys.stdin.read(); i = raw.find("["); keys = json.loads(raw[i:]) if i >= 0 else []
rows = []
for k in keys:
    v = subprocess.run(["npx", "wrangler", "kv", "key", "get", "--binding", "USAGE", "--remote", k["name"]], capture_output=True, text=True).stdout
    try:
        e = json.loads(v[v.find("{"):]); rows.append((e.get("n", 1), e.get("last", ""), e.get("lang", ""), e.get("q", k["name"])))
    except Exception: pass
rows.sort(reverse=True)
print(f"{len(rows)} unbeantwortete Fragen (30 Tage):")
for n, last, lang, q in rows: print(f"  {n:3d}×  [{lang}] {q}   (zuletzt {last})")
'
