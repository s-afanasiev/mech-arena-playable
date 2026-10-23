import * as THREE from 'three';
import { SlotPool } from '../core/slot-pool.js';

const _m = new THREE.Matrix4();
const _c = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Искры, обломки и дым — один InstancedMesh на все эффекты, цвет у каждого экземпляра свой.
// Вместо вспышки светом (новый источник света — перекомпиляция шейдеров) — яркие неосвещаемые частицы.
const PRESETS = {
  spark: { count: 6, speed: 9, life: 0.28, size: 0.22, gravity: 4, colors: [0xffe08a, 0xffb347] },
  explosion: { count: 26, speed: 11, life: 0.9, size: 0.55, gravity: 7, colors: [0xffd166, 0xff8c42, 0xff5e3a, 0x5b5b5b] },
  big: { count: 44, speed: 15, life: 1.2, size: 0.8, gravity: 6, colors: [0xfff1b8, 0xffb347, 0xff6b35, 0x4a4a4a] },
  trail: { count: 1, speed: 0.6, life: 0.45, size: 0.45, gravity: -1.5, colors: [0xd8d8d8, 0xbdbdbd] },
};

export class Particles {
  #pool;
  #pos;
  #vel;
  #life;
  #maxLife;
  #size;
  #gravity;
  #mesh;

  constructor(scene, { capacity }) {
    this.#pool = new SlotPool(capacity);
    this.#pos = new Float32Array(capacity * 3);
    this.#vel = new Float32Array(capacity * 3);
    this.#life = new Float32Array(capacity);
    this.#maxLife = new Float32Array(capacity);
    this.#size = new Float32Array(capacity);
    this.#gravity = new Float32Array(capacity);
    this.#mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ fog: true }), capacity);
    for (let i = 0; i < capacity; i++) {
      this.#mesh.setMatrixAt(i, HIDDEN);
      this.#mesh.setColorAt(i, _c.setHex(0xffffff));
    }
    this.#mesh.frustumCulled = false;
    scene.add(this.#mesh);
  }

  get active() {
    return this.#pool.used;
  }

  emit(kind, x, y, z) {
    const p = PRESETS[kind];
    for (let n = 0; n < p.count; n++) {
      const i = this.#pool.acquire();
      if (i < 0) return;
      const o = i * 3;
      // направление — случайное на полусфере, с уклоном вверх
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.1;
      const r = Math.sqrt(1 - up * up);
      const s = p.speed * (0.4 + Math.random() * 0.6);
      this.#pos[o] = x; this.#pos[o + 1] = y; this.#pos[o + 2] = z;
      this.#vel[o] = Math.cos(a) * r * s; this.#vel[o + 1] = up * s; this.#vel[o + 2] = Math.sin(a) * r * s;
      this.#life[i] = this.#maxLife[i] = p.life * (0.6 + Math.random() * 0.4);
      this.#size[i] = p.size * (0.5 + Math.random() * 0.5);
      this.#gravity[i] = p.gravity;
      this.#mesh.setColorAt(i, _c.setHex(p.colors[(Math.random() * p.colors.length) | 0]));
    }
    this.#mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    const pool = this.#pool;
    const drag = Math.max(0, 1 - dt * 2.2);
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.active[i]) continue;
      this.#life[i] -= dt;
      if (this.#life[i] <= 0) {
        this.#mesh.setMatrixAt(i, HIDDEN);
        pool.release(i);
        continue;
      }
      const o = i * 3;
      this.#vel[o] *= drag;
      this.#vel[o + 2] *= drag;
      this.#vel[o + 1] = this.#vel[o + 1] * drag - this.#gravity[i] * dt;
      this.#pos[o] += this.#vel[o] * dt;
      this.#pos[o + 1] = Math.max(0.05, this.#pos[o + 1] + this.#vel[o + 1] * dt);
      this.#pos[o + 2] += this.#vel[o + 2] * dt;
      const s = this.#size[i] * (this.#life[i] / this.#maxLife[i]);
      _m.makeScale(s, s, s).setPosition(this.#pos[o], this.#pos[o + 1], this.#pos[o + 2]);
      this.#mesh.setMatrixAt(i, _m);
    }
    this.#mesh.instanceMatrix.needsUpdate = true;
  }
}
