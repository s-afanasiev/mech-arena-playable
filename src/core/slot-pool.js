// Пул слотов фиксированной ёмкости: в цикле кадра ничего не создаётся и не собирается сборщиком мусора.
// Слот — индекс в типизированных массивах владельца (снаряды, частицы).
// acquire() → индекс или −1: пул полон, эффект пропускается (лишняя искра хуже пропавшей, чем рывок кадра).
// release() идемпотентен: повторный возврат того же слота ничего не ломает.
export class SlotPool {
  #free;
  #top;

  constructor(capacity) {
    this.capacity = capacity;
    this.active = new Uint8Array(capacity);
    this.#free = new Int32Array(capacity);
    for (let i = 0; i < capacity; i++) this.#free[i] = capacity - 1 - i;
    this.#top = capacity;
  }

  get used() {
    return this.capacity - this.#top;
  }

  acquire() {
    if (this.#top === 0) return -1;
    const slot = this.#free[--this.#top];
    this.active[slot] = 1;
    return slot;
  }

  release(slot) {
    if (!this.active[slot]) return;
    this.active[slot] = 0;
    this.#free[this.#top++] = slot;
  }

  releaseAll() {
    for (let i = 0; i < this.capacity; i++) this.release(i);
  }
}
