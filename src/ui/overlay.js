// Интерфейс поверх сцены — обычный DOM: чёткий текст на любом экране и ноль байт шрифтов и текстур.
// Каждый класс владеет своим элементом и сообщает наверх только факт нажатия.

export class Hud {
  #root;
  #armor;
  #enemies;
  #timer;
  #mute;

  constructor(root) {
    this.#root = root;
    this.#armor = root.querySelector('[data-hud="armor"]');
    this.#enemies = root.querySelector('[data-hud="enemies"]');
    this.#timer = root.querySelector('[data-hud="timer"]');
    this.#mute = root.querySelector('[data-hud="mute"]');
  }

  show() {
    this.#root.hidden = false;
  }

  armor(ratio) {
    this.#armor.style.transform = `scaleX(${ratio})`;
    this.#armor.classList.toggle('is-low', ratio < 0.35);
  }

  enemies(n) {
    this.#enemies.textContent = n;
  }

  time(ratio) {
    this.#timer.style.transform = `scaleX(${ratio})`;
  }

  muted(on) {
    this.#mute.setAttribute('aria-pressed', String(on));
  }

  onMute(fn) {
    this.#mute.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });
  }
}

export class Tutorial {
  #el;
  #text;

  constructor(el) {
    this.#el = el;
    this.#text = el.querySelector('[data-tutorial="text"]');
  }

  show(text) {
    this.#text.textContent = text;
    this.#el.hidden = false;
  }

  hide() {
    this.#el.hidden = true;
  }

  pointAt(x, y) {
    this.#el.style.transform = `translate(${x}px, ${y}px)`;
  }
}

export class Button {
  #el;

  constructor(el) {
    this.#el = el;
  }

  show() {
    this.#el.hidden = false;
  }

  hide() {
    this.#el.hidden = true;
  }

  // pointerdown, а не click: на телефоне отклик без задержки, и тап не проваливается в сцену
  onPress(fn) {
    this.#el.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });
  }
}

export class EndCard {
  #el;

  constructor(el) {
    this.#el = el;
  }

  show({ won, cause }) {
    this.#el.querySelector('[data-end="title"]').textContent = won ? 'VICTORY' : cause === 'timeout' ? 'TIME OUT' : 'DEFEATED';
    this.#el.querySelector('[data-end="subtitle"]').textContent = won
      ? 'Your squad is waiting. Build the ultimate war machine!'
      : 'Upgrade your mech and take revenge!';
    this.#el.dataset.result = won ? 'won' : 'lost';
    this.#el.hidden = false;
  }

  // Весь экран карточки — кнопка стора: так делают почти все playable, промахнуться невозможно.
  onCta(fn) {
    this.#el.addEventListener('pointerdown', (e) => { e.stopPropagation(); fn(); });
  }
}

export class Flash {
  #el;

  constructor(el) {
    this.#el = el;
  }

  fire(kind) {
    this.#el.dataset.kind = kind;
    this.#el.classList.remove('is-on');
    void this.#el.offsetWidth; // перезапуск CSS-анимации
    this.#el.classList.add('is-on');
  }
}
