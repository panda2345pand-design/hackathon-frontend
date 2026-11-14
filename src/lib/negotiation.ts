import type { NegotiationRound } from '../types'

/** はじめに入れておく上限: 出品価格の 90%(100 円単位に切り捨て。交渉の規則が 100 円単位のため) */
export function defaultMaxPrice(price: number): number {
  const ninety = Math.floor(price * 0.9)
  const rounded = Math.floor(ninety / 100) * 100
  return Math.max(1, rounded > 0 ? rounded : ninety)
}

/** 吹き出しの数。1 往復 = 買い手と売り手の 2 個(演出を進める側が、終わりを知るために使う) */
export function bubbleCount(rounds: NegotiationRound[]): number {
  return rounds.length * 2
}
