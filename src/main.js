import './styles.css';
import { createNetwork } from '@network'; // адаптер подставляет сборка: src/networks/<сеть>.js
import { BUDGET, CONFIG } from './config.js';
import { Flow } from './core/flow.js';
import { View } from './scene/view.js';
import { buildArena } from './scene/arena.js';
import { createMechKit } from './scene/mech.js';
import { PlayerMech } from './scene/player.js';
import { EnemySquad } from './scene/squad.js';
import { Projectiles } from './scene/projectiles.js';
import { Particles } from './scene/particles.js';
import { CameraRig } from './scene/camera-rig.js';
import { Sfx } from './audio/sfx.js';
import { Hud, Tutorial, Button, EndCard, Flash } from './ui/overlay.js';
import { DebugOverlay } from './ui/debug-overlay.js';
import { Battle } from './game/battle.js';

// Точка сборки: из чего состоит реклама. Ниже — только сборка и запуск.
const $ = (selector) => document.querySelector(selector);

const network = createNetwork({ storeUrl: CONFIG.storeUrl });
const stage = $('#stage');
const view = new View(stage, CONFIG.render);
const particles = new Particles(view.scene, CONFIG.particles);
const projectiles = new Projectiles(view.scene, CONFIG.projectiles, { onTrail: (x, y, z) => particles.emit('trail', x, y, z) });
const squad = new EnemySquad(view.scene, createMechKit({ primary: 0x7a2f2f, accent: 0x3b3f45, dark: 0x24272b, visor: 0xff5a3c }), CONFIG.enemies);
const player = new PlayerMech(view.scene, createMechKit({ primary: 0x5d7d99, accent: 0xff8a1f, dark: 0x2b3138, visor: 0x3ff2e6 }), CONFIG.player);
buildArena(view.scene);

const battle = new Battle({
  stage,
  view,
  network,
  flow: new Flow({ ...CONFIG.flow, enemyCount: CONFIG.enemies.count }),
  player,
  squad,
  projectiles,
  particles,
  rig: new CameraRig(view.camera, CONFIG.camera),
  sfx: new Sfx(),
  hud: new Hud($('#hud')),
  tutorial: new Tutorial($('#tutorial')),
  strikeButton: new Button($('#strike')),
  ctaButton: new Button($('#cta')),
  endCard: new EndCard($('#endcard')),
  flash: new Flash($('#flash')),
  debug: new URLSearchParams(location.search).has('debug')
    ? new DebugOverlay($('#debug'), view, { budget: BUDGET, probes: () => ({ projectiles: projectiles.active, particles: particles.active }) })
    : null,
}, CONFIG);

network.ready().then(() => battle.run());
