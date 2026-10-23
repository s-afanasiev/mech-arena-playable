// Google Ads (HTML5 playable в App-кампаниях): переход в стор — ExitApi.exit(),
// объект ExitApi предоставляет среда показа объявления.
export function createNetwork() {
  return {
    name: 'google',
    ready: () => Promise.resolve(),
    onVisibility: (fn) => document.addEventListener('visibilitychange', () => fn(!document.hidden)),
    openStore: () => window.ExitApi?.exit(),
    gameEnd: () => {},
  };
}
