import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Мех из примитивов с цветами в вершинах: корпус — одна геометрия, каждая нога — ещё одна.
// Три вызова отрисовки на меха вместо пятнадцати, а геометрию одной раскраски делят все мехи команды.
// Смотрит в −Z; высота около 4.3 м; бёдра на высоте HIP.
const HIP = 2.1;
export const MUZZLES = [new THREE.Vector3(-1.45, 2.8, -1.85), new THREE.Vector3(1.45, 2.8, -1.85)];
export const CHEST = new THREE.Vector3(0, 2.9, 0);

export function createMechKit({ primary, accent, dark, visor }) {
  const box = (w, h, d, x, y, z, color) => painted(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);
  const barrel = (x, y, z) => painted(new THREE.CylinderGeometry(0.17, 0.2, 1.8, 8).rotateX(Math.PI / 2).translate(x, y, z), dark);

  const upper = mergeGeometries([
    box(1.5, 0.45, 0.95, 0, HIP, 0, dark), // таз
    box(2.2, 1.3, 1.7, 0, 3.0, 0, primary), // корпус
    box(1.15, 0.36, 0.2, 0, 3.25, -0.87, visor), // визор кабины
    box(0.75, 0.75, 1.0, -1.45, 3.1, 0, accent), // плечи
    box(0.75, 0.75, 1.0, 1.45, 3.1, 0, accent),
    box(0.55, 0.55, 1.1, -1.45, 2.8, -0.35, dark), // орудия
    box(0.55, 0.55, 1.1, 1.45, 2.8, -0.35, dark),
    barrel(-1.45, 2.8, -1.0),
    barrel(1.45, 2.8, -1.0),
    box(0.8, 0.45, 0.95, -0.6, 3.88, 0.2, accent), // ракетные блоки
    box(0.8, 0.45, 0.95, 0.6, 3.88, 0.2, accent),
    box(0.08, 0.7, 0.08, 0.75, 4.35, 0.45, dark), // антенна
  ]);
  // нога строится от бедра вниз: так её можно качать вокруг шарнира
  const leg = mergeGeometries([
    box(0.55, 1.0, 0.7, 0, -0.45, 0, primary),
    box(0.5, 1.0, 0.6, 0, -1.35, 0.12, dark),
    box(0.85, 0.25, 1.25, 0, -1.97, -0.15, accent),
  ]);
  return {
    upper,
    leg,
    material: new THREE.MeshLambertMaterial({ vertexColors: true }),
    shadow: shadowParts(),
  };
}

export class Mech {
  root = new THREE.Group();
  #upper;
  #legs;
  #phase = Math.random() * Math.PI * 2;

  constructor(kit) {
    this.#upper = new THREE.Mesh(kit.upper, kit.material);
    this.#legs = [-0.6, 0.6].map((x) => {
      const leg = new THREE.Mesh(kit.leg, kit.material);
      leg.position.set(x, HIP, 0);
      return leg;
    });
    const shadow = new THREE.Mesh(kit.shadow.geometry, kit.shadow.material);
    shadow.position.y = 0.03;
    shadow.renderOrder = -1;
    this.root.add(this.#upper, ...this.#legs, shadow);
  }

  get position() {
    return this.root.position;
  }

  // Шаг: ноги качаются в противофазе, корпус покачивается вверх-вниз дважды за цикл.
  walk(dt, speed) {
    this.#phase += dt * speed * 2.6;
    const swing = Math.sin(this.#phase) * 0.45;
    this.#legs[0].rotation.x = swing;
    this.#legs[1].rotation.x = -swing;
    this.#upper.position.y = Math.abs(Math.cos(this.#phase)) * 0.12;
  }

  stand(dt) {
    for (const leg of this.#legs) leg.rotation.x *= Math.max(0, 1 - dt * 8);
    this.#upper.position.y *= Math.max(0, 1 - dt * 8);
  }

  // Падение после уничтожения: t от 0 до 1.
  fall(t) {
    const k = Math.min(1, t);
    this.root.rotation.z = k * k * 1.1;
    this.root.position.y = -k * k * 1.6;
  }

  recoil(amount) {
    this.#upper.position.z = amount;
  }

  toWorld(local, out) {
    return out.copy(local).applyMatrix4(this.root.matrixWorld);
  }

  // Поворот к цели с ограниченной скоростью; возвращает оставшийся угол.
  turnTowards(target, maxStep) {
    const want = Math.atan2(-(target.x - this.root.position.x), -(target.z - this.root.position.z));
    let delta = want - this.root.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.root.rotation.y += Math.max(-maxStep, Math.min(maxStep, delta));
    return Math.abs(delta) - Math.min(Math.abs(delta), maxStep);
  }
}

function painted(geometry, hex) {
  const c = new THREE.Color(hex);
  const n = geometry.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// Мягкое пятно тени вместо карты теней: один полупрозрачный квадрат, никакого второго прохода рендера.
function shadowParts() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgb(0 0 0 / 0.55)');
  g.addColorStop(1, 'rgb(0 0 0 / 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const geometry = new THREE.PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false });
  return { geometry, material };
}
