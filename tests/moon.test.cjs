'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const sky = require(process.argv[2] || path.join(__dirname, '../landscape.js'));
const rad = Math.PI / 180;
const fractions = [0, .001, .01, .05, .1464466094, .25, .5, .75, .8535533906, .95, .99, 1];
const appearance = (sunDegrees, fraction, moonDegrees = 30) =>
  sky.moonAppearance(sunDegrees * rad, fraction, moonDegrees * rad);
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} liegt außerhalb ${expected} ± ${tolerance}`);
const raster = (width, height) => new Uint8ClampedArray(width * height * 4);
function pixel(data, width, x, y, alpha, rgb = [80, 75, 60]) {
  data.set([...rgb, alpha], (y * width + x) * 4);
}

test('Neumond hat keine beleuchtete Fläche; Vollmond bleibt für beide Phasenrichtungen sichtbar', () => {
  for (const waxing of [false, true]) {
    for (const radius of [1, 15, 32]) {
      assert.equal(sky.moonPhasePath(0, waxing, radius), '');
      const full = sky.moonPhasePath(1, waxing, radius);
      assert.equal(typeof full, 'string');
      assert.ok(full.trim().length > 0);
    }
  }
  // Die Flächen aller Zwischenphasen werden zusätzlich im Browser gerastert:
  // Ihre Pixelzahl muss fraction * Kreisfläche ergeben, unabhängig vom Pfadtext.
});

test('Alle Phasen liefern bei Tag, Dämmerung und Nacht endliche Deckkräfte zwischen 0 und 1', () => {
  for (const sun of [-90, -18, -12, -6, -1, 0, 1, 10, 45, 90]) {
    for (const fraction of fractions) {
      for (const moon of [-10, 0, 1, 30, 90]) {
        const result = appearance(sun, fraction, moon);
        for (const key of ['light', 'earthshine']) {
          assert.ok(Number.isFinite(result[key]), `${key} bei Sonne=${sun}, Mond=${moon}, f=${fraction}`);
          assert.ok(result[key] >= 0 && result[key] <= 1, `${key} außerhalb [0,1]: ${result[key]}`);
        }
      }
    }
  }
});

test('Ein Neumond erzeugt am Tag keine sichtbare dunkle Scheibe', () => {
  for (const sun of [0, 1, 10, 45, 90]) {
    const result = appearance(sun, 0);
    // f=0 besitzt keine Lichtfläche. Sichtbar bliebe nur der Erdlichtkreis.
    close(result.earthshine, 0);
  }
});

test('Die unbeleuchtete Seite bleibt tagsüber in jeder Mondphase unsichtbar', () => {
  for (const fraction of fractions) {
    for (const sun of [0, 2, 20, 60]) close(appearance(sun, fraction).earthshine, 0);
  }
});

test('Ein sichtbarer Tagesmond ist blasser als derselbe Mond in dunkler Nacht', () => {
  for (const fraction of [.05, .25, .5, .75, 1]) {
    const day = appearance(40, fraction), night = appearance(-18, fraction);
    assert.ok(day.light < night.light, `f=${fraction}: Tag ${day.light}, Nacht ${night.light}`);
    assert.ok(night.light > 0);
  }
});

test('Beim Übergang von Tag zu Nacht werden Lichtfläche und Erdlicht nicht schwächer', () => {
  for (const fraction of fractions) {
    let previous = appearance(90, fraction);
    for (const sun of [45, 20, 5, 0, -1, -3, -6, -9, -12, -18, -90]) {
      const current = appearance(sun, fraction);
      for (const key of ['light', 'earthshine']) {
        assert.ok(current[key] + 1e-10 >= previous[key], `${key} fällt bei Sonne=${sun}, f=${fraction}`);
      }
      previous = current;
    }
  }
});

test('Sonnenaufgang und Sonnenuntergang verursachen keinen Deckkraftsprung', () => {
  for (const fraction of fractions) {
    const before = appearance(-.00001, fraction), after = appearance(.00001, fraction);
    for (const key of ['light', 'earthshine']) close(before[key], after[key], .001);
  }
});

test('Unter dem Horizont verschwinden Lichtfläche und Erdlicht in sämtlichen Phasen', () => {
  for (const fraction of fractions) {
    for (const sun of [-18, -3, 0, 45]) {
      for (const moon of [-.001, -1, -30]) {
        const result = appearance(sun, fraction, moon);
        close(result.light, 0);
        close(result.earthshine, 0);
      }
    }
  }
});

test('Transparentes Himmelsrauschen unter Alpha 8 erzeugt keinen Gelände-Horizont', () => {
  const width = 3, height = 5, data = raster(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixel(data, width, x, y, (x + y) % 8, [255, 255, 255]);
  }
  assert.deepEqual(Array.from(sky.terrainHorizon(data, width, height)), [height, height, height]);
});

test('Eine einzelne Burgspitze mit Alpha genau 8 wird trotz blasser Himmelspixel erkannt', () => {
  const width = 3, height = 6, data = raster(width, height);
  pixel(data, width, 1, 0, 7);
  pixel(data, width, 1, 1, 8);
  pixel(data, width, 0, 4, 120);
  pixel(data, width, 2, 3, 60);
  assert.deepEqual(Array.from(sky.terrainHorizon(data, width, height, 8)), [4, 1, 3]);
});

test('Lücken und auslaufender Nebel unter der ersten Geländekante ändern die Verdeckung nicht', () => {
  const width = 4, height = 7, data = raster(width, height);
  const expected = [0, 2, 5, height];
  expected.forEach((row, x) => { if (row < height) pixel(data, width, x, row, 32); });
  assert.deepEqual(Array.from(sky.terrainHorizon(data, width, height)), expected);
  for (let x = 0; x < width - 1; x++) {
    for (let y = expected[x] + 1; y < height; y++) pixel(data, width, x, y, y % 2 ? 0 : 255);
  }
  assert.deepEqual(Array.from(sky.terrainHorizon(data, width, height)), expected);
});

test('Die Geländeanalyse verändert keine Bildpixel und berücksichtigt einen abweichenden Grenzwert', () => {
  const width = 2, height = 4, data = raster(width, height);
  pixel(data, width, 0, 0, 8);
  pixel(data, width, 0, 2, 20);
  pixel(data, width, 1, 1, 19);
  pixel(data, width, 1, 3, 21);
  const original = data.slice();
  assert.deepEqual(Array.from(sky.terrainHorizon(data, width, height, 20)), [2, 3]);
  assert.deepEqual(data, original);
});
