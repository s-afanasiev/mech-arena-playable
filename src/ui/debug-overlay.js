// Оверлей ?debug: кадр, вызовы отрисовки, треугольники, объекты в памяти GPU, занятость пулов, куча JS.
// Значения сверх бюджета подсвечиваются — так бюджет проверяется на живом телефоне, а не на глаз.
export class DebugOverlay {
  #el;
  #view;
  #probes;
  #budget;
  #frames = 0;
  #time = 0;
  #worst = 0;

  constructor(el, view, { probes, budget }) {
    this.#el = el;
    this.#view = view;
    this.#probes = probes;
    this.#budget = budget;
    el.hidden = false;
  }

  frame(dt) {
    this.#frames++;
    this.#time += dt;
    this.#worst = Math.max(this.#worst, dt);
    if (this.#time < 0.5) return;
    const { calls, triangles } = this.#view.renderer.info.render;
    const { geometries, textures } = this.#view.renderer.info.memory;
    const heap = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'n/a';
    const fps = this.#frames / this.#time;
    const pools = this.#probes();
    const over = (v, max) => (v > max ? ' class="over"' : '');
    this.#el.innerHTML = [
      `<b${over(60 - fps, 5)}>${fps.toFixed(0)} fps</b> · worst ${(this.#worst * 1000).toFixed(1)} ms`,
      `<span${over(calls, this.#budget.drawCalls)}>draws ${calls}</span> · <span${over(triangles, this.#budget.triangles)}>tris ${triangles}</span>`,
      `geo ${geometries} · tex ${textures} · heap ${heap}`,
      `shots ${pools.projectiles} · fx ${pools.particles}`,
    ].join('<br>');
    this.#frames = 0;
    this.#time = 0;
    this.#worst = 0;
  }
}
