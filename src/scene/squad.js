import * as THREE from 'three';
import { Mech, MUZZLES, CHEST } from './mech.js';

const _screen = { x: 0, y: 0 };
const _muzzle = new THREE.Vector3();
const BAR_WIDTH = 2.3;

// Отряд противника: подходит к игроку, останавливается на дистанции и стреляет со случайным разбросом во времени.
// Здоровье над головой — два плоских прямоугольника, повёрнутых к камере, без текстур и текста.
export class EnemySquad {
  enemies = [];
  #config;

  constructor(scene, kit, config) {
    this.#config = config;
    const barGeometry = new THREE.PlaneGeometry(BAR_WIDTH + 0.12, 0.3);
    const fillGeometry = new THREE.PlaneGeometry(BAR_WIDTH, 0.18).translate(BAR_WIDTH / 2, 0, 0);
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0x14181d, transparent: true, opacity: 0.75, depthWrite: false });
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0xff4d4d, depthWrite: false });

    for (let i = 0; i < config.count; i++) {
      const mech = new Mech(kit);
      // строй дугой: дальние по краям, чтобы к рубежу огня подошли не толпой
      const t = config.count === 1 ? 0.5 : i / (config.count - 1);
      mech.position.set(-15 + t * 30, 0, -27 - Math.abs(t - 0.5) * 10 - Math.random() * 3);
      const bar = new THREE.Group();
      const fill = new THREE.Mesh(fillGeometry, fillMaterial);
      fill.position.x = -BAR_WIDTH / 2;
      fill.position.z = 0.01;
      bar.add(new THREE.Mesh(barGeometry, barMaterial), fill);
      bar.renderOrder = 2;
      scene.add(mech.root, bar);
      this.enemies.push({
        id: i, mech, bar, fill,
        hp: config.hp, alive: true, dying: -1,
        fireIn: rand(config.fireInterval) + 1,
        barrel: 0,
        center: new THREE.Vector3(),
      });
    }
    this.#syncCenters();
  }

  get alive() {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  // armed = false: идут, но не стреляют (интро и обучение).
  update(dt, player, camera, armed, onFire) {
    const { speed, stopDistance, fireRange, fireInterval } = this.#config;
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.dying >= 0) {
          e.dying += dt;
          e.mech.fall(e.dying);
          if (e.dying > 1.6) {
            e.mech.root.visible = false;
            e.dying = -1;
          }
        }
        e.bar.visible = false;
        continue;
      }
      const p = e.mech.position;
      const dx = player.x - p.x, dz = player.z - p.z;
      const distance = Math.hypot(dx, dz);
      e.mech.turnTowards(player, dt * 3);
      if (distance > stopDistance) {
        const step = Math.min(speed * dt, distance - stopDistance);
        p.x += (dx / distance) * step;
        p.z += (dz / distance) * step;
        e.mech.walk(dt, speed);
      } else {
        e.mech.stand(dt);
      }
      e.fireIn -= dt;
      if (armed && e.fireIn <= 0 && distance < fireRange) {
        e.fireIn = rand(fireInterval);
        e.mech.root.updateMatrixWorld();
        e.mech.toWorld(MUZZLES[e.barrel], _muzzle);
        e.barrel ^= 1;
        onFire(_muzzle, e);
      }
      e.bar.position.set(p.x, 5.3, p.z);
      e.bar.quaternion.copy(camera.quaternion);
      e.fill.scale.x = Math.max(0.001, e.hp / this.#config.hp);
    }
    this.#syncCenters();
  }

  hitTest(x, y, z) {
    const r2 = this.#config.hitRadius ** 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = x - e.center.x, dy = y - e.center.y, dz = z - e.center.z;
      if (dx * dx + dy * dy + dz * dz < r2) return e;
    }
    return null;
  }

  // Все живые в радиусе — для взрыва ракеты.
  forEachWithin(x, z, radius, fn) {
    for (const e of this.enemies) {
      if (e.alive && Math.hypot(x - e.center.x, z - e.center.z) < radius) fn(e);
    }
  }

  // true — враг уничтожен этим попаданием.
  damage(e, amount) {
    if (!e.alive) return false;
    e.hp -= amount;
    if (e.hp > 0) return false;
    e.hp = 0;
    e.alive = false;
    e.dying = 0;
    return true;
  }

  // Ближайший к тапу живой враг на экране; щедрый радиус — палец толще курсора.
  pick(view, x, y, maxPx) {
    let best = null;
    let bestD = maxPx;
    for (const e of this.enemies) {
      if (!e.alive || !view.toScreen(e.center, _screen)) continue;
      const d = Math.hypot(_screen.x - x, _screen.y - y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  nearest(to) {
    let best = null;
    for (const e of this.enemies) {
      if (e.alive && (!best || e.center.distanceToSquared(to) < best.center.distanceToSquared(to))) best = e;
    }
    return best;
  }

  #syncCenters() {
    for (const e of this.enemies) e.center.copy(e.mech.position).add(CHEST);
  }
}

function rand([min, max]) {
  return min + Math.random() * (max - min);
}
