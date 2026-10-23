import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlotPool } from '../src/core/slot-pool.js';

test('пул выдаёт каждый слот ровно один раз и говорит «полон» через −1', () => {
  const pool = new SlotPool(4);
  const got = [pool.acquire(), pool.acquire(), pool.acquire(), pool.acquire()];
  assert.deepEqual([...got].sort(), [0, 1, 2, 3]);
  assert.equal(pool.acquire(), -1);
  assert.equal(pool.used, 4);
});

test('возврат идемпотентен: двойной release не делает слот выдаваемым дважды', () => {
  const pool = new SlotPool(2);
  const a = pool.acquire();
  pool.release(a);
  pool.release(a);
  const x = pool.acquire();
  const y = pool.acquire();
  assert.notEqual(x, y);
  assert.equal(pool.acquire(), -1);
});

test('тысячи циклов выдачи и возврата не растят пул', () => {
  const pool = new SlotPool(8);
  for (let i = 0; i < 10_000; i++) {
    const s = pool.acquire();
    assert.ok(s >= 0 && s < 8);
    if (i % 3 !== 0) pool.release(s);
    if (pool.used === 8) pool.releaseAll();
  }
  assert.ok(pool.used <= 8);
});
