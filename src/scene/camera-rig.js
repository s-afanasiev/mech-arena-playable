import * as THREE from 'three';

const _look = new THREE.Vector3();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

// Камера за спиной игрока: в интро опускается сверху, в бою дрожит от попаданий и взрывов.
// Тряска — «травма» от 0 до 1, затухает сама; смещение ∝ травма², чтобы мелкие толчки не мельтешили.
export class CameraRig {
  #camera;
  #settings;
  #trauma = 0;

  constructor(camera, settings) {
    this.#camera = camera;
    this.#settings = settings;
  }

  shake(amount) {
    this.#trauma = Math.min(1, this.#trauma + amount);
  }

  // intro: 0 → 1 за время интро; anchor — позиция игрока.
  update(dt, intro, anchor) {
    const { offset, introFrom, lookAhead, shakeDecay } = this.#settings;
    const k = 1 - (1 - Math.min(1, Math.max(0, intro))) ** 3;
    _from.set(...introFrom).add(anchor);
    _to.set(...offset).add(anchor);
    this.#camera.position.lerpVectors(_from, _to, k);
    _look.set(...lookAhead).add(anchor);

    this.#trauma = Math.max(0, this.#trauma - dt * shakeDecay);
    const s = this.#trauma * this.#trauma;
    this.#camera.position.x += (Math.random() - 0.5) * s * 1.2;
    this.#camera.position.y += (Math.random() - 0.5) * s * 0.9;
    this.#camera.lookAt(_look);
  }
}
