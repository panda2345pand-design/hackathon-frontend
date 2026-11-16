import { Stack } from '@mantine/core'
import { formatPrice } from '../lib/format'
import type { NegotiationRound } from '../types'

type Side = 'buyer' | 'seller'

interface NegotiationTranscriptProps {
  rounds: NegotiationRound[]
  /** 見ている人。自分側の AI を右、相手側の AI を左に出す */
  viewer: Side
  /** 先頭から何個の吹き出しを見せるか(1 往復 = 2 個)。省くと全部 */
  visibleCount?: number
}

const NAMES: Record<Side, Record<Side, string>> = {
  // viewer → 吹き出しの主 → 呼び名
  buyer: { buyer: 'あなたの AI', seller: '出品者の AI' },
  seller: { buyer: '買い手の AI', seller: 'あなたの AI' },
}

/** 1 往復を「買い手の吹き出し → 売り手の吹き出し」の 2 個にほどく */
function toBubbles(rounds: NegotiationRound[]) {
  return rounds.flatMap((r) => [
    { key: `${r.round}-buyer`, round: r.round, side: 'buyer' as const, amount: r.buyer_offer, message: r.buyer_message },
    { key: `${r.round}-seller`, round: r.round, side: 'seller' as const, amount: r.seller_ask, message: r.seller_message },
  ])
}

/**
 * AI 同士のやりとりをチャットの形で見せる。金額はサーバーが決めた値、せりふは Gemini(または定型文)。
 * role="log" にして、あとから増えた吹き出しを読み上げソフトが順に読めるようにしている。
 *
 * 見た目はランディングページの交渉の画面と同じ(色と形は index.css の .ng-* にまとめてある):
 * - 自分の AI = 右側の灰色の吹き出し、金額は緑
 * - 相手の AI = 左側。吹き出しの面は付けず、インク色の丸いマークを先頭に置く
 * - 「1 往復目」の区切り = 線を引かず、中央に小さな文字だけ
 */
export function NegotiationTranscript({ rounds, viewer, visibleCount }: NegotiationTranscriptProps) {
  const bubbles = toBubbles(rounds).slice(0, visibleCount ?? Number.POSITIVE_INFINITY)

  return (
    <Stack gap="sm" role="log" aria-label="AI 同士のやりとり" aria-live="polite">
      {bubbles.map((bubble) => {
        const mine = bubble.side === viewer
        const who = NAMES[viewer][bubble.side]
        const body = (
          <div style={{ minWidth: 0 }}>
            <span className="ng-who">{who}</span>
            <span className="ng-amt price">{formatPrice(bubble.amount)}</span>
            {bubble.message && <span className="ng-text">{bubble.message}</span>}
          </div>
        )
        return (
          <Stack key={bubble.key} gap="sm">
            {bubble.side === 'buyer' && <div className="ng-day nego-bubble">{bubble.round} 往復目</div>}
            <div
              className={`nego-bubble ${mine ? 'ng-msg--me' : 'ng-msg--other'}`}
              role="group"
              aria-label={`${bubble.round} 往復目・${who}:${formatPrice(bubble.amount)}`}
            >
              {!mine && <span className="ng-agent" aria-hidden />}
              {body}
            </div>
          </Stack>
        )
      })}
    </Stack>
  )
}
