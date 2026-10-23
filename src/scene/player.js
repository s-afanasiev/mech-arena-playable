import * as THREE from 'three';
import { Mech, MUZZLES, CHEST } from './mech.js';

const _from = new THREE.Vector3();

// Мех игрока стоит на месте: поворачивается к выбранной цели и стреляет попеременно из двух орудий,
// пока цель жива и прицел сошёлся. Выбор цели — снаружи (тап), здесь только исполнение.
export class PlayerMech {
  target = null;
  center = new THREE.Vector3();
  #mech;
  #config;
  #cooldown = 0;
  #barrel = 0;
  #recoil = 0;

  constructor(scene, kit, config) {
    this.#config = config;
    this.hp = config.hp;
    this.#mech = new Mech(kit);
    this.#mech.position.set(0, 0, 9);
    scene.add(this.#mech.root);
    this.center.copy(this.#mech.position).add(CHEST);
  }

  get position() {
    return this.#mech.position;
  }

  update(dt, armed, onFire) {
    const { turnSpeed, aimTolerance, fireInterval } = this.#config;
    if (this.target && !this.target.alive) this.target = null;
    this.#cooldown -= dt;
    if (this.target) {
      const rest = this.#mech.turnTowards(this.target.mech.position, turnSpeed * dt);
      if (armed && rest < aimTolerance && this.#cooldown <= 0) {
        this.#cooldown = fireInterval;
        this.#mech.root.updateMatrixWorld();
        this.#mech.toWorld(MUZZLES[this.#barrel], _from);
        this.#barrel ^= 1;
        this.#recoil = 0.22;
        onFire(_from, this.target);
      }
    }
    this.#mech.stand(dt);
    this.#recoil = Math.max(0, this.#recoil - dt * 2);
    this.#mech.recoil(this.#recoil);
  }

  hitTest(x, y, z) {
    const dx = x - this.center.x, dy = y - this.center.y, dz = z - this.center.z;
    return dx * dx + dy * dy + dz * dz < this.#config.hitRadius ** 2;
  }

  // true — мех игрока уничтожен.
  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }
}
