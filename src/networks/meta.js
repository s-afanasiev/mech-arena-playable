// Meta (Facebook, Instagram, Audience Network): переход в стор — FbPlayableAd.onCTAClick(),
// ссылку на стор подставляет сама платформа.
export function createNetwork() {
  return {
    name: 'meta',
    ready: () => Promise.resolve(),
    onVisibility: (fn) => document.addEventListener('visibilitychange', () => fn(!document.hidden)),
    openStore: () => window.FbPlayableAd?.onCTAClick(),
    gameEnd: () => {},
  };
}
