/* Sonnen-/Mondformeln: eigene kompakte Portierung von SunCalc 1.9.0.
 * (c) 2011–2015 Vladimir Agafonkin, BSD-2-Clause; siehe LICENSE-SUNCALC.
 * https://github.com/mourner/suncalc/blob/v1.9.0/suncalc.js
 * Winkel intern/öffentlich in Radiant, Koordinaten in Grad: Azimut 0=Süd,
 * −π/2=Ost, +π/2=West, ±π=Nord. Sonnenhöhe geometrisch, Mond mit Refraktion.
 */
(() => {
  'use strict';
  const { PI, sin, cos, tan, asin, acos, atan2 } = Math;
  const rad = PI / 180, day = 86400000, tilt = 23.4397 * rad;
  const clamp = x => Math.max(0, Math.min(1, x));
  const days = date => +date / day - 10957.5;
  const equatorial = (l, b) => ({
    ra: atan2(sin(l) * cos(tilt) - tan(b) * sin(tilt), cos(l)),
    dec: asin(sin(b) * cos(tilt) + cos(b) * sin(tilt) * sin(l))
  });
  function sunCoords(d) {
    const m = rad * (357.5291 + .98560028 * d);
    return equatorial(m + rad * (1.9148 * sin(m) + .02 * sin(2*m) + .0003 * sin(3*m) + 102.9372) + PI, 0);
  }
  function moonCoords(d) {
    const m = rad * (134.963 + 13.064993 * d);
    return { ...equatorial(rad * (218.316 + 13.176396*d + 6.289*sin(m)),
      rad * 5.128 * sin(rad * (93.272 + 13.229350*d))), distance: 385001 - 20905*cos(m) };
  }
  function position(date, lat, lon, lunar) {
    const d = days(date), c = lunar ? moonCoords(d) : sunCoords(d), p = lat * rad;
    const h = rad * (280.16 + 360.9856235*d + lon) - c.ra;
    let altitude = asin(sin(p)*sin(c.dec) + cos(p)*cos(c.dec)*cos(h));
    const result = { azimuth: atan2(sin(h), cos(h)*sin(p) - tan(c.dec)*cos(p)), altitude };
    if (lunar) {
      const a = Math.max(0, altitude);
      result.altitude += .0002967 / tan(a + .00312536 / (a + .08901179));
      result.distance = c.distance;
      result.parallacticAngle = atan2(sin(h), tan(p)*cos(c.dec) - sin(c.dec)*cos(h));
    }
    return result;
  }
  const sunPosition = (date, lat, lon) => position(date, lat, lon, false);
  const moonPosition = (date, lat, lon) => position(date, lat, lon, true);
  function moonIllumination(date) {
    const d = days(date), s = sunCoords(d), m = moonCoords(d);
    const separation = sin(s.dec)*sin(m.dec) + cos(s.dec)*cos(m.dec)*cos(s.ra-m.ra);
    const phi = acos(Math.max(-1, Math.min(1, separation)));
    const inc = atan2(149598000*sin(phi), m.distance - 149598000*cos(phi));
    const angle = atan2(cos(s.dec)*sin(s.ra-m.ra), sin(s.dec)*cos(m.dec) - cos(s.dec)*sin(m.dec)*cos(s.ra-m.ra));
    return { fraction: (1+cos(inc))/2, phase: .5 + .5*inc*(angle<0 ? -1 : 1)/PI, angle };
  }

  // Beleuchtete Kugelhälfte orthografisch: Flächenanteil fraction, nicht lineare Sichelbreite.
  function moonPhasePath(fraction, waxing, radius = 15) {
    const f = clamp(fraction), r = radius, k = 1 - 2*f;
    if (f === 0) return '';
    if (f === 1) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
    const terminator = Math.abs(k) < 1e-12 ? `L0 ${-r}` :
      `A${Math.abs(k)*r} ${r} 0 0 ${waxing?(k>0?0:1):(k>0?1:0)} 0 ${-r}`;
    return `M0 ${-r}A${r} ${r} 0 0 ${waxing?1:0} 0 ${r}${terminator}Z`;
  }
  function moonAppearance(sunAltitude, fraction, moonAltitude) {
    const smooth = x => { const t=clamp(x); return t*t*(3-2*t); };
    if (moonAltitude <= 0) return { light: 0, earthshine: 0 };
    const f=clamp(fraction), elongation=acos(1-2*f)/rad;
    // Atmosphärischer Kontrast als gestalterische Näherung, keine Photometrie.
    // Tageshimmel überstrahlt die unbeleuchtete Seite vollständig; kein grauer Neumondkreis.
    const night=smooth(-sunAltitude/rad/8), haze=smooth(moonAltitude/rad/2);
    return {
      light: f === 0 ? 0 : haze*(night+(1-night)*.35*smooth((elongation-10)/30)),
      earthshine: haze*.055*night*(1-f)**2*smooth((elongation-5)/10)
    };
  }
  // Die Aquarellfarbe bleibt durchsichtig, das Gelände verdeckt dennoch die Himmelskörper.
  // Auch sehr blasse Kammlinien zählen; Pixel unter 8/255 sind Freistellungsrauschen.
  function terrainHorizon(rgba, width, height, threshold = 8) {
    const result=new Array(width).fill(height);
    for (let x=0;x<width;x++) for (let y=0;y<height;y++) {
      if (rgba[(y*width+x)*4+3]>=threshold) { result[x]=y; break; }
    }
    return result;
  }

  // Zeitzonen liefern nur repräsentative Orte, niemals einen ermittelten Standort.
  const zones = {
    'Europe/Berlin':[52.52,13.41], 'Europe/London':[51.51,-.13],
    'Europe/Paris':[48.86,2.35], 'Europe/Rome':[41.90,12.50],
    'Europe/Madrid':[40.42,-3.70], 'Europe/Lisbon':[38.72,-9.14],
    'Europe/Amsterdam':[52.37,4.90], 'Europe/Zurich':[47.38,8.54],
    'Europe/Vienna':[48.21,16.37], 'Europe/Prague':[50.08,14.44],
    'Europe/Warsaw':[52.23,21.01], 'Europe/Stockholm':[59.33,18.07],
    'Europe/Helsinki':[60.17,24.94], 'Europe/Athens':[37.98,23.73],
    'Europe/Istanbul':[41.01,28.98], 'Europe/Moscow':[55.76,37.62],
    'America/New_York':[40.71,-74.01], 'America/Chicago':[41.88,-87.63],
    'America/Denver':[39.74,-104.99], 'America/Los_Angeles':[34.05,-118.24],
    'America/Anchorage':[61.22,-149.90], 'America/Toronto':[43.65,-79.38],
    'America/Vancouver':[49.28,-123.12], 'America/Mexico_City':[19.43,-99.13],
    'America/Bogota':[4.71,-74.07], 'America/Sao_Paulo':[-23.55,-46.63],
    'America/Argentina/Buenos_Aires':[-34.60,-58.38], 'America/Santiago':[-33.45,-70.67],
    'Africa/Cairo':[30.04,31.24], 'Africa/Lagos':[6.52,3.38],
    'Africa/Johannesburg':[-26.20,28.05], 'Africa/Nairobi':[-1.29,36.82],
    'Asia/Dubai':[25.20,55.27], 'Asia/Kolkata':[22.57,88.36],
    'Asia/Bangkok':[13.76,100.50], 'Asia/Singapore':[1.35,103.82],
    'Asia/Shanghai':[31.23,121.47], 'Asia/Tokyo':[35.68,139.69],
    'Asia/Seoul':[37.57,126.98], 'Australia/Sydney':[-33.87,151.21],
    'Australia/Perth':[-31.95,115.86], 'Pacific/Auckland':[-36.85,174.76],
    'Pacific/Honolulu':[21.31,-157.86], 'Atlantic/Reykjavik':[64.15,-21.94]
  };
  function locationForZone(zone, offsetMinutes) {
    const point = Object.prototype.hasOwnProperty.call(zones, zone) && zones[zone];
    return { lat: point ? point[0] : 45,
      lon: point ? point[1] : -(Number.isFinite(offsetMinutes) ? offsetMinutes : 0)/60*15,
      approximate: true };
  }
  // zeit ist Geräte-Ortszeit, ort ist Breitengrad,Längengrad. Ungültiges ignorieren.
  function parseOverrides(search, now) {
    const params = new URLSearchParams(search), text = params.get('zeit') || '';
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
    let date = new Date(+now), timeOverridden = false, location = null;
    if (match) {
      const [y,m,d,h,min] = match.slice(1).map(Number), candidate = new Date(0);
      candidate.setFullYear(y,m-1,d); candidate.setHours(h,min,0,0);
      if (candidate.getFullYear()===y && candidate.getMonth()===m-1 && candidate.getDate()===d &&
          candidate.getHours()===h && candidate.getMinutes()===min) {
        date = candidate; timeOverridden = true;
      }
    }
    const coordinates = /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(params.get('ort') || '');
    if (coordinates) {
      const lat = Number(coordinates[1]), lon = Number(coordinates[2]);
      if (Math.abs(lat)<=90 && Math.abs(lon)<=180) location = { lat, lon, approximate: false };
    }
    return { date, location, timeOverridden };
  }
  const seasons = ['winter','spring','summer','autumn'];
  function seasonState(date, lat) {
    const y = date.getFullYear(), m = date.getMonth(), shift = lat<0 ? 2 : 0;
    const name = n => seasons[(n+shift+4)%4], current = name(Math.floor((m+1)/3)%4);
    // Kalendertage statt Millisekunden-Ortszeit: kein Sprung durch Sommerzeit.
    const t = Date.UTC(y,m,date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds());
    for (const boundary of [2,5,8,11]) {
      const delta = (t-Date.UTC(y,boundary,1))/day;
      if (Math.abs(delta)<=5) {
        const next = Math.floor((boundary+1)/3)%4;
        return { from: name(next-1), to: name(next), blend: clamp((delta+5)/10), current };
      }
    }
    return { from: current, to: current, blend: 1, current };
  }
  const nightFactor = altitude => clamp(-altitude/rad/12);
  function stagePosition(altitude, azimuth, lat) {
    // Gefalteter Bühnenbogen: Nord UND Süd mittig, Ost rechts, West links.
    // Auf der Südhalbkugel horizontal gespiegelt; y=1 Horizont, y=0 ab 65°.
    const x = (1-sin(azimuth))/2;
    return { x: lat<0 ? 1-x : x, y: 1-clamp(altitude/rad/65), visible: altitude>=0 };
  }
  // Eine Landschaft ist ein Satz aus Bildern je Ebene und Jahreszeit, dazu Blätterart und Himmelsfarben; beschrieben in
  // assets/landschaften/<satz>/landschaft.json (schreibt die Redaktion). Ferne und Krone gehören zur Bühne; mitte
  // (Höhenzüge), hang und grund (Talgrund) sind die Talebenen unterhalb der Bühne („Ein Tal“, 11.11.2026).
  const SET_DIR = 'assets/landschaften/', SEASONS = ['herbst','winter','fruehling','sommer'];
  const LAYERS = { ferne: { sizes: [1400, 800], budget: 150000 }, krone: { sizes: [1000, 560], budget: 120000 },
    mitte: { sizes: [1400, 900], budget: 200000 }, hang: { sizes: [1400, 900], budget: 200000 }, grund: { sizes: [1400, 900], budget: 200000 } };
  const PARTICLES = { blaetter: 'leaf', schnee: 'snow', blueten: 'petal', keine: '' };
  const DEFAULT_SET = { name: '', ebenen: {},
    blaetter: { herbst: 'blaetter', winter: 'schnee', fruehling: 'blueten', sommer: 'keine' },
    himmel: { nacht: ['#172137','#242C38','#242C38'], daemmerung: ['#4E6378','#D4B8A0','#D99B69'],
      tief: ['#CFDEE2','#F2DDC1','#E5B282'], tag: ['#E2ECEC','#F6EEDF','#F6EEDF'] } };
  const isColor = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  function normalizeSet(raw) {
    const r = raw && typeof raw === 'object' ? raw : {}, set = { name: String(r.name || '').slice(0, 80), ebenen: {}, blaetter: {}, himmel: {} };
    SEASONS.forEach(season => {
      const e = r.ebenen && r.ebenen[season];
      Object.keys(LAYERS).forEach(layer => { if (e && e[layer]) set.ebenen[season] = { ...set.ebenen[season], [layer]: { avif: !!e[layer].avif, bytes: Number(e[layer].bytes) || 0 } }; });
      const kind = r.blaetter && r.blaetter[season];
      set.blaetter[season] = kind in PARTICLES ? kind : DEFAULT_SET.blaetter[season];
    });
    Object.keys(DEFAULT_SET.himmel).forEach(state => {
      const c = r.himmel && r.himmel[state];
      set.himmel[state] = Array.isArray(c) && c.length === 3 && c.every(isColor) ? c.map(x => x.toUpperCase()) : DEFAULT_SET.himmel[state];
    });
    return set;
  }
  function applyColors(root, n) {
    const style = root.style, initial = getComputedStyle(root);
    const roles = ['paper','ink','ink-soft','ink-muted','green','copper','line','hover','surface','reply','warning'];
    const rgb = value => value.trim().replace('#','').match(/../g).map(v => parseInt(v,16));
    const palette = Object.fromEntries(roles.map(k => [k, ['day','night'].map(t => rgb(initial.getPropertyValue('--'+k+'-'+t)))]));
    const mix = (a,b,t) => a.map((n,i) => n+(b[i]-n)*t);
    const color = a => '#'+a.map(n => Math.round(n).toString(16).padStart(2,'0')).join('');
    const lum = c => c.map(n => (n/=255)<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
    const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    style.setProperty('--nacht',n); style.setProperty('--nacht-prozent',n*100+'%');
    const backgrounds = ['paper','surface','hover','reply'].map(k => mix(...palette[k],n));
    roles.forEach(k => {
      let c = mix(...palette[k],n);
      if (['ink','ink-soft','ink-muted','green','warning'].includes(k)) {
        // Bei Dämmerung würden zwei mittlere Töne unlesbar. Nur Textfarben nachführen.
        const target = lum(backgrounds[0])>.18?[20,25,24]:[250,247,239];
        const original = c;
        for (let t=0; t<=1 && Math.min(...backgrounds.map(bg=>contrast(c,bg)))<4.5; t+=.025) c=mix(original,target,t);
        style.setProperty('--readable-'+k,color(c));
      }
      const fallback = ['ink','ink-soft','ink-muted','green','warning'].includes(k)?c:palette[k][n>=.5?1:0];
      style.setProperty('--fallback-'+k,color(fallback));
    });
  }
  // Vor dem ersten sichtbaren Inhalt: dieselbe Astronomie und Palette wie beim Minuten-Update.
  // Der Redaktionsschalter steht am body; deshalb ruft dessen erstes Inline-Skript prepare() auf.
  function prepare() {
    const root = document.documentElement;
    const wish = new URLSearchParams(location.search).get('landschaft');
    // Läuft auf den Unterseiten schon im <head> (worker/src/kopf.js): Dort gibt es noch kein <body>.
    if (wish === 'aus' || (!wish && document.body && document.body.dataset.landschaft === 'aus')) {
      root.classList.add('landscape-off');
      return;
    }
    const input = parseOverrides(location.search, new Date());
    const place = input.location || locationForZone(Intl.DateTimeFormat().resolvedOptions().timeZone, input.date.getTimezoneOffset());
    applyColors(root, nightFactor(sunPosition(input.date, place.lat, place.lon).altitude));
    root.classList.remove('landscape-off');
    root.classList.add('landscape-on');
  }
  const api = { sunPosition, moonPosition, moonIllumination, moonPhasePath, moonAppearance, terrainHorizon, locationForZone,
    parseOverrides, seasonState, nightFactor, stagePosition, normalizeSet, prepare, applyColors, SET_DIR, SEASONS, LAYERS, PARTICLES, DEFAULT_SET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof window !== 'undefined') window.RJLLandscape = api;
})();

// Aufruf am Ende des body, weiterhin vor Vogel, Sprache und Einwilligung.
if (typeof window !== 'undefined' && window.RJLLandscape) window.RJLLandscape.init = function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const root = document.documentElement, scene = document.getElementById('scene');
  if (!scene) return;
  const api = window.RJLLandscape, stage = scene.closest('.stage');
  const wish = new URLSearchParams(location.search).get('landschaft'); // 'aus' schaltet ab; 'an' oder ein Satzname übersteuert den Schalter der Redaktion
  const wantOn = !!wish && wish !== 'aus';
  // Vogel und Ast gibt es zweimal: …/bestand/ (ohne Landschaft: kurzer Ast, Vogel auf Weiß) und ohne bestand/
  // (mit Landschaft: langer Ast, freigestellter Vogel). Der Ast liegt in assets/, der Vogel seit 23.10.2026 im
  // Figurenpaket figuren/goch/bilder/. Die Startseite trägt die Pfade der eingeschalteten Fassung, damit vom ersten
  // Bild an das Richtige steht; nur ?landschaft=an|aus tauscht hier zur Laufzeit.
  const SCENE_PATH = /^((?:assets|figuren\/[a-z0-9-]+\/bilder)\/)(?:bestand\/)?(.+)$/;
  const use = bestand => document.querySelectorAll('.scene img').forEach(img => {
    ['src', 'data-src', 'data-src-spaet'].forEach(attr => {
      const src = img.getAttribute(attr), m = src && src.match(SCENE_PATH);
      const want = m && m[1] + (bestand ? 'bestand/' : '') + m[2];
      if (m && src !== want) img.setAttribute(attr, want);
    });
  });
  if (!wantOn && (root.classList.contains('landscape-off') || document.body.dataset.landschaft === 'aus')) {
    root.classList.add('landscape-off');
    use(true);
    return;
  }
  root.classList.remove('landscape-off'); use(false);
  scene.dataset.flightRoute = 'under-branch';
  // Welcher Satz: ?landschaft=<satz> zeigt einen bestimmten (Vorschau), sonst der von der Redaktion gesetzte.
  const slug = wish && wish !== 'an' && /^[a-z0-9-]{1,40}$/.test(wish) ? wish : (document.body.dataset.landschaftSatz || 'burgberg-herbst');
  const SETS = (window.RJLWurzel || '') + api.SET_DIR; // Unterseiten (goch-seite.js) holen die Sätze von der Wurzel der Website
  let set = api.normalizeSet(null), preview = {}; // preview: Blob-URLs der Redaktion je Jahreszeit+Ebene, noch ungespeichert
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const input = api.parseOverrides(location.search, new Date());
  const place = input.location || api.locationForZone(Intl.DateTimeFormat().resolvedOptions().timeZone, input.date.getTimezoneOffset());
  const area = document.createElement('div');
  area.className = 'landscape'; area.setAttribute('aria-hidden', 'true');
  area.innerHTML = `<svg class="landscape-svg-defs"><defs>
    <filter id="landscape-moonlight" color-interpolation-filters="sRGB"><feColorMatrix type="matrix"/></filter>
    <symbol id="leaf-0" viewBox="0 0 20 30"><path d="M10 29C-4 18 0 5 10 1C23 10 21 23 10 29Z"/></symbol>
    <symbol id="leaf-1" viewBox="0 0 20 30"><path d="M10 29C1 21-1 9 12 1C20 9 20 22 10 29Z"/></symbol>
    <symbol id="leaf-2" viewBox="0 0 20 30"><path d="M9 29C2 20 4 10 12 1C24 16 18 24 9 29Z"/></symbol>
    <symbol id="petal" viewBox="0 0 20 30"><path d="M10 28C-6 15 2-5 10 5C24-7 25 19 10 28Z"/></symbol>
    </defs></svg><div class="landscape-sky"></div><div class="landscape-celestial"><svg class="landscape-stars" viewBox="0 0 1000 400" preserveAspectRatio="none"></svg>
    <div class="landscape-orb landscape-sun"></div><svg class="landscape-orb landscape-moon" viewBox="-16 -16 32 32"><circle class="dark" r="15"/><path class="light"/></svg></div><div class="landscape-particles"></div>`;
  stage.prepend(area);
  const stars = area.querySelector('.landscape-stars'), sun = area.querySelector('.landscape-sun');
  const moon = area.querySelector('.landscape-moon'), particles = area.querySelector('.landscape-particles');
  const celestial = area.querySelector('.landscape-celestial');
  const silhouettes = new WeakMap();
  let maskKey = '';
  let seed = 417, seasonKey = '', frames = [];
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 60; i++) stars.insertAdjacentHTML('beforeend', `<circle cx="${random()*1000}" cy="${random()*360}" r="${.55+random()*.65}" style="animation-delay:-${random()*5}s"/>`);
  const style = root.style;
  function colors(n) {
    api.applyColors(root, n);
    const r=1-.45*n,g=1-.38*n,b=1-.20*n;
    area.querySelector('feColorMatrix').setAttribute('values',`${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`);
  }
  function silhouette(img, terrain) {
    if (!img.complete || !img.naturalWidth) return null;
    const src=img.currentSrc||img.src, cached=silhouettes.get(img);
    if (cached && cached.src===src) return cached;
    const canvas=document.createElement('canvas');
    canvas.width=Math.min(1400,img.naturalWidth);
    canvas.height=Math.max(1,Math.round(img.naturalHeight*canvas.width/img.naturalWidth));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    try {
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height);
      const horizon=terrain?api.terrainHorizon(data.data,canvas.width,canvas.height):null;
      if (!terrain) {
        for (let i=0;i<data.data.length;i+=4) data.data[i+3]=Math.max(0,Math.min(255,(data.data[i+3]-3)*16));
        ctx.putImageData(data,0,0);
      }
      const result={src,canvas,horizon}; silhouettes.set(img,result); return result;
    } catch (_) { return null; } // Fremdbilder dürfen die übrige Szene nicht lahmlegen.
  }
  function maskStars() {
    // Verdeckung durch die ganze Mondkugel, unabhängig von Phase und sichtbarer Helligkeit.
    const m=moon.getBoundingClientRect(), s=stars.getBoundingClientRect();
    const radius=m.width*15/32, x=m.left+m.width/2-s.left, y=m.top+m.height/2-s.top;
    const mask=moon.hasAttribute('hidden')?'none':
      `radial-gradient(circle at ${x}px ${y}px,transparent ${Math.max(0,radius-.3)}px,#000 ${radius+.3}px)`;
    stars.style.maskImage=mask; stars.style.webkitMaskImage=mask;
  }
  function maskCelestial() {
    const box=area.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const layers=frames.filter(f=>f.isConnected && Number(f.style.opacity||1)>.001).map(f=>{
      const img=f.querySelector('img'), rect=f.getBoundingClientRect();
      return {img,rect,terrain:f.classList.contains('landscape-far'),opacity:Number(f.style.opacity||1),
        fade:parseFloat(getComputedStyle(f).getPropertyValue('--crown-fade'))||0};
    });
    const key=JSON.stringify([box.width,box.height,layers.map(({img,rect,terrain,opacity,fade})=>
      [img.currentSrc||img.src,img.complete,img.naturalWidth,rect.x-box.x,rect.y-box.y,rect.width,rect.height,terrain,opacity,fade])]);
    if (key===maskKey) return;
    maskKey=key;
    if (!layers.length) { celestial.style.maskImage='none'; celestial.style.webkitMaskImage='none'; return; }
    const canvas=document.createElement('canvas'); canvas.width=Math.ceil(box.width); canvas.height=Math.ceil(box.height);
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation='destination-out';
    layers.forEach(({img,rect,terrain,opacity,fade})=>{
      const cut=silhouette(img,terrain); if (!cut) return;
      const x=rect.left-box.left,y=rect.top-box.top,w=rect.width,h=rect.height;
      if (!terrain) {
        ctx.globalAlpha=opacity;
        if (fade>0) {
          const crown=document.createElement('canvas'); crown.width=Math.ceil(w); crown.height=Math.ceil(h);
          const c=crown.getContext('2d'); c.drawImage(cut.canvas,0,0,w,h);
          const gradient=c.createLinearGradient(0,0,0,fade);
          gradient.addColorStop(0,'transparent'); gradient.addColorStop(1,'#000');
          c.globalCompositeOperation='destination-in'; c.fillStyle=gradient; c.fillRect(0,0,w,h);
          ctx.drawImage(crown,x,y);
        } else ctx.drawImage(cut.canvas,x,y,w,h);
        ctx.globalAlpha=1; return;
      }
      const line=cut.horizon, width=line.length, height=cut.canvas.height;
      for (let start=0;start<width;start++) {
        if (line[start]===height) continue;
        let end=start; while (end+1<width && line[end+1]<height) end++;
        ctx.beginPath(); ctx.moveTo(x+start/width*w,canvas.height);
        for (let col=start;col<=end;col++) ctx.lineTo(x+(col+.5)/width*w,y+line[col]/height*h);
        ctx.lineTo(x+(end+1)/width*w,canvas.height); ctx.closePath(); ctx.fill(); start=end;
      }
    });
    const mask=`url("${canvas.toDataURL()}")`;
    celestial.style.maskImage=mask; celestial.style.webkitMaskImage=mask;
  }
  function geometry() {
    const s=scene.getBoundingClientRect(), box=stage.getBoundingClientRect();
    style.setProperty('--scene-top',s.top-box.top+'px'); style.setProperty('--scene-height',s.height+'px');
    style.setProperty('--horizon',s.top-box.top+s.height*.8448-box.width*.55/3.8*.7+'px');
    const branch=scene.querySelector('.branch img'); branch.width=2800; branch.height=167;
    // Breite Bildschirme: Der Ast ist 2,43 Szenenbreiten lang. Reicht das nicht bis zum Fensterrand (ab etwa 2100 px),
    // rückt die Krone ans Astende, der Ast läuft davor weich aus, und die Blätter fallen wieder neben dem Vogel –
    // statt Krone am fernen Rand, Ast mit harter Kante im Papier und Blätter aus dem Nichts.
    const branchEnd=s.left+s.width*2.4284475, inset=Math.max(0,document.documentElement.clientWidth-branchEnd);
    style.setProperty('--landscape-inset',inset+'px');
    const wrap=scene.querySelector('.branch'), fade=inset>0?'linear-gradient(to right,#000 84%,transparent 99%)':'';
    wrap.style.maskImage=fade; wrap.style.webkitMaskImage=fade;
    const crown=area.querySelector('.landscape-crown');
    if (crown) {
      // Kronenbreite wie auf einem Fenster, das am Astende endet – höchstens 1,15 Szenenbreiten, damit sie den Vogel nicht überwächst.
      crown.style.width=inset>0?Math.max(300,Math.min(1.15*s.width,box.width*.4+(document.documentElement.clientWidth-2*inset-box.width)*.15))+'px':'';
      const c=crown.getBoundingClientRect();
      particles.querySelectorAll('.landscape-particle').forEach((leaf,i) => {
        const x=c.left-box.left+c.width*(.18+(i%5)*.13);
        leaf.style.left=x+'px'; leaf.style.top=c.top-box.top+c.height*(.22+(i%3)*.12)+'px';
        leaf.style.setProperty('--drift',-Math.min(box.width*.55,x)+'px');
        leaf.style.setProperty('--fall',Math.max(120,s.bottom-c.top)+'px');
      });
    }
    maskCelestial(); maskStars();
  }
  // Die Rechenschicht spricht englisch (autumn …), die Dateien deutsch (herbst …).
  const FILE={autumn:'herbst',winter:'winter',spring:'fruehling',summer:'sommer'};
  // <picture> Stück für Stück bauen: Über innerHTML holt WebKit das WebP des <img>, bevor die AVIF-Quelle zählt – beide Dateien
  // kämen dann (12.11.2026: Krone rund 115 KB doppelt). Die Quelle hängt deshalb schon im <picture>, bevor das <img> seine Adresse bekommt.
  function fill(picture,own,base,small,big,sizes) {
    const img=document.createElement('img'); img.alt=''; img.decoding='async';
    if (own.avif) { const source=document.createElement('source'); source.type='image/avif'; source.sizes=sizes; source.srcset=`${base+small}.avif ${small}w, ${base+big}.avif ${big}w`; picture.append(source); }
    picture.append(img);
    img.sizes=sizes; img.srcset=`${base+small}.webp ${small}w, ${base+big}.webp ${big}w`; img.src=base+big+'.webp';
  }
  function seasonal(state) {
    const key=state.from+state.to;
    if (key!==seasonKey) {
      seasonKey=key; frames.forEach(f=>f.remove()); frames=[];
      // Nur Ebenen bauen, die der Satz nennt; fehlende erzeugen auch keine 404-Anfrage.
      const layer=(season,kind)=>(set.ebenen[FILE[season]]||{})[kind];
      [...new Set([state.to,state.from])].forEach(season => {
        ['krone','ferne'].forEach(kind => {
          const own=layer(season,kind), url=preview[FILE[season]+kind];
          if (!own && !url) return;
          const [big,small]=api.LAYERS[kind].sizes;
          const base=SETS+slug+'/'+kind+'-'+FILE[season]+'-', sizes=kind==='krone'?'(max-width:720px) 60vw, 560px':'(max-width:720px) 62vw, 616px';
          const picture=document.createElement('picture'); picture.className='landscape-picture landscape-'+(kind==='krone'?'crown':'far');
          picture.dataset.season=season;
          if (url) picture.innerHTML=`<img src="${url}" alt="" decoding="async">`; // ungespeicherte Vorschau aus der Redaktion
          else {
            fill(picture,own,base,small,big,sizes);
            const ext=own.avif?'avif':'webp', preload=document.createElement('link'); preload.rel='preload'; preload.as='image'; preload.type='image/'+ext;
            preload.href=base+big+'.'+ext; preload.imageSrcset=base+small+'.'+ext+' '+small+'w, '+base+big+'.'+ext+' '+big+'w'; preload.imageSizes=sizes;
            document.head.append(preload);
          }
          area.insertBefore(picture,particles); frames.push(picture);
          const img=picture.querySelector('img');
          img.onload=()=>{ maskKey=''; geometry(); };
          img.onerror=()=>{ picture.remove(); maskKey=''; geometry(); };
        });
      });
      particles.replaceChildren();
      // Blätterart je Jahreszeit aus dem Satz; Blätter fallen nur aus einer vorhandenen Krone, Schnee und Blüten immer.
      const kind=api.PARTICLES[set.blaetter[FILE[state.current]]]||'';
      if (kind && (kind!=='leaf'||layer(state.current,'krone')||preview[FILE[state.current]+'krone'])) for(let i=0;i<10;i++) {
        const leaf=document.createElement(kind==='snow'?'span':'div'); leaf.className='landscape-particle '+kind;
        if(kind!=='snow') leaf.innerHTML=`<svg viewBox="0 0 20 30"><use href="#${kind==='leaf'?'leaf-'+i%3:'petal'}"/></svg>`;
        leaf.style.setProperty('--duration',9+random()*6+'s'); leaf.style.setProperty('--delay',-random()*15+'s');
        // Ohne Kronenbild fallen Schnee/Blüten aus dem oberen rechten Bühnenbereich.
        leaf.style.cssText+=';left:'+(65+random()*30)+'%;top:0;--drift:-250px;--fall:350px'; particles.append(leaf);
      }
      geometry();
    }
    frames.forEach(f=>f.style.opacity=f.dataset.season===state.from&&state.from!==state.to?1-state.blend:1);
    root.dataset.season=FILE[state.current];
    maskCelestial();
    stueckLayers(state); talLayers(state);
  }

  // ---------- Tal unterhalb der Bühne („Ein Tal“, 11.11.2026) ----------
  // Die Bühne bleibt, wie sie ist, und scrollt mit der Seite weg. Dahinter liegt fest im Fenster das Tal: Höhenzüge, Hang und
  // Talgrund (Ebenen mitte, hang, grund des Satzes) kommen beim Scrollen herauf, die Bereiche der Seite liegen als Blätter
  // darüber. Hat die Bühne das Fenster verlassen, erscheinen Himmel und Burgberg blass als Ferne des Tals. Schalter:
  // data-tal="an" am <body>, ?tal=an|aus übersteuert zum Prüfen; ohne Landschaft gibt es kein Tal. Die Ebenen laden erst nach
  // dem ersten Bild der Seite. Bei reduzierter Bewegung steht das Tal still (oben die Bühne, darunter ein Bild).
  const talWish=new URLSearchParams(location.search).get('tal');
  const talOn=talWish?talWish!=='aus':document.body.dataset.tal==='an';
  const TAL=[{kind:'mitte',ax:.35,y:.86,w:.54},{kind:'hang',ax:.55,y:1.1,w:.64},{kind:'grund',ax:.8,y:1.42,w:.82}];
  let talLaub=null;
  let tal=null, talFar=null, talFrames=[], talKey='', talState=null, talBild=0;
  function talLayers(state) {
    talState=state;
    if (!tal) return;
    const key=state.from+state.to+slug;
    if (key!==talKey) {
      talKey=key; talFrames.forEach(f=>f.remove()); talFrames=[];
      const layer=(season,kind)=>(set.ebenen[FILE[season]]||{})[kind];
      const picture=(season,kind,sizes,cls)=>{
        const own=layer(season,kind), url=preview[FILE[season]+kind];
        if (!own && !url) return null;
        const [big,small]=api.LAYERS[kind].sizes, base=SETS+slug+'/'+kind+'-'+FILE[season]+'-';
        const p=document.createElement('picture'); p.className='landscape-picture '+cls; p.dataset.season=season;
        if (url) p.innerHTML=`<img src="${url}" alt="" decoding="async">`; else fill(p,own,base,small,big,sizes);
        p.querySelector('img').onerror=()=>p.remove();
        talFrames.push(p); return p;
      };
      [...new Set([state.to,state.from])].forEach(season => {
        const far=picture(season,'ferne','(max-width:720px) 62vw, 616px','tal-burg') /* dieselbe Angabe wie die Bühne: das Bild liegt schon im Cache */; if (far) talFar.append(far);
        // Am Handy genügt die kleine Fassung (Dunst hinter den Blättern): spart dort rund 250 KB, auch bei dreifacher Pixeldichte.
        TAL.forEach(t=>{ const p=picture(season,t.kind,'(max-width:720px) 300px, max(100vw, 1000px)','tal-ebene'); if (p) { p.dataset.kind=t.kind; p.style.setProperty('--ax',t.ax); tal.append(p); } });
      });
    }
    talFrames.forEach(f=>f.style.opacity=f.dataset.season===state.from&&state.from!==state.to?1-state.blend:1);
    // Laub im Tal (Entwurf vom 11.11.2026): wenige Blätter fallen hinter den Blättern der Seite durchs Tal, im Winter Schnee,
    // im Frühling Blüten – je nach Satz (blaetter). Erst unterhalb der Bühne sichtbar (dort fällt schon das Laub der Krone),
    // nicht bei reduzierter Bewegung.
    const art=api.PARTICLES[set.blaetter[FILE[state.current]]]||'';
    if (talLaub && talLaub.dataset.art!==art) {
      talLaub.dataset.art=art; talLaub.replaceChildren();
      const zahl=art==='snow'?12:art==='petal'?6:art?4:0;
      for (let i=0;i<zahl;i++) { const b=document.createElement('i'); b.className='tal-laub '+art; b.style.cssText=`left:${art==='snow'?6+i*7:art==='petal'?30+i*10:48+i*9}%;--d:${9+(i%5)*2.3}s;--w:${(i*1.3).toFixed(1)}s`; talLaub.append(b); }
    }
    talDraw();
  }
  // Talstück („Bühne läuft aus“, Robin 12.11.2026): Im freien Streifen zwischen Bühne und erstem Blatt läuft die Landschaft der
  // Bühne nach unten aus – ein Waldhang als ihr Vordergrund, der gleich unter der Bühne beginnt und im Nebel hinter dem ersten
  // Blatt verschwindet (Maske, Deckkraft und Weichzeichnung in index.html). Kein eigener Kamm: Der einzige Horizont bleibt der
  // der Bühne. Die erste Fassung (Höhenzüge mittig im Streifen) wirkte wie ein zweites Tal über dem Tal.
  // Es liegt im Dokument (scrollt ohne Skript mit), hinter Bühne und Blättern. Nur wo es Bühne und Streifen gibt (Startseite).
  // Platz nimmt es keinen: kein Sprung beim Laden.
  let talStueck=null;
  function talStueckLage() {
    if (!talStueck) return;
    const blatt=stage.nextElementSibling, r=stage.getBoundingClientRect();
    const frei=blatt?parseFloat(getComputedStyle(blatt).marginTop)-28:0; // 28 px: Das Blatt ragt über seinen Bereich hinaus
    talStueck.hidden=!(frei>=70);
    if (talStueck.hidden) return;
    const breit=Math.max(root.clientWidth,1000), hoch=breit*349/900; // Seitenverhältnis der Talebenen; die Baumkronen des Hangs beginnen bei knapp einem Zehntel der Höhe
    // Die Kronen setzen kurz über dem Ende der Bühne an – aber nie hinter den Knöpfen (am Handy enden sie mit der Bühne).
    // Alles in Dokumentkoordinaten: Diese Funktion läuft bei jedem resize, also auch mitten auf der Seite (am iPhone fährt
    // Safari beim Scrollen die Leisten ein und aus). Bis 13.11.2026 war die Unterkante der Knöpfe bei 0 im Fenster geklemmt –
    // weiter unten auf der Seite sprang das Talstück damit an die Scrollposition, und das feste Tal blieb dort verborgen
    // (Robin: „beim iphone hochscrollen sind die neuen täler uach nicht da“; unter Windows am großen Bildschirm ebenso).
    const sy=window.scrollY, knoepfe=[...stage.querySelectorAll('.cta a')].map(a=>a.getBoundingClientRect().bottom+sy);
    talStueck.style.top=Math.max(r.bottom+sy-hoch*.12,...knoepfe.map(k=>k+10-hoch*.09)).toFixed(1)+'px';
    talStueck.style.height=hoch.toFixed(1)+'px';
  }
  // Das Talstück entsteht mit der Bühne, nicht erst mit dem Tal (Robin 13.11.2026: „Läd es später beim reload nach“): Sein
  // Bild wird wie Krone und Ferne vorab angefordert und steht ohne eigenes Einblenden, sobald es da ist. Es ist dieselbe Datei
  // wie der Hang des Tals – kein Mehrgewicht, sie lädt nur früher. Wo es keinen Streifen gibt, lädt nichts vorab.
  let stueckKey='', stueckFrames=[], stueckState=null;
  function stueckLayers(state) {
    stueckState=state;
    if (!talOn || !stage || !stage.nextElementSibling || !stage.nextElementSibling.matches('section')) return;
    if (!talStueck) {
      talStueck=document.createElement('div'); talStueck.className='tal-stueck'; talStueck.setAttribute('aria-hidden','true'); document.body.prepend(talStueck);
      const neu=()=>{ talStueckLage(); if (stueckState) stueckLayers(stueckState); if (tal) talDraw(); };
      window.addEventListener('resize',neu);
      if ('ResizeObserver' in window) new ResizeObserver(neu).observe(stage);
    }
    talStueckLage();
    const key=state.from+state.to+slug;
    if (key!==stueckKey && !talStueck.hidden) {
      stueckKey=key; stueckFrames.forEach(f=>f.remove()); stueckFrames=[]; talStueck.classList.remove('da');
      [...new Set([state.to,state.from])].forEach(season => {
        const own=(set.ebenen[FILE[season]]||{}).hang, url=preview[FILE[season]+'hang'];
        if (!own && !url) return;
        const [big,small]=api.LAYERS.hang.sizes, base=SETS+slug+'/hang-'+FILE[season]+'-', sizes='(max-width:720px) 300px, max(100vw, 1000px)';
        const p=document.createElement('picture'); p.className='landscape-picture tal-stueck-bild'; p.dataset.season=season;
        if (url) p.innerHTML=`<img src="${url}" alt="" decoding="async">`;
        else {
          fill(p,own,base,small,big,sizes);
          if (season===state.to) { const ext=own.avif?'avif':'webp', preload=document.createElement('link'); preload.rel='preload'; preload.as='image'; preload.type='image/'+ext;
            preload.href=base+big+'.'+ext; preload.imageSrcset=base+small+'.'+ext+' '+small+'w, '+base+big+'.'+ext+' '+big+'w'; preload.imageSizes=sizes; document.head.append(preload); }
        }
        const img=p.querySelector('img'); img.onerror=()=>p.remove();
        if (season===state.to) { const da=()=>talStueck.classList.add('da'); if (img.complete) da(); else img.addEventListener('load',da,{once:true}); }
        talStueck.append(p); stueckFrames.push(p);
      });
    }
    stueckFrames.forEach(f=>f.style.opacity=f.dataset.season===state.from&&state.from!==state.to?1-state.blend:1);
  }
  let talBlaetter=[];
  function talTiefe() {
    const grenze=window.scrollY+innerHeight*.88, still=motion.matches;
    talBlaetter.forEach(b=>{ let oben=0; for (let e=b; e; e=e.offsetParent) oben+=e.offsetTop; b.classList.toggle('tal-tief',!still && !b.hidden && oben>grenze); });
  }
  function talDraw() {
    talBild=0;
    if (!tal) return;
    talTiefe();
    const H=tal.offsetHeight||innerHeight, y=window.scrollY, room=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const end=stage.offsetTop+stage.offsetHeight, still=motion.matches;
    // Das Tal kommt früh herauf und wird dann ruhiger: Schon im ersten Drittel der Seite stehen Höhenzüge und Hang im Bild.
    const way=Math.min(1,Math.max(0,y/room)), depth=still?(y>end*.6?.62:0):1-Math.pow(1-way,1.8);
    tal.querySelectorAll('.tal-ebene').forEach(p=>{ const t=TAL.find(x=>x.kind===p.dataset.kind); p.style.transform=`translate3d(0,${((t.y-depth*t.w)*H).toFixed(1)}px,0)`; });
    // Ferne des Tals erst zeigen, wenn die echte Bühne oben hinaus ist – sonst stünden zwei Burgberge übereinander.
    const gone=Math.min(1,Math.max(0,(y-end*.75)/(H*.35)));
    // Immer nur eine Landschaft (Robin 13.11.2026: „wie zwei Landschaften übereinander“): Solange das Talstück im Fenster
    // steht, bleibt das feste Tal verborgen. Erst wenn auch sein Nebel oben hinaus ist (unterhalb von 45 % seiner Höhe zeigt
    // die Maske praktisch nichts mehr), kommt das Tal über das folgende knappe Drittel der Fensterhöhe weich herauf.
    let auf=1;
    if (talStueck && !talStueck.hidden) { const ende=talStueck.offsetTop+talStueck.offsetHeight*.45-y; auf=Math.min(1,Math.max(0,-ende/(H*.3))); auf=auf*auf*(3-2*auf); }
    tal.style.setProperty('--auf',auf.toFixed(3));
    talFar.style.opacity=(gone*(1-depth*.5)*auf).toFixed(3);
    if (talLaub) talLaub.style.opacity=still?'0':(gone*auf).toFixed(3);
    talFar.querySelectorAll('.tal-burg').forEach(p=>{ p.style.transform=`translate3d(0,${((.25-depth*.2)*H).toFixed(1)}px,0) scale(${(1+depth*.22).toFixed(3)})`; });
  }
  if (talOn) {
    const build=()=>{
      tal=document.createElement('div'); tal.className='tal'; tal.setAttribute('aria-hidden','true');
      tal.innerHTML='<div class="tal-fern"><div class="tal-himmel"></div></div><div class="tal-laubfeld"></div>'; talFar=tal.firstChild; talLaub=tal.lastChild;
      document.body.prepend(tal); root.classList.add('tal-on');
      // Ein Bild je Ereignis, ohne Merker, der hängen bleiben könnte: Fällt ein Bild aus (Tab im Hintergrund, Zurück-Cache),
      // zeichnet das nächste Ereignis trotzdem. Dazu das Ende des Scrollens und die Leisten des Browsers (visualViewport).
      const zeichne=()=>{ if (talBild) cancelAnimationFrame(talBild); talBild=requestAnimationFrame(talDraw); };
      window.addEventListener('scroll',zeichne,{passive:true}); window.addEventListener('scrollend',zeichne,{passive:true});
      window.addEventListener('pageshow',zeichne); document.addEventListener('visibilitychange',zeichne);
      if (window.visualViewport) window.visualViewport.addEventListener('resize',zeichne);
      window.addEventListener('resize',talDraw); motion.addEventListener('change',talDraw);
      if (talState) talLayers(talState);
      // Die Blätter der Seite rücken aus der Tiefe heran (Entwurf vom 11.11.2026): Was unter dem Fenster liegt, steht etwas
      // tiefer und kleiner und kommt an seinen Platz, sobald es ins Fenster kommt. Seit 13.11.2026 hängt das allein von der
      // Scrollposition ab (Robin: „von oben nach unten und von unten nach oben sowie beim erneuten hoch und runter scrollen
      // immer den gleichen und logisch zusammenhängen eindruck“): Ein Blatt steht in der Tiefe, solange seine Oberkante unter
      // 88 % der Fensterhöhe liegt – gemessen an seinem Platz im Dokument, nicht an der verschobenen Fläche. Herunter rückt es
      // heran, hinauf sinkt es an derselben Stelle wieder zurück. Nur transform. Nicht bei reduzierter Bewegung.
      talBlaetter=[...document.querySelectorAll('main > section:not(.stage)')];
      motion.addEventListener('change',talTiefe);
      talTiefe();
    };
    // Die Blätter stehen sofort (Klasse), die Bilder des Tals kommen nach dem ersten Bild der Seite.
    root.classList.add('tal-on');
    const later=()=>(window.requestIdleCallback||(f=>setTimeout(f,200)))(build);
    if (document.readyState==='complete') later(); else window.addEventListener('load',later,{once:true});
  }
  function update() {
    const date=input.timeOverridden?input.date:new Date(), sp=api.sunPosition(date,place.lat,place.lon);
    const mp=api.moonPosition(date,place.lat,place.lon), light=api.moonIllumination(date), n=api.nightFactor(sp.altitude);
    colors(n); root.classList.add('landscape-on'); geometry(); seasonal(api.seasonState(date,place.lat));
    const altitude=sp.altitude*180/Math.PI, pos=api.stagePosition(sp.altitude,sp.azimuth,place.lat);
    style.setProperty('--sun-side',pos.x*100+'%'); style.setProperty('--stars',altitude< -6?Math.min(1,(-altitude-6)/6):0);
    const sky=set.himmel[altitude< -12?'nacht':altitude<0?'daemmerung':altitude<10?'tief':'tag'];
    ['top','bottom','glow'].forEach((k,i)=>style.setProperty('--sky-'+k,sky[i]));
    [[sun,sp],[moon,mp]].forEach(([node,p])=>{
      const v=api.stagePosition(p.altitude,p.azimuth,place.lat); node.toggleAttribute('hidden',!v.visible);
      node.style.left=v.x*100+'%'; node.style.setProperty('--orb-y',v.y);
    });
    // Terminator: beleuchtete Halbkugel plus elliptische Tag-Nacht-Grenze, zum Zenit gedreht.
    const waxing=light.phase<.5, appearance=api.moonAppearance(sp.altitude,light.fraction,mp.altitude);
    moon.querySelector('.light').setAttribute('d',api.moonPhasePath(light.fraction,waxing));
    moon.querySelector('.light').style.opacity=appearance.light;
    moon.querySelector('.dark').style.opacity=appearance.earthshine;
    moon.querySelector('path').setAttribute('transform','rotate('+((light.angle-mp.parallacticAngle)*180/Math.PI+(waxing?-90:90))+')');
    maskStars();
    window.RJLLandscape.state={date:date.toISOString(),place,sun:sp,moon:mp,illumination:light,appearance,night:n,season:api.seasonState(date,place.lat)};
  }
  update();
  let previewed=false;
  const applySet=raw=>{set=api.normalizeSet(raw); seasonKey=''; talKey=''; stueckKey=''; update();};
  fetch(SETS+slug+'/landschaft.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(raw=>{if(!previewed) applySet(raw);}).catch(()=>{});
  // Vorschau aus der Redaktion (eingebettet oder im eigenen Fenster): ungespeicherte Bilder, Blätterart und
  // Himmelsfarben werden per postMessage hereingereicht – nur vom Worker, dessen Adresse die Seite selbst nennt.
  const worker=document.body.dataset.contactEndpoint||document.body.dataset.chatEndpoint||'';
  if (worker) window.addEventListener('message',e=>{
    const d=e.data; if (e.origin!==new URL(worker).origin||!d||d.type!=='landschaft-vorschau') return;
    previewed=true; Object.values(preview).forEach(URL.revokeObjectURL); preview={};
    Object.entries(d.bilder||{}).forEach(([season,layers])=>Object.entries(layers||{}).forEach(([kind,blob])=>{
      if (api.SEASONS.includes(season)&&api.LAYERS[kind]&&blob instanceof Blob&&/^image\//.test(blob.type)) preview[season+kind]=URL.createObjectURL(blob);
    }));
    applySet(d.satz);
  });
  // Cal.coms vorhandene Warteschlange konfigurieren, ohne sie zu starten oder site.js zu ändern.
  if (Number(style.getPropertyValue('--nacht'))>=.5 && !window.Cal) {
    let cal;
    Object.defineProperty(window,'Cal',{configurable:true,get:()=>cal,set(value){
      cal=value; queueMicrotask(()=>{
        Object.values(cal.ns||{}).forEach(ns=>(ns.q||[]).forEach(args=>{
          if(args[0]==='inline') args[1].config.theme='dark';
          if(args[0]==='ui') { args[1].theme='dark'; args[1].cssVarsPerTheme.dark={
            'cal-bg':'#1B2230','cal-bg-emphasis':'#293241','cal-bg-subtle':'#1B2230','cal-bg-muted':'#242D3B',
            'cal-text':'#E8E2D6','cal-text-emphasis':'#E8E2D6','cal-text-subtle':'#B5AFA4','cal-text-muted':'#B5AFA4',
            'cal-brand':'#D97932','cal-brand-emphasis':'#D97932','cal-brand-text':'#1F1F1F','cal-border':'#3A4351'}; }
        }));
        Object.defineProperty(window,'Cal',{value:cal,writable:true,configurable:true});
      });
    }});
  }
  function pause() { root.classList.toggle('landscape-paused',document.hidden); if(!document.hidden) update(); }
  document.addEventListener('visibilitychange',pause); pause();
  setInterval(()=>{if(!document.hidden) update();},60000);
  window.addEventListener('resize',geometry); motion.addEventListener('change',geometry);
  document.fonts.ready.then(geometry);
  // Erst den Anfangszustand zeichnen, dann künftige Farbwechsel weich überblenden.
  requestAnimationFrame(() => {
    getComputedStyle(document.body).backgroundColor;
    requestAnimationFrame(() => root.classList.add('landscape-ready'));
  });
};
