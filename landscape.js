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
  // Eine Landschaft ist ein Satz aus Bildern je Ebene (ferne, krone) und Jahreszeit, dazu Blätterart und
  // Himmelsfarben; beschrieben in assets/landschaften/<satz>/landschaft.json (schreibt die Redaktion).
  const SET_DIR = 'assets/landschaften/', SEASONS = ['herbst','winter','fruehling','sommer'];
  const LAYERS = { ferne: { sizes: [1400, 800], budget: 150000 }, krone: { sizes: [1000, 560], budget: 120000 } };
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
  const api = { sunPosition, moonPosition, moonIllumination, locationForZone,
    parseOverrides, seasonState, nightFactor, stagePosition, normalizeSet, SET_DIR, SEASONS, LAYERS, PARTICLES, DEFAULT_SET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof window !== 'undefined') window.RJLLandscape = api;
})();

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const root = document.documentElement, scene = document.getElementById('scene');
  if (!scene) return;
  const api = window.RJLLandscape, stage = scene.closest('.stage');
  const wish = new URLSearchParams(location.search).get('landschaft'); // 'aus' schaltet ab; 'an' oder ein Satzname übersteuert den Schalter der Redaktion
  const wantOn = !!wish && wish !== 'aus';
  // Vogel und Ast gibt es zweimal: assets/bestand/ (ohne Landschaft: kurzer Ast, Vogel auf Weiß) und assets/
  // (mit Landschaft: langer Ast, freigestellter Vogel). Die Startseite trägt die Pfade der eingeschalteten Fassung,
  // damit vom ersten Bild an das Richtige steht; nur ?landschaft=an|aus tauscht hier zur Laufzeit.
  const use = folder => document.querySelectorAll('.scene img').forEach(img => {
    ['src', 'data-src'].forEach(attr => {
      const src = img.getAttribute(attr), m = src && src.match(/^assets\/(?:bestand\/)?(.+)$/);
      if (m && src !== folder + m[1]) img.setAttribute(attr, folder + m[1]);
    });
  });
  if (!wantOn && (root.classList.contains('landscape-off') || document.body.dataset.landschaft === 'aus')) {
    root.classList.add('landscape-off');
    use('assets/bestand/');
    return;
  }
  root.classList.remove('landscape-off'); use('assets/');
  // Welcher Satz: ?landschaft=<satz> zeigt einen bestimmten (Vorschau), sonst der von der Redaktion gesetzte.
  const slug = wish && wish !== 'an' && /^[a-z0-9-]{1,40}$/.test(wish) ? wish : (document.body.dataset.landschaftSatz || 'burgberg-herbst');
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
    </defs></svg><div class="landscape-sky"></div><svg class="landscape-stars" viewBox="0 0 1000 400" preserveAspectRatio="none"></svg>
    <div class="landscape-orb landscape-sun"></div><svg class="landscape-orb landscape-moon" viewBox="-16 -16 32 32"><circle class="dark" r="15"/><path class="light"/></svg><div class="landscape-particles"></div>`;
  stage.prepend(area);
  const stars = area.querySelector('.landscape-stars'), sun = area.querySelector('.landscape-sun');
  const moon = area.querySelector('.landscape-moon'), particles = area.querySelector('.landscape-particles');
  let seed = 417, seasonKey = '', frames = [];
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 60; i++) stars.insertAdjacentHTML('beforeend', `<circle cx="${random()*1000}" cy="${random()*360}" r="${.55+random()*.65}" style="animation-delay:-${random()*5}s"/>`);
  const style = root.style, initial = getComputedStyle(root);
  const roles = ['paper','ink','ink-soft','ink-muted','green','copper','line','hover','surface','reply','warning'];
  const rgb = value => value.trim().replace('#','').match(/../g).map(v => parseInt(v,16));
  const palette = Object.fromEntries(roles.map(k => [k, ['day','night'].map(t => rgb(initial.getPropertyValue('--'+k+'-'+t)))]));
  const mix = (a,b,t) => a.map((n,i) => n+(b[i]-n)*t);
  const color = a => '#'+a.map(n => Math.round(n).toString(16).padStart(2,'0')).join('');
  const lum = c => c.map(n => (n/=255)<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  function colors(n) {
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
    const r=1-.45*n,g=1-.38*n,b=1-.20*n;
    area.querySelector('feColorMatrix').setAttribute('values',`${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`);
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
  }
  // Die Rechenschicht spricht englisch (autumn …), die Dateien deutsch (herbst …).
  const FILE={autumn:'herbst',winter:'winter',spring:'fruehling',summer:'sommer'};
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
          const base=api.SET_DIR+slug+'/'+kind+'-'+FILE[season]+'-', sizes=kind==='krone'?'(max-width:720px) 60vw, 560px':'(max-width:720px) 62vw, 616px';
          const picture=document.createElement('picture'); picture.className='landscape-picture landscape-'+(kind==='krone'?'crown':'far');
          picture.dataset.season=season;
          if (url) picture.innerHTML=`<img src="${url}" alt="" decoding="async">`; // ungespeicherte Vorschau aus der Redaktion
          else {
            picture.innerHTML=(own.avif?`<source type="image/avif" srcset="${base+small}.avif ${small}w, ${base+big}.avif ${big}w" sizes="${sizes}">`:'')+`<img src="${base+big}.webp" srcset="${base+small}.webp ${small}w, ${base+big}.webp ${big}w" sizes="${sizes}" alt="" decoding="async">`;
            const ext=own.avif?'avif':'webp', preload=document.createElement('link'); preload.rel='preload'; preload.as='image'; preload.type='image/'+ext;
            preload.href=base+big+'.'+ext; preload.imageSrcset=base+small+'.'+ext+' '+small+'w, '+base+big+'.'+ext+' '+big+'w'; preload.imageSizes=sizes;
            document.head.append(preload);
          }
          area.insertBefore(picture,particles); frames.push(picture);
          picture.querySelector('img').onerror=()=>picture.remove();
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
  }
  function update() {
    const date=input.timeOverridden?input.date:new Date(), sp=api.sunPosition(date,place.lat,place.lon);
    const mp=api.moonPosition(date,place.lat,place.lon), light=api.moonIllumination(date), n=api.nightFactor(sp.altitude);
    colors(n); root.classList.add('landscape-on'); geometry(); seasonal(api.seasonState(date,place.lat));
    const altitude=sp.altitude*180/Math.PI, pos=api.stagePosition(sp.altitude,sp.azimuth,place.lat);
    style.setProperty('--sun-side',pos.x*100+'%'); style.setProperty('--stars',altitude< -6?Math.min(1,(-altitude-6)/6):0);
    const sky=set.himmel[altitude< -12?'nacht':altitude<0?'daemmerung':altitude<10?'tief':'tag'];
    ['top','bottom','glow'].forEach((k,i)=>style.setProperty('--sky-'+k,sky[i]));
    const horizon=parseFloat(style.getPropertyValue('--horizon'));
    [[sun,sp],[moon,mp]].forEach(([node,p])=>{
      const v=api.stagePosition(p.altitude,p.azimuth,place.lat); node.hidden=!v.visible;
      node.style.left=v.x*100+'%'; node.style.top=v.y*horizon+'px';
    });
    // Terminator: beleuchtete Halbkugel plus elliptische Tag-Nacht-Grenze, zum Zenit gedreht.
    const phase=light.phase, k=1-2*light.fraction, waxing=phase<.5;
    moon.querySelector('path').setAttribute('d',`M0 -15A15 15 0 0 ${waxing?1:0} 0 15A${Math.abs(k)*15||.001} 15 0 0 ${waxing?(k>0?0:1):(k>0?1:0)} 0 -15Z`);
    moon.style.opacity=altitude>=0?.35:1;
    moon.querySelector('path').setAttribute('transform','rotate('+((light.angle-mp.parallacticAngle)*180/Math.PI+(waxing?-90:90))+')');
    window.RJLLandscape.state={date:date.toISOString(),place,sun:sp,moon:mp,illumination:light,night:n,season:api.seasonState(date,place.lat)};
  }
  update();
  let previewed=false;
  const applySet=raw=>{set=api.normalizeSet(raw); seasonKey=''; update();};
  fetch(api.SET_DIR+slug+'/landschaft.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(raw=>{if(!previewed) applySet(raw);}).catch(()=>{});
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
})();
