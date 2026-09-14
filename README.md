# Zweig `wartung`

Wartungsseite für https://robinjameslewis-star.github.io/rjl-visitenkarte/ – ohne Skripte,
ohne Cal.com, ohne Google Fonts. Die Ordner `assets/` bleiben erreichbar, damit das
Signaturbild `assets/signatur-rotkehlchen.png` in E-Mails weiter angezeigt wird.

Die eigentliche Seite liegt auf `main`. Umschalten der GitHub-Pages-Quelle:

```bash
# offline (Wartungsseite)
gh api -X PUT repos/robinjameslewis-star/rjl-visitenkarte/pages -f 'source[branch]=wartung' -f 'source[path]=/'

# wieder online (main)
gh api -X PUT repos/robinjameslewis-star/rjl-visitenkarte/pages -f 'source[branch]=main' -f 'source[path]=/'
```
