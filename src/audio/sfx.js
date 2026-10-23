// Звук синтезируется WebAudio на лету: ни одного аудиофайла в сборке.
// Контекст создаётся по первому касанию (политика автозапуска браузеров), на паузе рекламы — приостанавливается.
export class Sfx {
  #ctx = null;
  #out = null;
  #noise = null;
  #muted = false;
  #lastShot = 0;

  get muted() {
    return this.#muted;
  }

  unlock() {
    if (this.#ctx) {
      if (this.#ctx.state === 'suspended') this.#ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.#ctx = new AudioCtx();
    this.#out = this.#ctx.createGain();
    this.#out.gain.value = this.#muted ? 0 : 0.55;
    this.#out.connect(this.#ctx.destination);
    const length = this.#ctx.sampleRate;
    this.#noise = this.#ctx.createBuffer(1, length, this.#ctx.sampleRate);
    const data = this.#noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  toggleMuted() {
    this.#muted = !this.#muted;
    if (this.#out) this.#out.gain.value = this.#muted ? 0 : 0.55;
    return this.#muted;
  }

  suspend() {
    this.#ctx?.suspend();
  }

  resume() {
    if (this.#ctx?.state === 'suspended') this.#ctx.resume();
  }

  shot() {
    const ctx = this.#ctx;
    if (!ctx || ctx.currentTime - this.#lastShot < 0.05) return;
    this.#lastShot = ctx.currentTime;
    this.#burst({ type: 'bandpass', frequency: 2400, q: 0.9 }, 0.22, 0.07);
  }

  enemyShot() {
    this.#burst({ type: 'bandpass', frequency: 900, q: 1.2 }, 0.1, 0.1);
  }

  hit() {
    this.#tone('square', 150, 90, 0.12, 0.09);
  }

  explosion() {
    this.#burst({ type: 'lowpass', frequency: 900, to: 110, q: 0.7 }, 0.9, 0.75);
    this.#tone('sine', 70, 38, 0.6, 0.45);
  }

  missile() {
    this.#tone('sawtooth', 180, 640, 0.12, 0.7);
  }

  click() {
    this.#tone('sine', 900, 1200, 0.15, 0.06);
  }

  ready() {
    this.#tone('triangle', 660, 660, 0.2, 0.12);
    setTimeout(() => this.#tone('triangle', 990, 990, 0.2, 0.18), 110);
  }

  #burst({ type, frequency, to, q }, gain, duration) {
    const ctx = this.#ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.#noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + duration);
    filter.Q.value = q;
    const env = this.#envelope(gain, duration);
    src.connect(filter).connect(env);
    src.start(t, Math.random() * 0.5, duration);
  }

  #tone(type, from, to, gain, duration) {
    const ctx = this.#ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    osc.connect(this.#envelope(gain, duration));
    osc.start(t);
    osc.stop(t + duration);
  }

  #envelope(gain, duration) {
    const ctx = this.#ctx;
    const t = ctx.currentTime;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    env.connect(this.#out);
    return env;
  }
}
