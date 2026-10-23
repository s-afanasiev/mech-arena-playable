// Все числа поведения и бюджеты — здесь, а не в глубине модулей.

// Сборки под рекламные сети: одна сборка — один HTML-файл со своим адаптером (src/networks/<имя>.js).
export const NETWORKS = ['preview', 'meta', 'google', 'mraid'];

// Бюджеты проверяет scripts/build.mjs (размер) и оверлей ?debug (кадр).
export const BUDGET = {
  htmlBytes: 700 * 1024, // один HTML-файл без сжатия; у сетей лимиты 2–5 МБ, держим с большим запасом
  drawCalls: 60,
  triangles: 60_000,
};

export const CONFIG = {
  storeUrl: 'https://example.com/store', // подставляется под кампанию
  render: { maxPixelRatio: 2, fov: { portrait: 62, landscape: 46 }, maxFrameSeconds: 1 / 20 },
  flow: { introSeconds: 1.4, timeLimit: 30, strikeAfterKills: 3, endCardDelay: 1.3, hintAfterIdle: 2.5 },
  player: { hp: 100, fireInterval: 0.11, damage: 12, turnSpeed: 7, aimTolerance: 0.25, hitRadius: 2.2 },
  enemies: {
    count: 5,
    hp: 100,
    speed: 2.4,
    stopDistance: 11.5,
    fireRange: 32, // открывают огонь, подойдя на эту дистанцию
    fireInterval: [1.6, 2.8], // разброс: залпы не совпадают по времени
    damage: 4,
    spread: 1.6,
    hitRadius: 2.2,
    pickRadius: 0.22, // доля ширины экрана: тап ближе — попал во врага
  },
  projectiles: { capacity: 96, speed: 46, missileSpeed: 30 },
  particles: { capacity: 360 },
  camera: { offset: [0, 7.2, 10.5], lookAhead: [0, 2.8, -12], introFrom: [0, 24, 34], shakeDecay: 2.8 },
};
