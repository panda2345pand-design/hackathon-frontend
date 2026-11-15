import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeItem, mockFetch, renderPage } from '../test/helpers'
import type { AutoNegotiation, PriceEstimate } from '../types'
import { defaultMaxPrice } from '../lib/negotiation'
import { AutoNegotiateModal } from './AutoNegotiateModal'

const ITEM = makeItem({ id: 'i1', price: 6500, auto_negotiation: true })

const AGREED: AutoNegotiation = {
  id: 'n1',
  item_id: 'i1',
  outcome: 'agreed',
  agreed_price: 5800,
  list_price: 6500,
  max_price: 6000,
  rounds: [
    { round: 1, buyer_offer: 4900, buyer_message: '4,900円でいかがでしょうか。', seller_ask: 6300, seller_message: '6,300円までなら。' },
    { round: 2, buyer_offer: 5300, buyer_message: 'では5,300円で。', seller_ask: 6000, seller_message: '6,000円でどうでしょう。' },
    { round: 3, buyer_offer: 5900, buyer_message: '5,900円まで出せます。', seller_ask: 5700, seller_message: 'ありがとうございます。' },
  ],
  offer_id: 'o9',
  source: 'gemini',
  rule: '買い手の提示が売り手の提示以上になった往復で、2 つの中間の金額で合意します。',
  created_at: '2026-11-15T01:00:00Z',
}

const NO_DEAL: AutoNegotiation = {
  ...AGREED,
  id: 'n2',
  outcome: 'no_deal',
  agreed_price: null,
  max_price: 3000,
  offer_id: null,
  source: 'fallback',
  rounds: [1, 2, 3, 4].map((round) => ({
    round,
    buyer_offer: 2000 + round * 250,
    buyer_message: `買い手 ${round}`,
    seller_ask: 6500 - round * 250,
    seller_message: `売り手 ${round}`,
  })),
  rule: '4 往復しても買い手の提示が売り手の提示に届かなかったので、不成立です。',
}

const ESTIMATE: PriceEstimate = {
  predicted_price: 5600,
  low: 4800,
  high: 6400,
  currency: 'JPY',
  basis: [],
  model: null,
  available: true,
}

function renderModal(props: { estimate?: PriceEstimate; stepMs?: number } = {}) {
  const onClose = vi.fn()
  const onPurchase = vi.fn()
  const onSettled = vi.fn()
  renderPage(
    <AutoNegotiateModal
      item={ITEM}
      opened
      onClose={onClose}
      onPurchase={onPurchase}
      onSettled={onSettled}
      // テストでは吹き出しの間隔を長くして、「すべて表示」を押す前に勝手に進まないようにする
      stepMs={props.stepMs ?? 60_000}
      estimate={props.estimate}
    />,
  )
  return { onClose, onPurchase, onSettled }
}

/** 「視差効果を減らす」を選んでいる端末のふりをする */
function stubReducedMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }))
}

async function start(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '交渉を始める' }))
}

describe('defaultMaxPrice', () => {
  it('出品価格の 90% を 100 円単位に切り捨てる', () => {
    expect(defaultMaxPrice(6500)).toBe(5800)
    expect(defaultMaxPrice(3000)).toBe(2700)
  })

  it('安い商品でも 1 円以上になる', () => {
    expect(defaultMaxPrice(100)).toBe(90)
    expect(defaultMaxPrice(1)).toBe(1)
  })
})

describe('AutoNegotiateModal', () => {
  it('はじめは出品価格の 90% が上限に入っていて、AI の目安をヒントに使える', async () => {
    const user = userEvent.setup()
    mockFetch({})
    renderModal({ estimate: ESTIMATE })

    const input = await screen.findByLabelText(/出せる上限/)
    expect(input).toHaveValue('¥5,800')
    expect(screen.getByText(/最大 4 往復/)).toBeInTheDocument()
    expect(screen.getByText('AI の適正価格の目安:¥5,600')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'この金額を上限にする' }))
    expect(input).toHaveValue('¥5,600')
  })

  it('合意: やりとりを 1 個ずつ出し、「すべて表示」のあとに合意額・値引き・決め方・出どころを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, AGREED) })
    const { onSettled } = renderModal()

    const input = await screen.findByLabelText(/出せる上限/)
    await user.clear(input)
    await user.type(input, '6000')
    await start(user)

    // まず 1 個目(買い手の AI)だけが出る。結果はまだ出さない
    const log = await screen.findByRole('log', { name: 'AI 同士のやりとり' })
    expect(within(log).getAllByRole('group')).toHaveLength(1)
    expect(within(log).getByRole('group', { name: '1 往復目・あなたの AI:¥4,900' })).toHaveTextContent('4,900円でいかがでしょうか。')
    expect(screen.queryByText('合意')).not.toBeInTheDocument()
    // 決め方と出どころは、途中でも出ている
    expect(screen.getByText(AGREED.rule)).toBeInTheDocument()
    expect(screen.getByText('Gemini が作成')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'すべて表示' }))

    expect(within(log).getAllByRole('group')).toHaveLength(6)
    expect(within(log).getByRole('group', { name: '3 往復目・出品者の AI:¥5,700' })).toBeInTheDocument()
    expect(screen.getByText('合意')).toBeInTheDocument()
    expect(screen.getByText('¥5,800')).toBeInTheDocument()
    expect(screen.getByText('出品価格 ¥6,500 より ¥700 安い(11% 引き)')).toBeInTheDocument()
    expect(screen.getByText('あなたの上限:¥6,000(上限としては出品者に表示されません)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'すべて表示' })).not.toBeInTheDocument()

    expect(calls.find((c) => c.key === 'POST /items/i1/auto-negotiate')?.body).toEqual({ max_price: 6000 })
    expect(onSettled).toHaveBeenCalledWith(AGREED)
  })

  it('間隔をおいて、吹き出しが自動で最後まで進む', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, AGREED) })
    renderModal({ stepMs: 5 })

    await start(user)

    expect(await screen.findByText('合意')).toBeInTheDocument()
    expect(within(screen.getByRole('log')).getAllByRole('group')).toHaveLength(6)
  })

  it('動きを減らす設定の人には、最初から全部を見せる', async () => {
    const user = userEvent.setup()
    stubReducedMotion()
    mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, AGREED) })
    renderModal()

    await start(user)

    expect(await screen.findByText('合意')).toBeInTheDocument()
    expect(within(screen.getByRole('log')).getAllByRole('group')).toHaveLength(6)
    expect(screen.queryByRole('button', { name: 'すべて表示' })).not.toBeInTheDocument()
  })

  it('「この金額で購入する」で、購入の確認へ引き継ぐ', async () => {
    const user = userEvent.setup()
    stubReducedMotion()
    mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, AGREED) })
    const { onPurchase } = renderModal()

    await start(user)
    await user.click(await screen.findByRole('button', { name: 'この金額で購入する' }))

    expect(onPurchase).toHaveBeenCalledTimes(1)
  })

  it('不成立: その旨と決め方を出し、「上限を変えてもう一度」で入力に戻れる(入れた上限は残る)', async () => {
    const user = userEvent.setup()
    stubReducedMotion()
    const { calls } = mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, NO_DEAL) })
    renderModal()

    const input = await screen.findByLabelText(/出せる上限/)
    await user.clear(input)
    await user.type(input, '3000')
    await start(user)

    expect(await screen.findByText('不成立')).toBeInTheDocument()
    expect(within(screen.getByRole('log')).getAllByRole('group')).toHaveLength(8)
    expect(screen.getByText(NO_DEAL.rule)).toBeInTheDocument()
    expect(screen.getByText('AI 未接続(定型文)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この金額で購入する' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '上限を変えてもう一度' }))

    expect(screen.getByLabelText(/出せる上限/)).toHaveValue('¥3,000')
    expect(screen.queryByRole('log')).not.toBeInTheDocument()

    // 上限を上げて、もう一度呼べる
    await user.clear(screen.getByLabelText(/出せる上限/))
    await user.type(screen.getByLabelText(/出せる上限/), '4000')
    await start(user)
    await screen.findByText('不成立')
    expect(calls.filter((c) => c.key === 'POST /items/i1/auto-negotiate').map((c) => c.body)).toEqual([
      { max_price: 3000 },
      { max_price: 4000 },
    ])
  })

  it('上限が空なら API を呼ばずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({})
    renderModal()

    await user.clear(await screen.findByLabelText(/出せる上限/))
    await start(user)

    expect(screen.getByText('出せる上限を 1 円以上の整数で入れてください')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it.each([
    [403, 'own_item', '自分の商品です'],
    [409, 'sold_out', '売り切れました'],
    [409, 'auto_negotiation_disabled', 'AI 交渉を受け付けていません'],
    [429, 'too_many_negotiations', 'AI 交渉の回数の上限です'],
  ])('エラー %i %s のとき「%s」と出し、入力はそのまま残す', async (status, code, title) => {
    const user = userEvent.setup()
    mockFetch({
      'POST /items/i1/auto-negotiate': () => jsonResponse(status, { detail: { code, message: 'サーバーの文' } }),
    })
    const { onPurchase } = renderModal()

    await start(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(title)).toBeInTheDocument()
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/出せる上限/)).toHaveValue('¥5,800')
    expect(onPurchase).not.toHaveBeenCalled()
  })

  it('already_agreed のときは、合意した金額での購入へ進める', async () => {
    const user = userEvent.setup()
    mockFetch({
      'POST /items/i1/auto-negotiate': () =>
        jsonResponse(409, { detail: { code: 'already_agreed', message: 'すでに承諾済みの交渉があります' } }),
    })
    const { onPurchase } = renderModal()

    await start(user)

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('すでに合意しています')).toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: '合意した金額で購入にすすむ' }))
    expect(onPurchase).toHaveBeenCalledTimes(1)
  })

  it('知らないエラーは、サーバーの文をそのまま出す', async () => {
    const user = userEvent.setup()
    mockFetch({
      'POST /items/i1/auto-negotiate': () =>
        jsonResponse(500, { detail: { code: 'boom', message: 'サーバーで問題が起きました' } }),
    })
    renderModal()

    await start(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('交渉を始められませんでした')
    expect(alert).toHaveTextContent('サーバーで問題が起きました')
  })

  it('max_price が無い応答(古い形)でも壊れない', async () => {
    const user = userEvent.setup()
    stubReducedMotion()
    const { max_price: _omit, ...withoutMax } = AGREED
    mockFetch({ 'POST /items/i1/auto-negotiate': () => jsonResponse(200, withoutMax) })
    renderModal()

    await start(user)

    expect(await screen.findByText('合意')).toBeInTheDocument()
    expect(screen.queryByText(/あなたの上限/)).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'この金額で購入する' })).toBeEnabled())
  })
})
