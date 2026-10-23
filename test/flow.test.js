import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Flow } from '../src/core/flow.js';

const make = () => new Flow({ introSeconds: 1, timeLimit: 30, strikeAfterKills: 3, endCardDelay: 1, enemyCount: 5 });
const states = (flow) => flow.drain().filter((e) => e.type === 'state').map((e) => e.to);

test('счастливый путь: интро → обучение → бой → удар → победа → финальная карточка', () => {
  const flow = make();
  flow.tick(1.01);
  assert.equal(flow.state, 'tutorial');
  assert.equal(flow.tap(), true);
  for (let i = 0; i < 3; i++) flow.kill();
  assert.ok(flow.drain().some((e) => e.type === 'strike_ready'));
  assert.deepEqual(flow.useStrike(), { ok: true });
  flow.kill();
  flow.kill();
  assert.equal(flow.state, 'won');
  assert.deepEqual(flow.result, { won: true, cause: 'all_destroyed' });
  flow.tick(1.01);
  assert.equal(flow.state, 'end');
});

test('удар нельзя до трёх побед и нельзя дважды', () => {
  const flow = make();
  flow.tick(1.01);
  flow.tap();
  flow.kill();
  assert.equal(flow.useStrike().code, 'not_charged');
  flow.kill();
  flow.kill();
  assert.equal(flow.useStrike().ok, true);
  assert.equal(flow.useStrike().code, 'not_in_battle');
});

test('таймер и гибель игрока ведут к поражению; после финала переходов нет', () => {
  const timeout = make();
  timeout.tick(1.01);
  timeout.tap();
  timeout.tick(30);
  assert.deepEqual(timeout.result, { won: false, cause: 'timeout' });

  const down = make();
  down.tick(1.01);
  down.tap();
  down.playerDown();
  assert.equal(down.state, 'lost');
  down.kill();
  down.playerDown();
  assert.equal(down.state, 'lost');
  assert.deepEqual(states(down), ['tutorial', 'battle', 'lost']);
});

test('до первого тапа бой не идёт: таймер стоит, тапы в интро не принимаются', () => {
  const flow = make();
  assert.equal(flow.tap(), false);
  flow.tick(1.01);
  flow.tick(100);
  assert.equal(flow.state, 'tutorial');
  assert.equal(flow.elapsed, 0);
});
