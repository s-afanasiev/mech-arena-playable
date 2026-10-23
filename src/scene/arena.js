import * as THREE from 'three';

// Арена целиком процедурная: ни одного файла текстур или моделей — размер сборки тратится только на код.
// Препятствия и силуэты на горизонте — по одному InstancedMesh: десятки коробок за два вызова отрисовки.
const FOG = 0xd4926a; // тон горизонта на закате: туман растворяет дальние объекты в небо из CSS

export function buildArena(scene) {
  scene.fog = new THREE.Fog(FOG, 34, 105);
  scene.add(new THREE.HemisphereLight(0xffd9b8, 0x3a3440, 1.5));
  const sun = new THREE.DirectionalLight(0xffb26b, 2.6); // низкое закатное солнце: тёплый контровой свет
  sun.position.set(-14, 9, -18);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  scene.add(instancedBoxes(OBSTACLES, new THREE.MeshLambertMaterial()));
  // силуэты города без тумана и света: тёмные плоские фигуры на закатном небе
  scene.add(instancedBoxes(SKYLINE, new THREE.MeshBasicMaterial({ fog: false })));
}

// [x, z, ширина, высота, глубина, оттенок]
const OBSTACLES = [
  [-9, 2, 3, 1.4, 1.2, 0x9a7b5c], [8.5, 0, 2.2, 2.2, 2.2, 0x8a8f96], [-14, -12, 2.4, 3.5, 2.4, 0x7e848c],
  [14, -14, 3.2, 1.6, 1.6, 0x9a7b5c], [-5, -22, 1.6, 2.6, 1.6, 0x8a8f96], [6, -27, 4, 1.2, 1.2, 0x9a7b5c],
  [-17, -30, 2.6, 4.2, 2.6, 0x7e848c], [18, -32, 2.2, 3.2, 2.2, 0x8a8f96], [0, -47, 9, 2.2, 1.4, 0x7e848c],
  [-20, 6, 2.2, 2.2, 2.2, 0x8a8f96], [21, 4, 1.4, 3.8, 1.4, 0x7e848c], [12, -45, 2.4, 2.4, 2.4, 0x9a7b5c],
];
const SKYLINE = [
  [-45, -95, 18, 22, 10], [-20, -105, 12, 34, 10], [5, -100, 16, 16, 10], [28, -98, 10, 28, 10], [50, -92, 20, 18, 10],
  [-70, -70, 12, 20, 10], [72, -66, 14, 24, 10],
].map(([x, z, w, h, d]) => [x, z, w, h, d, 0x2e2638]);

function instancedBoxes(list, material) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  list.forEach(([x, z, w, h, d, tint], i) => {
    m.makeScale(w, h, d).setPosition(x, h / 2, z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.setHex(tint));
  });
  mesh.computeBoundingSphere();
  return mesh;
}

// Плитка 128×128 из холста, повторённая по полю: металлический пол с разметкой.
function groundTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4b5058';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const shade = 80 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${shade} ${shade + 6} ${shade + 14} / 0.25)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  ctx.strokeStyle = '#47505a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
  ctx.strokeStyle = 'rgb(255 170 60 / 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size / 2, 10);
  ctx.lineTo(size / 2, 36);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
