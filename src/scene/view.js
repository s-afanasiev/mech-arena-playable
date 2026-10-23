import * as THREE from 'three';

const _v = new THREE.Vector3();

// Холст, рендерер, камера и цикл кадра. Кадр ограничен сверху: после паузы или лага шаг не прыгает.
// Пауза — пара к запуску: цикл снимается целиком, а не крутится вхолостую.
export class View {
  scene = new THREE.Scene();
  renderer;
  camera;
  #host;
  #settings;
  #frame = null;
  #last = 0;
  #off = [];

  constructor(host, settings) {
    this.#host = host;
    this.#settings = settings;
    this.camera = new THREE.PerspectiveCamera(settings.fov.portrait, 1, 0.1, 220); // просто объект; GPU — в run()
  }

  get portrait() {
    return this.#host.clientHeight >= this.#host.clientWidth;
  }

  run(frame) {
    const { maxPixelRatio } = this.#settings;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    this.#host.append(this.renderer.domElement);
    const onResize = () => this.#resize();
    window.addEventListener('resize', onResize);
    this.#off.push(() => window.removeEventListener('resize', onResize));
    this.#resize();
    this.#frame = frame;
    this.resume();
    return this;
  }

  pause() {
    this.renderer.setAnimationLoop(null);
  }

  resume() {
    this.#last = performance.now();
    this.renderer.setAnimationLoop((time) => {
      const dt = Math.min((time - this.#last) / 1000, this.#settings.maxFrameSeconds);
      this.#last = time;
      this.#frame(Math.max(dt, 0));
      this.renderer.render(this.scene, this.camera);
    });
  }

  // Точка мира → пиксели экрана; false, если точка за камерой.
  toScreen(point, out) {
    _v.copy(point).project(this.camera);
    out.x = (_v.x * 0.5 + 0.5) * this.#host.clientWidth;
    out.y = (-_v.y * 0.5 + 0.5) * this.#host.clientHeight;
    return _v.z < 1;
  }

  #resize() {
    const w = this.#host.clientWidth, h = this.#host.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = h >= w ? this.#settings.fov.portrait : this.#settings.fov.landscape;
    this.camera.updateProjectionMatrix();
  }
}
