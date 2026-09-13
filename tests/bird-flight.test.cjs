const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../bird-flight.js'), 'utf8');

function environment({ reduced = false, failed = false } = {}) {
  let now = 0, id = 0;
  const pending = new Map();
  const events = {};
  const frames = ['rest', 'up', 'glide', 'down', 'landing'].map(name => ({
    dataset: { pose: name, ...(name === 'rest' ? {} : { src: `${name}.webp` }) },
    style: {}, src: name === 'rest' ? 'vogel.png' : '',
    getAttribute() { return this.src; },
    decode() { return failed && name === 'up' ? Promise.reject(new Error('offline')) : Promise.resolve(); }
  }));
  const bird = { style: {} }, tilt = { style: {} }, branch = { style: {} };
  const classes = new Set();
  const scene = {
    dataset: {},
    classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)) },
    querySelector: s => ({ '.bird-move': bird, '.bird-tilt': tilt, '.branch': branch }[s]),
    querySelectorAll: () => frames,
    addEventListener: (name, fn) => { events[name] = fn; },
    getBoundingClientRect: () => ({ left: 28, top: 120, bottom: 375, width: 410 })
  };
  const media = { matches: reduced, addEventListener: (_, fn) => { events.motion = fn; } };
  const document = { hidden: false, getElementById: () => scene, addEventListener: (name, fn) => { events[name] = fn; } };
  const context = {
    document, matchMedia: () => media, innerHeight: 850,
    performance: { now: () => now }, setTimeout, clearTimeout,
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    requestAnimationFrame: fn => { pending.set(++id, fn); return id; },
    cancelAnimationFrame: key => pending.delete(key)
  };
  vm.runInNewContext(source, context);
  return {
    scene, frames, bird, branch, document, media, events, pending, classes,
    async ready() { await new Promise(resolve => setImmediate(resolve)); },
    step(time) {
      now = time;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach(fn => fn(time));
    }
  };
}

test('all four poses appear, land, and stop without leaving an animation loop', async () => {
  const e = environment(); await e.ready();
  assert.equal(e.scene.dataset.ready, 'true');
  const poses = new Set();
  for (let t = 0; t <= 5250; t += 25) {
    e.step(t); poses.add(e.scene.dataset.pose);
    assert.ok(e.pending.size <= 1);
    assert.ok(!e.bird.style.transform.includes('NaN'));
  }
  assert.deepEqual([...poses].sort(), ['down', 'glide', 'landing', 'rest', 'up']);
  assert.equal(e.scene.dataset.state, 'rest');
  assert.equal(e.pending.size, 0);
  assert.equal(e.branch.style.transform, '');
});

test('rapid replay replaces the previous flight instead of queuing it', async () => {
  const e = environment(); await e.ready();
  e.step(900);
  for (let n = 0; n < 12; n++) e.events.click();
  assert.equal(e.pending.size, 1);
  e.step(6200);
  assert.equal(e.scene.dataset.state, 'rest');
  assert.equal(e.pending.size, 0);
});

test('reduced motion skips flight image requests and keeps the seated bird', async () => {
  const e = environment({ reduced: true }); await e.ready();
  assert.ok(e.frames.slice(1).every(f => !f.src));
  e.events.click();
  assert.equal(e.pending.size, 0);
  assert.equal(e.scene.dataset.pose, 'rest');
  e.media.matches = false; e.events.motion(); await e.ready();
  assert.equal(e.scene.dataset.ready, 'true');
  e.media.matches = true; e.events.motion();
  assert.equal(e.pending.size, 0);
  assert.equal(e.scene.dataset.pose, 'rest');
});

test('a failed flight image leaves the original illustration visible', async () => {
  const e = environment({ failed: true }); await e.ready();
  assert.equal(e.scene.dataset.state, 'rest');
  assert.equal(e.frames[0].style.opacity, '1');
  assert.equal(e.pending.size, 0);
});

test('hidden tabs and resize settle immediately, without stale transforms', async () => {
  const e = environment(); await e.ready(); e.step(800);
  e.document.hidden = true; e.events.visibilitychange();
  assert.equal(e.pending.size, 0);
  assert.equal(e.bird.style.transform, '');
  e.events.click(); assert.equal(e.pending.size, 0);
  e.document.hidden = false; e.events.click(); e.step(1300);
  e.events.resize();
  assert.equal(e.pending.size, 0);
  assert.equal(e.scene.dataset.pose, 'rest');
});
