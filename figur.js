// Figur zur Laufzeit (Messegerät, FIGUREN.md, 23.10.2026): lädt ein Figurenpaket (figur.json) und baut die Bühne –
// Posen am Auge auf die Sitzpose ausgerichtet oder ein Logo, das mit der Stimme pulsiert. Auf der Startseite steht Goch
// als festes Markup in index.html; tools/figur-pruefen.mjs --html hält beides deckungsgleich.
(() => {
  'use strict';
  // Posen der Figur und ihre Namen in der Szene (wie POSEN in tools/figur-pruefen.mjs)
  const NAMEN = { sitzend: 'rest', aufschlag: 'up', gleiten: 'glide', abschlag: 'down', landeanflug: 'landing',
    'schnabel-halb': 'halb', 'schnabel-offen': 'offen', lauschend: 'lauschen', zwitschernd: 'zwitschern' };
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');

  // Lage einer Pose in Prozent der Bühne, am Auge ausgerichtet (dieselbe Rechnung wie in figur-pruefen).
  function versatz(figur, name) {
    const a = figur.animation, p = a.posen[name];
    return { links: -(p.auge[0] - a.auge[0]) / a.buehne.breite * 100, oben: -(p.auge[1] - a.auge[1]) / a.buehne.hoehe * 100,
      breite: p.breite / a.buehne.breite * 100 };
  }

  async function laden(basis) {
    const r = await fetch(basis + 'figur.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('figur.json ' + r.status);
    return r.json();
  }

  // Baut die Figur in das Element `buehne` und liefert die Steuerung. fassung: Name aus animation.fassungen
  // (Standard: „ohne-landschaft“, sonst die erste) – auf Papier mit multiply, wie auf der Startseite.
  function bauen(figur, basis, buehne, { fassung } = {}) {
    const a = figur.animation, fassungen = a.fassungen || {};
    const ordner = fassungen[fassung] || fassungen['ohne-landschaft'] || Object.values(fassungen)[0] || 'bilder/';
    buehne.replaceChildren();
    buehne.classList.add('figur', 'figur-' + a.art);
    const bild = (datei, klasse) => {
      const img = document.createElement('img');
      img.src = basis + ordner + datei; img.alt = ''; img.decoding = 'async'; img.className = klasse;
      img.draggable = false;
      return img;
    };
    const kippen = document.createElement('div');
    kippen.className = 'figur-kippen';
    buehne.append(kippen);
    const frames = {};
    if (a.art === 'logo') {
      const l = a.logo;
      buehne.style.aspectRatio = l.breite + ' / ' + l.hoehe;
      kippen.append(frames.rest = bild(l.datei, 'figur-bild figur-logo'));
    } else {
      buehne.style.aspectRatio = a.buehne.breite + ' / ' + a.buehne.hoehe;
      for (const [name, p] of Object.entries(a.posen || {})) {
        if (!p || !p.datei || !NAMEN[name] || ['aufschlag', 'gleiten', 'abschlag', 'landeanflug'].includes(name)) continue;
        const v = versatz(figur, name), img = bild(p.datei, 'figur-bild');
        Object.assign(img.style, { left: v.links + '%', top: v.oben + '%', width: v.breite + '%', opacity: name === 'sitzend' ? '1' : '0' });
        img.dataset.pose = NAMEN[name];
        kippen.append(frames[NAMEN[name]] = img);
      }
    }
    const puls = a.puls || { min: 1, max: 1.06 };
    function zeige(pose) {
      const ziel = frames[pose];
      if (!ziel) return false;
      Object.values(frames).forEach(f => { f.style.opacity = f === ziel ? '1' : '0'; });
      return true;
    }
    let lauscht = false;
    const steuerung = {
      figur,
      // Schnabel: Pose, sonst leichtes Neigen (data-mund, CSS); Logo: Puls mit dem Pegel. Reduzierte Bewegung: ruhig.
      mund(stufe) {
        if (ruhig.matches) stufe = 'zu';
        if (a.art === 'logo') return;
        if (stufe === 'zu') { delete buehne.dataset.mund; if (!lauscht) zeige('rest'); return; }
        if (!zeige(stufe)) buehne.dataset.mund = stufe;
      },
      pegel(rms) {
        if (a.art === 'logo') {
          const s = ruhig.matches ? 1 : puls.min + (puls.max - puls.min) * Math.min(1, rms * 6);
          kippen.style.transform = 'scale(' + s.toFixed(4) + ')';
          return;
        }
        steuerung.mund(rms > .09 ? 'offen' : rms > .025 ? 'halb' : 'zu');
      },
      ruhe() { kippen.style.transform = ''; steuerung.mund('zu'); },
      lauschen(an) {
        lauscht = an && !ruhig.matches;
        if (lauscht) { if (!zeige('lauschen')) buehne.dataset.lauscht = '1'; }
        else { delete buehne.dataset.lauscht; zeige('rest'); }
      },
      zwitschern() {
        buehne.classList.remove('zwitschert'); void buehne.offsetWidth; buehne.classList.add('zwitschert');
        setTimeout(() => buehne.classList.remove('zwitschert'), 2600);
      },
      // Signalton aus dem Paket (Ogg/Opus, MP3 als Rückfall); null, solange es keinen gibt.
      signalton() {
        const t = figur.signalton || {};
        if (!t.datei) return null;
        const ogg = document.createElement('audio').canPlayType('audio/ogg; codecs=opus');
        return basis + 'toene/' + (ogg || !t.rueckfall ? t.datei : t.rueckfall);
      },
    };
    return steuerung;
  }

  window.GochFigur = { laden, bauen, versatz, NAMEN };
})();
