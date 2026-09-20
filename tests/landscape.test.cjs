const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../landscape.js'), 'utf8');
const context = { window: {}, Date, URLSearchParams };
vm.runInNewContext(source, context);
const sky = context.window.RJLLandscape;
const rad = Math.PI / 180;
const close = (actual, expected, tolerance) => assert.ok(Math.abs(actual-expected)<=tolerance,
  `${actual} liegt außerhalb ${expected} ± ${tolerance}`);
const local = (month, date, hours=0) => new Date(2026, month-1, date, hours);

test('Astronomieberechnungen sind ohne DOM als Browser- und CommonJS-API nutzbar', () => {
  const common = { module: { exports: {} }, Date, URLSearchParams };
  vm.runInNewContext(source, common);
  assert.equal(typeof common.module.exports.sunPosition, 'function');
  assert.equal(typeof sky.moonIllumination, 'function');
});

test('Sonnenhöhe bei 48,27/8,85: Sommersonnenwende gegen 65°, Winter gegen 18°', () => {
  // Explizite ME(S)Z, unabhängig von der Zeitzone des Testrechners.
  const summer = sky.sunPosition(new Date('2026-06-21T13:00:00+02:00'), 48.27, 8.85);
  const winter = sky.sunPosition(new Date('2026-12-21T13:00:00+01:00'), 48.27, 8.85);
  // Tatsächlich etwa 64,61° und 17,81°: 13 Uhr ist nicht exakt Sonnenmittag.
  close(summer.altitude/rad, 65, 1);
  close(winter.altitude/rad, 18, 1);
});

test('Sonne liegt zur lokalen Mitternacht unter dem Horizont', () => {
  for (const time of ['2026-06-21T00:00:00+02:00','2026-12-21T00:00:00+01:00']) {
    assert.ok(sky.sunPosition(new Date(time),48.27,8.85).altitude < 0);
  }
});

test('Bekannter Vollmond und Neumond passen zur USNO-Tabelle', () => {
  // Primärquelle, abgerufen 20.09.2026:
  // https://aa.usno.navy.mil/calculated/moon/phases?date=2026-09-01&nump=8
  // Vollmond 26.09. 16:49 UTC, Neumond 11.09. 03:27 UTC.
  // SunCalc 1.9 benutzt ein vereinfachtes Modell; Phasen sind keine Ephemeriden.
  const full = sky.moonIllumination(new Date('2026-09-26T16:49:00Z'));
  const fresh = sky.moonIllumination(new Date('2026-09-11T03:27:00Z'));
  close(full.phase, .5, .015); assert.ok(full.fraction>.99);
  assert.ok(Math.min(fresh.phase,1-fresh.phase)<.015); assert.ok(fresh.fraction<.01);
});

test('Mondbahn ist eigenständig, mit endlicher Ausrichtung und plausibler Entfernung', () => {
  const date = new Date('2026-06-21T00:00:00+02:00');
  const sun = sky.sunPosition(date,48.27,8.85), moon = sky.moonPosition(date,48.27,8.85);
  assert.ok(moon.altitude>0 && sun.altitude<0);
  assert.ok(moon.azimuth>=-Math.PI && moon.azimuth<=Math.PI);
  assert.ok(moon.distance>350000 && moon.distance<410000);
  assert.ok(Number.isFinite(moon.parallacticAngle));
  const illumination = sky.moonIllumination(date);
  assert.ok(Number.isFinite(illumination.angle-moon.parallacticAngle));
});

test('Dämmerung läuft von 0° bis −12° stetig von Tag zu Nacht', () => {
  for (const [degrees, expected] of [[10,0],[0,0],[-3,.25],[-6,.5],[-12,1],[-30,1]]) {
    close(sky.nightFactor(degrees*rad),expected,1e-12);
  }
});

test('Bühne: Ost rechts, West links, Norden und Süden mittig; Süden gespiegelt', () => {
  for (const [azimuth, x] of [[-90,1],[90,0],[0,.5],[180,.5],[-180,.5]]) {
    close(sky.stagePosition(20*rad,azimuth*rad,48).x,x,1e-12);
    close(sky.stagePosition(20*rad,azimuth*rad,-34).x,1-x,1e-12);
  }
  // Die Faltung bleibt auch am ±180°-Übergang stetig.
  close(sky.stagePosition(rad,Math.PI-1e-6,48).x,sky.stagePosition(rad,-Math.PI+1e-6,48).x,2e-6);
});

test('Bühne setzt Horizont und 65° korrekt und blendet negative Höhen aus', () => {
  assert.equal(sky.stagePosition(0,0,48).y,1);
  assert.equal(sky.stagePosition(0,0,48).visible,true);
  assert.equal(sky.stagePosition(65*rad,0,48).y,0);
  assert.equal(sky.stagePosition(90*rad,0,48).y,0);
  assert.equal(sky.stagePosition(-rad,0,48).visible,false);
});

test('Meteorologische Jahreszeiten beginnen am März-, Juni-, September-, Dezemberanfang', () => {
  for (const [month, expected] of [[1,'winter'],[3,'spring'],[6,'summer'],[9,'autumn'],[12,'winter']]) {
    assert.equal(sky.seasonState(local(month,1),48).current,expected);
  }
});

test('Übergänge mischen fünf Tage vor bis fünf Tage nach jedem Wechsel', () => {
  for (const [month, from, to] of [[3,'winter','spring'],[6,'spring','summer'],[9,'summer','autumn'],[12,'autumn','winter']]) {
    for (const [offset, blend] of [[-5,0],[-2,.3],[0,.5],[2,.7],[5,1]]) {
      const state = sky.seasonState(local(month,1+offset),48);
      assert.equal(state.from,from); assert.equal(state.to,to); close(state.blend,blend,1e-12);
    }
    const finished = sky.seasonState(local(month,7),48);
    assert.equal(finished.from,to); assert.equal(finished.to,to);
  }
});

test('Südhalbkugel verschiebt alle Jahreszeiten um sechs Monate', () => {
  for (const [month, expected] of [[1,'summer'],[4,'autumn'],[7,'winter'],[10,'spring']]) {
    assert.equal(sky.seasonState(local(month,15),-34).current,expected);
  }
  const transition = sky.seasonState(local(9,1),-34);
  assert.equal(transition.from,'winter'); assert.equal(transition.to,'spring'); assert.equal(transition.blend,.5);
});

test('Zeitzonen liefern repräsentative Orte für beide Halbkugeln', () => {
  const berlin=sky.locationForZone('Europe/Berlin',-120), sydney=sky.locationForZone('Australia/Sydney',-600);
  close(berlin.lat,52.52,.01); close(berlin.lon,13.41,.01);
  assert.ok(sydney.lat<0); assert.ok(sydney.lon>100);
  assert.equal(berlin.approximate,true); assert.equal(sydney.approximate,true);
});

test('Unbekannte Zeitzonen nutzen 45° Breite und die UTC-Abweichung als Länge', () => {
  assert.equal(sky.locationForZone('Unbekannt',-330).lat,45);
  assert.equal(sky.locationForZone('Unbekannt',-330).lon,82.5);
  assert.equal(sky.locationForZone('Unbekannt',300).lon,-75);
  assert.equal(sky.locationForZone('__proto__',0).lat,45);
});

test('URL-Zeit setzt lokale Gerätezeit, Ort akzeptiert auch die Südhalbkugel', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const result = sky.parseOverrides('?zeit=2026-06-21T13:00&ort=-33.87,151.21',now);
  assert.equal(result.timeOverridden,true);
  assert.equal(result.date.getFullYear(),2026); assert.equal(result.date.getMonth(),5);
  assert.equal(result.date.getDate(),21); assert.equal(result.date.getHours(),13);
  assert.equal(result.date.getMinutes(),0); assert.equal(result.location.lat,-33.87);
  assert.equal(result.location.lon,151.21); assert.equal(result.location.approximate,false);
  assert.equal(+now,+new Date('2026-01-01T00:00:00Z'));
});

test('Ungültige URL-Zeiten und Koordinaten fallen einzeln auf Gerätewerte zurück', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  for (const time of ['2026-02-30T12:00','2026-13-01T12:00','2026-01-01T24:00','2026-01-01T12:60','foo','2026-02-29T12:00']) {
    const result=sky.parseOverrides('?zeit='+encodeURIComponent(time)+'&ort=48.27,8.85',now);
    assert.equal(result.timeOverridden,false); assert.equal(+result.date,+now);
    assert.equal(result.location.lat,48.27);
  }
  for (const place of ['91,0','0,-181','foo,0','1,2,3','Infinity,0',',']) {
    const result=sky.parseOverrides('?zeit=2026-02-28T12:00&ort='+encodeURIComponent(place),now);
    assert.equal(result.location,null); assert.equal(result.timeOverridden,true);
  }
  assert.equal(sky.parseOverrides('?zeit=2028-02-29T12:00',now).timeOverridden,true);
  assert.equal(sky.parseOverrides('',now).location,null);
});
