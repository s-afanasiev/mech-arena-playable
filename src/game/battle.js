import * as THREE from 'three';
import { TEAM } from '../scene/projectiles.js';

const _aim = new THREE.Vector3();
const _sky = new THREE.Vector3();
const _screen = { x: 0, y: 0 };

// Бой — родитель всех участников: каждый кадр двигает их и решает, что значат их факты.
// Снаряд сообщает «долетел до точки», отряд — «враг уничтожен», сценарий — «пора финальная карточка»;
// связывает факты в последствия (взрыв, тряска, звук, счёт) только этот класс.
export class Battle {
  #d; // участники
  #c; // числа из конфига
  #intro = 0;
  #idle = 0;
  #hinting = false;

  constructor(parts, config) {
    this.#d = parts;
    this.#c = config;
  }

  run() {
    const { view, hud, strikeButton, ctaButton, endCard, network, sfx, stage } = this.#d;
    stage.addEventListener('pointerdown', (e) => this.#tap(e.clientX, e.clientY));
    strikeButton.onPress(() => this.#strike());
    ctaButton.onPress(() => network.openStore());
    endCard.onCta(() => network.openStore());
    hud.onMute(() => hud.muted(sfx.toggleMuted()));
    // пауза и возобновление — пара у одного владельца: реклама скрыта — ни кадров, ни звука
    network.onVisibility((visible) => {
      if (visible) { view.resume(); sfx.resume(); } else { view.pause(); sfx.suspend(); }
    });
    hud.armor(1);
    hud.enemies(this.#d.squad.alive);
    view.run((dt) => this.#frame(dt));
  }

  #frame(dt) {
    const { flow, player, squad, projectiles, particles, rig, view, hud, debug } = this.#d;
    flow.tick(dt);
    for (const event of flow.drain()) this.#on(event);

    const armed = flow.playing;
    this.#intro = Math.min(1, this.#intro + dt / this.#c.flow.introSeconds);
    player.update(dt, armed, (from, target) => this.#playerShot(from, target));
    squad.update(dt, player.position, view.camera, armed, (from) => this.#enemyShot(from));
    projectiles.update(dt, this.#collide);
    particles.update(dt);
    rig.update(dt, this.#intro, player.position);
    this.#guide(dt);
    hud.time(flow.state === 'intro' || flow.state === 'tutorial' ? 1 : flow.timeLeft / flow.timeLimit);
    debug?.frame(dt);
  }

  #on(event) {
    const { tutorial, hud, strikeButton, endCard, network, sfx, player, particles, rig, flash } = this.#d;
    if (event.type === 'strike_ready') {
      strikeButton.show();
      sfx.ready();
      return;
    }
    switch (event.to) {
      case 'tutorial':
        hud.show();
        tutorial.show('TAP TO ATTACK');
        break;
      case 'battle':
        tutorial.hide();
        break;
      case 'strike':
        strikeButton.hide();
        break;
      case 'won':
      case 'lost':
        strikeButton.hide();
        tutorial.hide();
        player.target = null;
        network.gameEnd();
        if (event.cause === 'destroyed') {
          particles.emit('big', player.center.x, player.center.y, player.center.z);
          rig.shake(1);
          flash.fire('hit');
          sfx.explosion();
        }
        break;
      case 'end':
        endCard.show(this.#d.flow.result);
        break;
    }
  }

  #tap(x, y) {
    const { flow, squad, view, player, sfx, tutorial, stage } = this.#d;
    sfx.unlock();
    const enemy = squad.pick(view, x, y, this.#c.enemies.pickRadius * stage.clientWidth);
    if (!enemy || !flow.tap()) return;
    player.target = enemy;
    this.#idle = 0;
    this.#hinting = false;
    tutorial.hide();
    sfx.click();
  }

  #strike() {
    const { flow, squad, projectiles, sfx, rig } = this.#d;
    if (!flow.useStrike().ok) return;
    for (const e of squad.enemies) {
      if (!e.alive) continue;
      _sky.set(e.center.x + (Math.random() - 0.5) * 10, 34, e.center.z + 18);
      projectiles.missile(_sky, e.center, 999);
    }
    rig.shake(0.25);
    sfx.missile();
  }

  // Подсказка: в обучении — всегда, в бою — если игрок бездействует без цели.
  #guide(dt) {
    const { flow, squad, player, tutorial, view } = this.#d;
    if (flow.state === 'battle' && !player.target) this.#idle += dt;
    if (flow.state === 'battle' && !this.#hinting && this.#idle > this.#c.flow.hintAfterIdle) {
      this.#hinting = true;
      tutorial.show('TAP AN ENEMY');
    }
    if (flow.state !== 'tutorial' && !this.#hinting) return;
    const target = squad.nearest(player.center);
    if (target && view.toScreen(target.center, _screen)) tutorial.pointAt(_screen.x, _screen.y);
  }

  #playerShot(from, target) {
    const { projectiles, particles, sfx } = this.#d;
    _aim.copy(target.center);
    _aim.x += (Math.random() - 0.5) * 0.6;
    _aim.y += (Math.random() - 0.5) * 0.6;
    projectiles.fire(from, _aim, TEAM.player, this.#c.player.damage);
    particles.emit('spark', from.x, from.y, from.z);
    sfx.shot();
  }

  #enemyShot(from) {
    const { projectiles, player, sfx } = this.#d;
    const spread = this.#c.enemies.spread;
    _aim.copy(player.center);
    _aim.x += (Math.random() - 0.5) * spread * 2;
    _aim.y += (Math.random() - 0.5) * spread;
    projectiles.fire(from, _aim, TEAM.enemy, this.#c.enemies.damage);
    sfx.enemyShot();
  }

  // Решение о попадании: снаряды знают только координаты, цели знают свои размеры.
  #collide = (team, x, y, z, damage, isMissile, expired) => {
    const { squad, player, particles, rig, sfx, hud, flow, flash } = this.#d;
    if (team === TEAM.player) {
      if (isMissile) {
        if (!expired && !squad.hitTest(x, y, z)) return false;
        particles.emit('big', x, Math.max(y, 1.5), z);
        rig.shake(0.6);
        flash.fire('boom');
        sfx.explosion();
        squad.forEachWithin(x, z, 5, (e) => this.#hurt(e, damage));
        return true;
      }
      const enemy = squad.hitTest(x, y, z);
      if (!enemy) return false;
      particles.emit('spark', x, y, z);
      this.#hurt(enemy, damage);
      return true;
    }
    if (!player.hitTest(x, y, z)) return false;
    particles.emit('spark', x, y, z);
    rig.shake(0.16);
    sfx.hit();
    const destroyed = player.damage(damage);
    hud.armor(player.hp / this.#c.player.hp);
    flash.fire('hit');
    if (destroyed) flow.playerDown();
    return true;
  };

  #hurt(enemy, damage) {
    const { squad, particles, rig, sfx, hud, flow } = this.#d;
    if (!squad.damage(enemy, damage)) return;
    particles.emit('explosion', enemy.center.x, enemy.center.y, enemy.center.z);
    rig.shake(0.35);
    sfx.explosion();
    hud.enemies(squad.alive);
    flow.kill();
  }
}
