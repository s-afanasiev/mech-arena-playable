// Сценарий рекламы — именованные состояния и переходы в одном месте:
//   intro → tutorial → battle ⇄ strike → won | lost → end
// Переход, которого нет в таблице, просто не происходит: ракетный удар до трёх побед или победа после поражения
// невыразимы. Наружу уходят события (drain), сцена и интерфейс на них реагируют.
const TRANSITIONS = {
  intro: ['tutorial'],
  tutorial: ['battle'],
  battle: ['strike', 'won', 'lost'],
  strike: ['won', 'lost'],
  won: ['end'],
  lost: ['end'],
  end: [],
};

export class Flow {
  state = 'intro';
  kills = 0;
  strikeReady = false;
  elapsed = 0; // секунды боя
  result = null; // { won, cause }
  #inState = 0;
  #events = [];

  constructor({ introSeconds, timeLimit, strikeAfterKills, endCardDelay, enemyCount }) {
    this.introSeconds = introSeconds;
    this.timeLimit = timeLimit;
    this.strikeAfterKills = strikeAfterKills;
    this.endCardDelay = endCardDelay;
    this.enemyCount = enemyCount;
  }

  get timeLeft() {
    return Math.max(0, this.timeLimit - this.elapsed);
  }

  get playing() {
    return this.state === 'battle' || this.state === 'strike';
  }

  tick(dt) {
    this.#inState += dt;
    if (this.state === 'intro' && this.#inState >= this.introSeconds) this.#go('tutorial');
    if (this.playing) {
      this.elapsed += dt;
      if (this.elapsed >= this.timeLimit) this.#finish(false, 'timeout');
    }
    if ((this.state === 'won' || this.state === 'lost') && this.#inState >= this.endCardDelay) this.#go('end');
  }

  // Первый тап по врагу начинает бой; дальше тапы принимаются, пока бой идёт.
  tap() {
    if (this.state === 'tutorial') this.#go('battle');
    return this.playing;
  }

  kill() {
    if (!this.playing) return;
    this.kills++;
    if (this.kills >= this.enemyCount) return this.#finish(true, 'all_destroyed');
    if (!this.strikeReady && this.state === 'battle' && this.kills >= this.strikeAfterKills) {
      this.strikeReady = true;
      this.#events.push({ type: 'strike_ready' });
    }
  }

  useStrike() {
    if (this.state !== 'battle') return { ok: false, code: 'not_in_battle' };
    if (!this.strikeReady) return { ok: false, code: 'not_charged', detail: { kills: this.kills, need: this.strikeAfterKills } };
    this.strikeReady = false;
    this.#go('strike');
    return { ok: true };
  }

  playerDown() {
    if (this.playing) this.#finish(false, 'destroyed');
  }

  // События с прошлого кадра, по одному разу.
  drain() {
    return this.#events.splice(0);
  }

  #finish(won, cause) {
    this.result = { won, cause };
    this.#go(won ? 'won' : 'lost', cause);
  }

  #go(to, cause) {
    if (!TRANSITIONS[this.state].includes(to)) return false;
    this.#events.push({ type: 'state', from: this.state, to, cause });
    this.state = to;
    this.#inState = 0;
    return true;
  }
}
