import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeItem, mockFetch, renderPage } from '../test/helpers'
import type { AutoNegotiation, ItemDetail, Offer } from '../types'
import { ItemDetailPage } from './ItemDetailPage'

type Routes_ = Parameters<typeof mockFetch>[0]

const NEGOTIATION: AutoNegotiation = {
  id: 'n1',
  item_id: 'i1',
  outcome: 'agreed',
  agreed_price: 5800,
  list_price: 6500,
  max_price: 6000,
  rounds: [
    { round: 1, buyer_offer: 5900, buyer_message: '5,900円でお願いします。', seller_ask: 5700, seller_message: '承知しました。' },
  ],
  offer_id: 'o9',
  source: 'gemini',
  rule: '買い手の提示が売り手の提示以上になった往復で、2 つの中間の金額で合意します。',
  created_at: '2026-11-15T01:00:00Z',
}

const ACCEPTED: Offer = {
  id: 'o9',
  item_id: 'i1',
  item_title: 'Nintendo Switch Case',
  buyer: { id: 'alice', name: 'アリス' },
  amount: 5800,
  message: null,
  ai_comment: null,
  status: 'accepted',
  created_at: '2026-11-15T01:00:00Z',
}

/** 商品ページが開いたときに読む API をまとめて用意する。足りないものだけ routes で足す */
function mockDetail(item: ItemDetail, routes: Routes_ = {}) {
  return mockFetch({
    'GET /items/i1': () => jsonResponse(200, item),
    'GET /items/i1/price-estimate': () =>
      jsonResponse(200, { predicted_price: null, low: null, high: null, currency: 'JPY', basis: [], model: null, available: false }),
    'GET /items/i1/similar': () => jsonResponse(200, { cluster_id: null, cluster_label: null, items: [] }),
    'GET /me/offers': () => jsonResponse(200, { offers: [] }),
    'GET /items/i1/offers': () => jsonResponse(200, { offers: [] }),
    'GET /items/i1/negotiations': () => jsonResponse(200, { negotiations: [] }),
    ...routes,
  })
}

function renderDetail(auth: Parameters<typeof renderPage>[2] = {}) {
  return renderPage(
    <Routes>
      <Route path="/items/:id" element={<ItemDetailPage />} />
      <Route path="/login" element={<p>ログイン画面</p>} />
    </Routes>,
    '/items/i1',
    auth,
  )
}

describe('ItemDetailPage(買い手)', () => {
  it('auto_negotiation が true の商品には「AI に交渉を任せる」を出す', async () => {
    mockDetail(makeItem({ price: 6500, auto_negotiation: true, min_price: null }))
    renderDetail()

    expect(await screen.findByRole('button', { name: 'AI に交渉を任せる' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '購入する' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '価格交渉する' })).toBeInTheDocument()
    // 最低価格は買い手には来ない(null)。画面にも出さない
    expect(screen.queryByText(/最低価格/)).not.toBeInTheDocument()
  })

  it('古い応答(新しい項目が無い)でも今までどおり表示し、AI 交渉のボタンや AI 画像の注記は出さない', async () => {
    const { calls } = mockDetail(makeItem({ price: 6500 }))
    renderDetail()

    expect(await screen.findByRole('button', { name: '購入する' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '価格交渉する' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI に交渉を任せる' })).not.toBeInTheDocument()
    expect(screen.queryByText(/AI が作ったイメージ画像/)).not.toBeInTheDocument()
    // AI 交渉が無い商品では、余分な API を呼ばない
    expect(calls.some((c) => c.key === 'GET /me/offers')).toBe(false)
    expect(calls.some((c) => c.key === 'GET /items/i1/negotiations')).toBe(false)
  })

  it('AI 交渉が合意したら、購入の確認に合意した金額が出る', async () => {
    const user = userEvent.setup()
    // 動きを減らす設定にして、やりとりを最初から全部出す
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }))
    let agreed = false
    mockDetail(makeItem({ price: 6500, auto_negotiation: true }), {
      'POST /items/i1/auto-negotiate': () => {
        agreed = true
        return jsonResponse(200, NEGOTIATION)
      },
      // 合意すると、サーバー側に承諾済みの交渉ができる
      'GET /me/offers': () => jsonResponse(200, { offers: agreed ? [ACCEPTED] : [] }),
    })
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'AI に交渉を任せる' }))
    await user.click(await screen.findByRole('button', { name: '交渉を始める' }))
    const dialog = await screen.findByRole('dialog', { name: 'AI に交渉を任せる' })
    await user.click(await within(dialog).findByRole('button', { name: 'この金額で購入する' }))

    const purchase = await screen.findByRole('dialog', { name: '購入の確認' })
    expect(await within(purchase).findByText('¥5,800')).toBeInTheDocument()
    expect(within(purchase).getByText('価格交渉が成立した金額です(出品価格 ¥6,500)')).toBeInTheDocument()
  })

  it('すでに合意した金額があるときは、その金額と購入のボタンを出し、AI 交渉のボタンは出さない', async () => {
    mockDetail(makeItem({ price: 6500, auto_negotiation: true }), {
      'GET /me/offers': () => jsonResponse(200, { offers: [ACCEPTED] }),
    })
    renderDetail()

    expect(await screen.findByText('¥5,800 で交渉が成立しています')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'この金額で購入する' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AI に交渉を任せる' })).not.toBeInTheDocument()
  })

  it('ログインしていない人が「AI に交渉を任せる」を押すと、ログイン画面へ行く', async () => {
    const user = userEvent.setup()
    mockDetail(makeItem({ auto_negotiation: true }))
    renderDetail({ status: 'signedOut', user: null })

    await user.click(await screen.findByRole('button', { name: 'AI に交渉を任せる' }))

    expect(await screen.findByText('ログイン画面')).toBeInTheDocument()
  })

  it('AI が作った画像には、実物の写真ではないと書く。売り切れは日本語で出す', async () => {
    mockDetail(
      makeItem({ image_url: 'https://api.example/images/x', image_ai_generated: true, status: 'sold', auto_negotiation: false }),
    )
    renderDetail()

    expect(await screen.findByText('AI が作ったイメージ画像です(実物の写真ではありません)')).toBeInTheDocument()
    expect(screen.getByText('売り切れ')).toBeInTheDocument()
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
    const image = screen.getByRole('img', { name: 'Nintendo Switch Case' })
    expect(image).toHaveAttribute('loading', 'lazy')
  })
})

describe('ItemDetailPage(出品者)', () => {
  const MINE = makeItem({ price: 6500, seller: { id: 'alice', name: 'アリス' }, auto_negotiation: true, min_price: 5000 })

  it('最低価格と、AI が代わりに交渉した記録(買い手・結果・金額・やりとり)を出す', async () => {
    const user = userEvent.setup()
    mockDetail(MINE, {
      'GET /items/i1/negotiations': () =>
        jsonResponse(200, {
          negotiations: [
            { ...NEGOTIATION, max_price: null, buyer: { id: 'carol', name: 'キャロル' } },
            { ...NEGOTIATION, id: 'n2', outcome: 'no_deal', agreed_price: null, max_price: null, offer_id: null, buyer: { id: 'dave', name: 'デイブ' } },
          ],
        }),
    })
    renderDetail()

    const section = await screen.findByRole('region', { name: 'AI が代わりに交渉した記録' })
    expect(within(section).getByText('¥5,000')).toBeInTheDocument()
    expect(within(section).getByText(/この金額は買い手には見えません/)).toBeInTheDocument()

    expect(await within(section).findByText(/キャロル さん/)).toBeInTheDocument()
    expect(within(section).getByText('¥5,800')).toBeInTheDocument()
    expect(within(section).getByText('合意')).toBeInTheDocument()
    expect(within(section).getByText(/デイブ さん/)).toBeInTheDocument()
    expect(within(section).getByText('不成立')).toBeInTheDocument()

    // やりとりは開いたときに見える。出品者から見ると、自分側は「あなたの AI」
    await user.click(within(section).getAllByRole('button', { name: 'やりとりを見る(1 往復)' })[0])
    expect(await within(section).findByRole('group', { name: '1 往復目・買い手の AI:¥5,900' })).toBeInTheDocument()
    expect(within(section).getByRole('group', { name: '1 往復目・あなたの AI:¥5,700' })).toBeInTheDocument()
    // 出品者に AI 交渉のボタン(買い手用)は出さない
    expect(screen.queryByRole('button', { name: 'AI に交渉を任せる' })).not.toBeInTheDocument()
  })

  it('最低価格を変えると PATCH で送り、返ってきた商品の値を出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockDetail(MINE, {
      'PATCH /items/i1/min-price': () => jsonResponse(200, { ...MINE, min_price: 5500 }),
    })
    renderDetail()

    await user.click(await screen.findByRole('button', { name: '最低価格を変える' }))
    const input = screen.getByLabelText(/AI 交渉の最低価格/)
    expect(input).toHaveValue('¥5,000')

    // 出品価格より高い金額は、送る前に止める
    await user.clear(input)
    await user.type(input, '7000')
    await user.click(screen.getByRole('button', { name: '保存する' }))
    expect(screen.getByText('最低価格は、出品価格(¥6,500)以下にしてください')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'PATCH /items/i1/min-price')).toBe(false)

    await user.clear(input)
    await user.type(input, '5500')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(calls.find((c) => c.key === 'PATCH /items/i1/min-price')?.body).toEqual({ min_price: 5500 }),
    )
    const section = screen.getByRole('region', { name: 'AI が代わりに交渉した記録' })
    expect(await within(section).findByText('¥5,500')).toBeInTheDocument()
  })

  it('「AI 交渉をやめる」は min_price: null を送る', async () => {
    const user = userEvent.setup()
    const { calls } = mockDetail(MINE, {
      'PATCH /items/i1/min-price': () => jsonResponse(200, { ...MINE, min_price: null, auto_negotiation: false }),
    })
    renderDetail()

    await user.click(await screen.findByRole('button', { name: '最低価格を変える' }))
    await user.click(screen.getByRole('button', { name: 'AI 交渉をやめる' }))

    await waitFor(() =>
      expect(calls.find((c) => c.key === 'PATCH /items/i1/min-price')?.body).toEqual({ min_price: null }),
    )
    expect(await screen.findByText('未設定')).toBeInTheDocument()
  })

  it('古いバックエンド(AI 交渉の項目が無い)では、AI 交渉の欄を出さず、記録も読みにいかない', async () => {
    const { calls } = mockDetail(makeItem({ seller: { id: 'alice', name: 'アリス' } }))
    renderDetail()

    expect(await screen.findByRole('region', { name: '届いた価格交渉' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'AI が代わりに交渉した記録' })).not.toBeInTheDocument()
    expect(calls.some((c) => c.key === 'GET /items/i1/negotiations')).toBe(false)
  })
})
