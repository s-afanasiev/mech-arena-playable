import * as THREE from 'three';
import { SlotPool } from '../core/slot-pool.js';

export const TEAM = { player: 0, enemy: 1 };
const KIND = { bullet: 0, missile: 1 };

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _dir = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, 1);
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

// Снаряды: состояние — в типизированных массивах по слотам пула, на экране — два InstancedMesh (пули, ракеты).
// В цикле кадра ни одного new: только чтение и запись в заранее выделенную память.
// Попадание решает не снаряд, а владелец целей: collide(team, x, y, z, damage) → попал ли.
export class Projectiles {
  #pool;
  #pos;
  #vel;
  #life;
  #team;
  #kind;
  #damage;
  #meshes;
  #onTrail;

  constructor(scene, { capacity, speed, missileSpeed }, { onTrail }) {
    this.speed = speed;
    this.missileSpeed = missileSpeed;
    this.#onTrail = onTrail;
    this.#pool = new SlotPool(capacity);
    this.#pos = new Float32Array(capacity * 3);
    this.#vel = new Float32Array(capacity * 3);
    this.#life = new Float32Array(capacity);
    this.#team = new Uint8Array(capacity);
    this.#kind = new Uint8Array(capacity);
    this.#damage = new Float32Array(capacity);
    this.#meshes = [
      instanced(new THREE.BoxGeometry(0.16, 0.16, 1.1), 0xffd36b, capacity),
      instanced(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 6).rotateX(Math.PI / 2), 0xfff3e0, capacity),
    ];
    scene.add(...this.#meshes);
  }

  get active() {
    return this.#pool.used;
  }

  fire(from, to, team, damage) {
    return this.#launch(from, to, team, KIND.bullet, damage, this.speed);
  }

  missile(from, to, damage) {
    return this.#launch(from, to, TEAM.player, KIND.missile, damage, this.missileSpeed);
  }

  update(dt, collide) {
    const pool = this.#pool;
    for (let i = 0; i < pool.capacity; i++) {
      if (!pool.active[i]) continue;
      const o = i * 3;
      this.#pos[o] += this.#vel[o] * dt;
      this.#pos[o + 1] += this.#vel[o + 1] * dt;
      this.#pos[o + 2] += this.#vel[o + 2] * dt;
      this.#life[i] -= dt;
      const x = this.#pos[o], y = this.#pos[o + 1], z = this.#pos[o + 2];
      if (this.#kind[i] === KIND.missile) this.#onTrail(x, y, z);
      // ракета взрывается и по истечении пути: она летит в точку, а не в объект
      const expired = this.#life[i] <= 0;
      const hit = collide(this.#team[i], x, y, z, this.#damage[i], this.#kind[i] === KIND.missile, expired);
      if (hit || expired || y < 0) this.#retire(i);
      else this.#place(i);
    }
    for (const mesh of this.#meshes) mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.#pool.capacity; i++) if (this.#pool.active[i]) this.#retire(i);
  }

  #launch(from, to, team, kind, damage, speed) {
    const i = this.#pool.acquire();
    if (i < 0) return false;
    _dir.subVectors(to, from);
    const distance = _dir.length();
    _dir.multiplyScalar(speed / distance);
    const o = i * 3;
    this.#pos[o] = from.x; this.#pos[o + 1] = from.y; this.#pos[o + 2] = from.z;
    this.#vel[o] = _dir.x; this.#vel[o + 1] = _dir.y; this.#vel[o + 2] = _dir.z;
    this.#life[i] = distance / speed;
    this.#team[i] = team;
    this.#kind[i] = kind;
    this.#damage[i] = damage;
    this.#place(i);
    return true;
  }

  #place(i) {
    const o = i * 3;
    _p.set(this.#pos[o], this.#pos[o + 1], this.#pos[o + 2]);
    _dir.set(this.#vel[o], this.#vel[o + 1], this.#vel[o + 2]).normalize();
    _q.setFromUnitVectors(FORWARD, _dir);
    _m.compose(_p, _q, _s.set(1, 1, 1));
    this.#meshes[this.#kind[i]].setMatrixAt(i, _m);
  }

  #retire(i) {
    this.#meshes[this.#kind[i]].setMatrixAt(i, HIDDEN);
    this.#pool.release(i);
  }
}

function instanced(geometry, color, capacity) {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color }), capacity);
  for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, HIDDEN);
  mesh.frustumCulled = false; // экземпляры разлетаются далеко от исходной сферы геометрии
  return mesh;
}
