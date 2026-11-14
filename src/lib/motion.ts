/**
 * OS の設定で「視差効果を減らす」を選んでいる人か。
 * 選んでいる人には、順番に出す演出をやめて最初から全部を見せる。
 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
