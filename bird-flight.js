(() => {
  'use strict';
  const scene = document.getElementById('scene');
  const bird = scene.querySelector('.bird-move');
  const tilt = scene.querySelector('.bird-tilt');
  const branch = scene.querySelector('.branch');
  const frames = [...scene.querySelectorAll('[data-pose]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const flightDuration = 4200;
  const settleDuration = 950;
  let request = 0;
  let generation = 0;
  let ready = false;
  let activePose = 'rest';
  let startTime = 0;
  let bounds;

  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = t => Math.max(0, Math.min(1, t));
  const bezier = (a, b, c, d, t) => {
    const q = 1 - t;
    return q * q * q * a + 3 * q * q * t * b + 3 * q * t * t * c + t * t * t * d;
  };

  function pose(name, immediate = false) {
    if (activePose === name && !immediate) return;
    activePose = name;
    frames.forEach(frame => {
      frame.style.transitionDuration = immediate ? '0ms' : name === 'rest' ? '110ms' : '24ms';
      frame.style.opacity = frame.dataset.pose === name ? '1' : '0';
    });
    scene.dataset.pose = name;
  }

  function finish() {
    cancelAnimationFrame(request);
    request = 0;
    bird.style.transform = '';
    bird.style.opacity = '';
    tilt.style.transform = '';
    branch.style.transform = '';
    pose('rest', true);
    scene.classList.remove('is-flying', 'is-settling');
    scene.dataset.state = 'rest';
  }

  function tick(now) {
    const elapsed = now - startTime;
    const w = bounds.width;
    if (elapsed < flightDuration) {
      const p = clamp(elapsed / flightDuration);
      // A continuous curve with a soft deceleration; no pauses between waypoints.
      const t = 1 - Math.pow(1 - p, 1.65);
      // Mit Krone kommt Goch von rechts unter dem Ast und steigt erst links der Krone zur Landung.
      // Ohne Landschaft bleibt der bisherige Anflug erhalten. Beide Bahnen enden exakt am selben Ort.
      const low = scene.dataset.flightRoute === 'under-branch';
      const startX = w * (low ? 1.6 : .58);
      const startY = low ? w * .70 : -Math.min(bounds.top + w * .12, w * .72);
      let x = bezier(startX, w * (low ? .45 : .34), w * (low ? -.24 : .10), 0, t);
      let y = bezier(startY, w * (low ? .65 : -.20), w * (low ? -.08 : -.06), 0, t);
      const glide = p >= .32 && p < .57;
      const braking = p >= .79;
      const cycle = elapsed / (p < .32 ? 265 : 310);
      const pulse = Math.sin(cycle * Math.PI * 2);
      // A small lift follows the wingbeat and fades completely before touchdown.
      y += (glide ? Math.sin(p * Math.PI * 4) * .005 : pulse * .008) * w * Math.sin(p * Math.PI);
      const scale = mix(.57, 1, smooth(clamp(p / .91)));
      const angle = braking ? mix(14, 0, smooth((p - .79) / .21)) : mix(14, 4, t);
      bird.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      bird.style.opacity = String(smooth(clamp(p / .075)));
      tilt.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      if (braking) {
        pose('landing');
        scene.dataset.state = 'braking';
      } else if (glide) {
        pose('glide');
        scene.dataset.state = 'gliding';
      } else {
        pose(['up', 'glide', 'down', 'glide'][Math.floor((cycle % 1) * 4)]);
        scene.dataset.state = 'flapping';
      }
    } else {
      const s = clamp((elapsed - flightDuration) / settleDuration);
      if (activePose !== 'rest') {
        pose('rest');
        scene.classList.remove('is-flying');
        scene.classList.add('is-settling');
        scene.dataset.state = 'settling';
      }
      // Shared damped spring keeps the feet attached to the branch on impact.
      const spring = Math.sin(s * Math.PI * 3) * Math.exp(-s * 5) * (1 - s);
      const dip = spring * w * .025;
      branch.style.transform = `translate3d(0, ${dip.toFixed(3)}px, 0) rotate(${(spring * .6).toFixed(3)}deg)`;
      bird.style.opacity = '1';
      bird.style.transform = `translate3d(0, ${dip.toFixed(3)}px, 0)`;
      tilt.style.transform = `rotate(${(-spring * 1.4).toFixed(3)}deg) scaleY(${(1 - spring * .018).toFixed(4)})`;
      if (s === 1) {
        finish();
        return;
      }
    }
    request = requestAnimationFrame(tick);
  }

  function play() {
    if (!ready || motion.matches || document.hidden) { finish(); return; }
    finish();
    bounds = scene.getBoundingClientRect();
    if (!bounds.width || bounds.bottom < 0 || bounds.top > innerHeight) return;
    scene.classList.add('is-flying');
    pose('up', true);
    startTime = performance.now();
    tick(startTime);
  }

  // Mit Goch (goch.js setzt data-chat="on") öffnet der Klick das Gespräch, nicht den Anflug;
  // der Flug wiederholt sich dann beim Neuladen über den Namen.
  scene.addEventListener('click', () => { if (scene.dataset.chat !== 'on') play(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finish();
  });
  // A rotation or preference change must never leave a bird frozen in midair.
  window.addEventListener('resize', () => { if (request) finish(); }, { passive: true });
  motion.addEventListener('change', () => {
    generation++;
    finish();
    if (!motion.matches && !ready) prepare();
  });

  async function prepare() {
    if (motion.matches) return;
    const token = ++generation;
    let timeout;
    try {
      frames.forEach(frame => {
        if (frame.dataset.src && !frame.getAttribute('src')) frame.src = frame.dataset.src;
      });
      await Promise.race([
        Promise.all(frames.map(frame => frame.decode())),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('image timeout')), 6000); })
      ]);
      if (token !== generation) return;
      ready = true;
      scene.dataset.ready = 'true';
      play();
    } catch {
      // The original sitting illustration is always available, even offline.
      if (token === generation) finish();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Bis der Anflug beginnt, bleibt der Ast leer (Robin, 17.09.2026). Vorher saß der Vogel bei
  // kaltem Cache erst auf dem Ast, bis die Flugbilder geladen waren, und flog dann erst an.
  // Ohne Flug (reduzierte Bewegung, Bildfehler, Zeitüberschreitung, verborgener Tab) zeigt
  // finish() die Sitzpose.
  if (motion.matches) finish();
  else { pose('arriving', true); scene.dataset.state = 'arriving'; }
  prepare();
})();
