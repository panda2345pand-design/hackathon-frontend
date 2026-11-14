import { Box, Divider, Paper, Stack, Text } from '@mantine/core'
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
 */
export function NegotiationTranscript({ rounds, viewer, visibleCount }: NegotiationTranscriptProps) {
  const bubbles = toBubbles(rounds).slice(0, visibleCount ?? Number.POSITIVE_INFINITY)

  return (
    <Stack gap="xs" role="log" aria-label="AI 同士のやりとり" aria-live="polite">
      {bubbles.map((bubble) => {
        const mine = bubble.side === viewer
        const who = NAMES[viewer][bubble.side]
        return (
          <Stack key={bubble.key} gap="xs">
            {bubble.side === 'buyer' && (
              <Divider label={`${bubble.round} 往復目`} labelPosition="center" className="nego-bubble" />
            )}
            <Box
              className="nego-bubble"
              role="group"
              aria-label={`${bubble.round} 往復目・${who}:${formatPrice(bubble.amount)}`}
              maw="86%"
              style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}
            >
              <Text size="xs" c="dimmed" ta={mine ? 'right' : 'left'} mb={2}>
                {who}
              </Text>
              <Paper
                px="sm"
                py="xs"
                radius="lg"
                bg={mine ? 'nego.0' : 'gray.1'}
                style={{
                  border: `1px solid var(--mantine-color-${mine ? 'nego-2' : 'gray-3'})`,
                  // しっぽの代わりに、話している側の角だけ小さくする
                  ...(mine ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
                }}
              >
                <Text className="price" fw={700} fz={20} lh={1.2} c={mine ? 'nego.9' : undefined}>
                  {formatPrice(bubble.amount)}
                </Text>
                {bubble.message && (
                  <Text size="sm" mt={2} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {bubble.message}
                  </Text>
                )}
              </Paper>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}
