// Stumme Browser für die Playwright-Tests (Robin, 13.11.2026: Goch zwitscherte während der Testläufe aus den Lautsprechern).
// Playwright-WebKit kennt kein --mute-audio. stumm(browser) sorgt dafür, dass jede Seite jedes neuen Kontexts keinen Ton an
// die Lautsprecher gibt – das Abspielen selbst läuft weiter, damit Prüfungen von Ablauf, Ereignissen und Zuständen gleich bleiben:
//   - <audio>/<video> und new Audio(): play() schaltet das Element vorher stumm (muted; volume und Ereignisse bleiben),
//   - Web Audio: der Ausgang jedes AudioContext ist ein GainNode mit Verstärkung 0 vor dem echten Ausgang,
//   - Sprachausgabe des Browsers: jede Äußerung mit Lautstärke 0.
//   const b = stumm(await webkit.launch());
export const STUMM_SKRIPT = () => {
  if (window.__stumm) return; window.__stumm = true;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { try { this.muted = true; } catch (_) {} return play.apply(this, arguments); };
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Ctx = window[name]; if (!Ctx || Ctx.prototype.__stumm) continue;
    const echt = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'destination') || Object.getOwnPropertyDescriptor(Ctx.prototype, 'destination');
    if (!echt || !echt.get) continue;
    const leise = new WeakMap();
    Object.defineProperty(Ctx.prototype, 'destination', { configurable: true, get() {
      if (!leise.has(this)) { const g = this.createGain(); g.gain.value = 0; g.connect(echt.get.call(this)); leise.set(this, g); }
      return leise.get(this); } });
    Object.defineProperty(Ctx.prototype, '__stumm', { value: true });
  }
  if (window.speechSynthesis) { const speak = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { try { u.volume = 0; } catch (_) {} return speak(u); }; }
};
export function stumm(browser) {
  const neu = browser.newContext.bind(browser);
  browser.newContext = async (...a) => { const ctx = await neu(...a); await ctx.addInitScript(STUMM_SKRIPT); return ctx; };
  browser.newPage = async (...a) => (await browser.newContext(...a)).newPage();
  return browser;
}
