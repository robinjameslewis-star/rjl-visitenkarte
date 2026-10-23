"""Vorbereitete Antworten für das Messegerät ohne Netz (Robin, 23.10.2026).

Fragt die Figur über den laufenden lokalen Dienst (der den Gerätenachweis kennt) einmal je häufiger Frage und Sprache,
speichert Antworttext und Stimme (MP3 aus ElevenLabs bzw. der Stimme der Figur) im Datenordner des Geräts. Die Dateien
bleiben auf dem Gerät – nie im Repository. Erneut ausführen, wenn sich Wissen oder Stimme ändern.

Aufruf auf dem Gerät:
    python3 offline_antworten.py fragen.json /var/lib/goch-kiosk/offline/goch [--figur goch] [--dienst http://localhost:8080]
fragen.json: {"fragen": [{"de": "Wer ist Robin?", "en": "Who is Robin?"}, …]} – Vorlage: kiosk/offline-fragen.beispiel.json"""
import argparse, base64, hashlib, json, os, sys, urllib.request


def fragen_an_figur(dienst, figur, lang, frage):
    body = json.dumps({'figur': figur, 'lang': lang, 'messages': [{'role': 'user', 'content': frage}], 'stimme': {'erste': False}}).encode()
    req = urllib.request.Request(dienst.rstrip('/') + '/kiosk/chat', data=body, method='POST', headers={'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        text = r.read().decode()
    zeilen = [json.loads(z) for z in text.strip().split('\n') if z.strip()]
    return zeilen[0], (zeilen[1] if len(zeilen) > 1 else {})


def main():
    p = argparse.ArgumentParser(description='Offline-Antworten für das Messegerät erzeugen')
    p.add_argument('fragen')
    p.add_argument('ziel')
    p.add_argument('--figur', default='goch')
    p.add_argument('--dienst', default='http://localhost:8080')
    a = p.parse_args()
    with open(a.fragen, encoding='utf-8') as f:
        fragen = json.load(f)['fragen']
    os.makedirs(a.ziel, exist_ok=True)
    antworten = []
    for frage in fragen:
        eintrag = {'frage': {}, 'antwort': {}, 'audio': {}}
        for lang in ('de', 'en'):
            if not frage.get(lang):
                continue
            antwort, stimme = fragen_an_figur(a.dienst, a.figur, lang, frage[lang])
            eintrag['frage'][lang] = frage[lang]
            eintrag['antwort'][lang] = antwort.get('reply', '')
            s = stimme.get('stimme') if isinstance(stimme, dict) else None
            if s and s.get('daten'):
                endung = 'wav' if 'wav' in s.get('mime', '') else 'mp3'
                name = hashlib.sha256((lang + frage[lang]).encode()).hexdigest()[:16] + '.' + endung
                with open(os.path.join(a.ziel, name), 'wb') as f:
                    f.write(base64.b64decode(s['daten']))
                eintrag['audio'][lang] = name
            print(f'  {lang}: {frage[lang][:50]} → {len(eintrag["antwort"][lang])} Zeichen' + (' + Stimme' if lang in eintrag['audio'] else ' (ohne Stimme)'))
        antworten.append(eintrag)
    with open(os.path.join(a.ziel, 'antworten.json'), 'w', encoding='utf-8') as f:
        json.dump({'figur': a.figur, 'antworten': antworten}, f, ensure_ascii=False, indent=2)
    print(f'{len(antworten)} Antworten in {a.ziel}')


if __name__ == '__main__':
    sys.exit(main())
