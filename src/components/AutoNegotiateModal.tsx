import { Alert, Badge, Box, Button, Group, Modal, NumberInput, Paper, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconArrowsExchange, IconBuildingStore, IconSparkles, IconUser } from '@tabler/icons-react'
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { ApiError, autoNegotiate } from '../api'
import { errorMessage } from '../lib/errors'
import { formatPrice, parseYen } from '../lib/format'
import { prefersReducedMotion } from '../lib/motion'
import { bubbleCount, defaultMaxPrice } from '../lib/negotiation'
import type { AutoNegotiation, ItemDetail, PriceEstimate } from '../types'
import { AiSourceBadge } from './AiSourceBadge'
import { NegotiationTranscript } from './NegotiationTranscript'

interface AutoNegotiateModalProps {
  item: ItemDetail
  opened: boolean
  onClose: () => void
  /** 商品ページですでに読み込んである「適正価格の目安」。あれば上限を決めるヒントに出す */
  estimate?: PriceEstimate | null
  /** 交渉の結果が返ってきたとき(合意でも不成立でも)。親が「合意済み」の表示を読み直すのに使う */
  onSettled?: (result: AutoNegotiation) => void
  /** 「この金額で購入する」。親がこのモーダルを閉じて、購入の確認を開く */
  onPurchase: () => void
  /** 吹き出しを 1 個ずつ出す間隔(ミリ秒)。テストで短くするための引数 */
  stepMs?: number
}

interface Failure {
  title: string
  body: string
  /** すでに合意しているときは、購入へ進むボタンを出す */
  canPurchase?: boolean
}

/** API のエラーコードごとの説明。知らないコードは、サーバーの文をそのまま出す */
function toFailure(error: unknown): Failure {
  const code = error instanceof ApiError ? error.code : ''
  switch (code) {
    case 'own_item':
      return { title: '自分の商品です', body: '自分が出品した商品には、AI 交渉を使えません。' }
    case 'sold_out':
      return { title: '売り切れました', body: 'この商品は、たった今ほかの人に売れました。' }
    case 'auto_negotiation_disabled':
      return {
        title: 'AI 交渉を受け付けていません',
        body: '出品者が最低価格の設定を外しました。「価格交渉する」から、出品者に直接提案できます。',
      }
    case 'already_agreed':
      return {
        title: 'すでに合意しています',
        body: 'この商品では、もう金額が決まっています。合意した金額で購入にすすめます。',
        canPurchase: true,
      }
    case 'too_many_negotiations':
      return {
        title: 'AI 交渉の回数の上限です',
        body: 'AI 交渉は 1 つの商品につき 5 回までです。「価格交渉する」から、出品者に直接提案できます。',
      }
    default:
      return { title: '交渉を始められませんでした', body: errorMessage(error) }
  }
}

/** 「あなたの AI ⇄ 出品者の AI」の小さな図(何が起きるかをひと目で伝える) */
function Sides() {
  const side = (icon: ReactNode, label: string, note: string) => (
    <Stack gap={4} align="center" style={{ flex: 1, minWidth: 0 }}>
      <ThemeIcon variant="light" size={40} radius="xl" aria-hidden>
        {icon}
      </ThemeIcon>
      <Text size="sm" fw={700} ta="center">
        {label}
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {note}
      </Text>
    </Stack>
  )
  return (
    <Paper withBorder p="sm" bg="nego.0" style={{ borderColor: 'var(--mantine-color-nego-2)' }}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        {side(<IconUser size={20} />, 'あなたの AI', '上限を知っている')}
        <Box c="nego.8" pt={8}>
          <IconArrowsExchange size={22} aria-hidden />
        </Box>
        {side(<IconBuildingStore size={20} />, '出品者の AI', '最低価格を知っている')}
      </Group>
    </Paper>
  )
}

/**
 * AI 同士の価格交渉(このアプリの目玉)。
 * ① 買い手が「出せる上限」を自分の AI に預ける → ② サーバーで 2 つの AI が最大 4 往復する
 * → ③ 返ってきたやりとりを、チャットのように 1 個ずつ見せる → ④ 合意なら購入へ、不成立なら上限を変えてもう一度。
 * 合意するか・いくらかはサーバーの数字の規則が決める。画面は結果を順番に見せるだけで、金額は計算しない。
 */
export function AutoNegotiateModal({
  item,
  opened,
  onClose,
  estimate,
  onSettled,
  onPurchase,
  stepMs = 700,
}: AutoNegotiateModalProps) {
  const [maxInput, setMaxInput] = useState<number | string>(() => defaultMaxPrice(item.price))
  const [inputError, setInputError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [result, setResult] = useState<AutoNegotiation | null>(null)
  /** いま見せている吹き出しの数 */
  const [visible, setVisible] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  const total = result ? bubbleCount(result.rounds) : 0
  const playing = result !== null && visible < total

  // 吹き出しを 1 個ずつ増やす。全部出たら止まる
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setVisible((v) => v + 1), stepMs)
    return () => window.clearTimeout(timer)
  }, [playing, visible, stepMs])

  // 新しい吹き出しや結果が画面の外に出ないように、いちばん下まで動かす
  useEffect(() => {
    if (!result) return
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [result, visible])

  /** 入力に戻る。入れた上限は残す(不成立のあと、少し上げてやり直しやすいように) */
  const backToForm = () => {
    setResult(null)
    setVisible(0)
    setFailure(null)
  }

  const close = () => {
    if (running) return
    backToForm()
    onClose()
  }

  const goPurchase = () => {
    backToForm()
    onPurchase()
  }

  const start = async (event: FormEvent) => {
    event.preventDefault()
    const maxPrice = parseYen(maxInput)
    if (maxPrice === null) {
      setInputError('出せる上限を 1 円以上の整数で入れてください')
      return
    }
    setInputError(null)
    setFailure(null)
    setRunning(true)
    try {
      const res = await autoNegotiate(item.id, maxPrice)
      setResult(res)
      // 動きを減らす設定の人には、最初から全部を見せる
      setVisible(prefersReducedMotion() ? bubbleCount(res.rounds) : Math.min(1, bubbleCount(res.rounds)))
      onSettled?.(res)
    } catch (error) {
      setFailure(toFailure(error))
    } finally {
      setRunning(false)
    }
  }

  const predicted = estimate?.available ? estimate.predicted_price : null
  const typedMax = parseYen(maxInput)
  const listPrice = result?.list_price ?? item.price
  const agreed = result?.outcome === 'agreed' ? result.agreed_price : null
  const saved = agreed !== null ? listPrice - agreed : 0

  return (
    <Modal opened={opened} onClose={close} title="AI に交渉を任せる" centered size="md">
      <Stack gap="md">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Text size="sm" className="price" style={{ flexShrink: 0 }}>
            出品価格 <b>{formatPrice(item.price)}</b>
          </Text>
        </Group>

        {!result && !running && (
          <form onSubmit={start} noValidate>
            <Stack gap="md">
              <Sides />
              <Text size="sm">
                あなたの AI と出品者の AI が、最大 4 往復で金額を話し合います。
                あなたの上限も出品者の最低価格も、限度額としては相手に表示されません。AI が出した提示額は、おたがいに見えます。
              </Text>

              <div>
                <NumberInput
                  label="出せる上限(円)"
                  description="あなたの AI は、この金額より高くは買いません"
                  value={maxInput}
                  onChange={setMaxInput}
                  error={inputError}
                  min={1}
                  allowDecimal={false}
                  allowNegative={false}
                  thousandSeparator=","
                  prefix="¥"
                  inputMode="numeric"
                  data-autofocus
                  required
                />
                {predicted !== null && (
                  <Group gap={6} mt={6}>
                    <Text size="xs" c="dimmed" className="price">
                      AI の適正価格の目安:{formatPrice(predicted)}
                    </Text>
                    <Button variant="subtle" size="compact-xs" onClick={() => setMaxInput(predicted)}>
                      この金額を上限にする
                    </Button>
                  </Group>
                )}
                {typedMax !== null && typedMax >= item.price && (
                  <Text size="xs" c="dimmed" mt={6}>
                    上限が出品価格以上なので、出品価格の {formatPrice(item.price)} で合意します(それより高くは買いません)。
                  </Text>
                )}
              </div>

              {failure && (
                <Alert color="red" variant="light" role="alert" title={failure.title}>
                  {failure.body}
                  {failure.canPurchase && (
                    <Group mt="sm">
                      <Button size="xs" onClick={goPurchase}>
                        合意した金額で購入にすすむ
                      </Button>
                    </Group>
                  )}
                </Alert>
              )}

              <Group justify="flex-end">
                <Button variant="default" onClick={close}>
                  やめる
                </Button>
                <Button type="submit" leftSection={<IconSparkles size={16} aria-hidden />}>
                  交渉を始める
                </Button>
              </Group>
            </Stack>
          </form>
        )}

        {running && (
          // 結果が返るまで、吹き出しと同じ形の枠を出しておく(届いたときに画面が大きく動かないように)
          <Stack gap="xs" role="status" aria-label="2 つの AI が交渉しています">
            <Text size="sm" c="dimmed" ta="center">
              2 つの AI が交渉しています…
            </Text>
            <Skeleton height={64} width="70%" radius="lg" style={{ alignSelf: 'flex-end' }} />
            <Skeleton height={64} width="70%" radius="lg" />
            <Skeleton height={64} width="70%" radius="lg" style={{ alignSelf: 'flex-end' }} />
          </Stack>
        )}

        {result && (
          <Stack gap="md">
            {typeof result.max_price === 'number' && (
              <Text size="xs" c="dimmed" className="price">
                あなたの上限:{formatPrice(result.max_price)}(上限としては出品者に表示されません)
              </Text>
            )}

            <NegotiationTranscript rounds={result.rounds} viewer="buyer" visibleCount={visible} />

            {playing && (
              <Group justify="center">
                <Button variant="subtle" color="gray" size="xs" onClick={() => setVisible(total)}>
                  すべて表示
                </Button>
              </Group>
            )}

            {!playing && agreed !== null && (
              <Paper
                withBorder
                p="md"
                bg="nego.0"
                className="nego-bubble"
                role="status"
                style={{ borderColor: 'var(--mantine-color-nego-4)' }}
              >
                <Group gap="sm" align="center">
                  <Badge size="lg">合意</Badge>
                  <Text className="price" fw={700} fz={32} lh={1.1} c="nego.9">
                    {formatPrice(agreed)}
                  </Text>
                </Group>
                <Text size="sm" mt={6} className="price">
                  {saved > 0
                    ? `出品価格 ${formatPrice(listPrice)} より ${formatPrice(saved)} 安い(${Math.round((saved / listPrice) * 100)}% 引き)`
                    : `出品価格 ${formatPrice(listPrice)} と同じ金額です`}
                </Text>
                <Text size="xs" c="dimmed" mt={6}>
                  購入はまだ確定していません。あとで買うときは、マイページの「出した価格交渉」からもすすめます。
                </Text>
              </Paper>
            )}

            {!playing && result.outcome === 'no_deal' && (
              <Paper withBorder p="md" bg="gray.0" className="nego-bubble" role="status">
                <Group gap="sm" align="center">
                  <Badge size="lg" color="gray">
                    不成立
                  </Badge>
                  <Text fw={700}>今回は金額が合いませんでした</Text>
                </Group>
                <Text size="sm" mt={6}>
                  {result.rounds.length} 往復しても、2 つの AI の金額が届きませんでした。上限を上げると合意できることがあります。
                </Text>
              </Paper>
            )}

            {/* どう決めたかと、せりふの出どころは、演出の途中でもいつも見せる(このアプリの方針: 正直に出す) */}
            <Paper withBorder p="sm">
              <Group gap="xs" mb={4}>
                <Text size="xs" fw={700} c="dimmed">
                  合意の決め方(数字の規則)
                </Text>
              </Group>
              <Text size="sm">{result.rule}</Text>
              <Group gap="xs" mt="xs" align="center">
                <Text size="xs" c="dimmed">
                  せりふ:
                </Text>
                <AiSourceBadge source={result.source} />
              </Group>
            </Paper>

            {!playing && (
              <Group justify="flex-end">
                {agreed !== null ? (
                  <>
                    <Button variant="default" onClick={close}>
                      あとで
                    </Button>
                    <Button onClick={goPurchase}>この金額で購入する</Button>
                  </>
                ) : (
                  <>
                    <Button variant="default" onClick={close}>
                      とじる
                    </Button>
                    <Button onClick={backToForm}>上限を変えてもう一度</Button>
                  </>
                )}
              </Group>
            )}
            <div ref={endRef} />
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
