import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeItem, mockFetch, renderPage } from '../test/helpers'
import type { Offer, Order } from '../types'
import { PurchaseModal } from './PurchaseModal'

const ITEM = makeItem({ id: 'i1', price: 3000 })

function offer(overrides: Partial<Offer>): Offer {
  return {
    id: 'o1',
    item_id: 'i1',
    item_title: ITEM.title,
    buyer: { id: 'alice', name: 'アリス' },
    amount: 2500,
    message: null,
    ai_comment: null,
    status: 'accepted',
    created_at: '2026-11-14T01:00:00Z',
    ...overrides,
  }
}

function renderModal() {
  const onPurchased = vi.fn()
  const onClose = vi.fn()
  renderPage(<PurchaseModal item={ITEM} opened onClose={onClose} onPurchased={onPurchased} />)
  return { onPurchased, onClose }
}

describe('PurchaseModal', () => {
  it('承諾された価格交渉があれば、その金額を支払い金額として出す', async () => {
    mockFetch({ 'GET /me/offers': () => jsonResponse(200, { offers: [offer({ amount: 2500 })] }) })
    renderModal()

    expect(await screen.findByText('¥2,500')).toBeInTheDocument()
    expect(screen.getByText('価格交渉が成立した金額です(出品価格 ¥3,000)')).toBeInTheDocument()
  })

  it('承諾された交渉が無ければ出品価格を出す(返事待ち・見送り・別の商品の交渉は使わない)', async () => {
    mockFetch({
      'GET /me/offers': () =>
        jsonResponse(200, {
          offers: [
            offer({ id: 'o1', amount: 2000, status: 'pending' }),
            offer({ id: 'o2', amount: 1500, status: 'rejected' }),
            offer({ id: 'o3', amount: 1000, status: 'accepted', item_id: 'other-item' }),
          ],
        }),
    })
    renderModal()

    expect(await screen.findByText('¥3,000')).toBeInTheDocument()
    expect(screen.queryByText(/価格交渉が成立した金額です/)).not.toBeInTheDocument()
    expect(screen.queryByText('¥1,000')).not.toBeInTheDocument()
  })

  it('「購入を確定する」で購入 API を呼び、サーバーが返した注文を親に渡す', async () => {
    const user = userEvent.setup()
    const order: Order = {
      id: 'order1',
      item_id: 'i1',
      item_title: ITEM.title,
      price: 2500,
      created_at: '2026-11-14T02:00:00Z',
    }
    const { calls } = mockFetch({
      'GET /me/offers': () => jsonResponse(200, { offers: [offer({ amount: 2500 })] }),
      'POST /items/i1/purchase': () => jsonResponse(201, order),
    })
    const { onPurchased } = renderModal()

    await screen.findByText('¥2,500')
    await user.click(screen.getByRole('button', { name: '購入を確定する' }))

    await waitFor(() => expect(onPurchased).toHaveBeenCalledWith(order))
    // 金額はサーバーが決めるので、画面からは金額を送らない
    const purchase = calls.filter((c) => c.key === 'POST /items/i1/purchase')
    expect(purchase).toHaveLength(1)
    expect(purchase[0].body).toBeUndefined()
  })

  it('409(先に売れた)のときは、理由を出して閉じない', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /me/offers': () => jsonResponse(200, { offers: [] }),
      'POST /items/i1/purchase': () =>
        jsonResponse(409, { detail: { code: 'sold_out', message: 'この商品はすでに売り切れています' } }),
    })
    const { onPurchased, onClose } = renderModal()

    await screen.findByText('¥3,000')
    await user.click(screen.getByRole('button', { name: '購入を確定する' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('購入できませんでした')
    expect(alert).toHaveTextContent('この商品はすでに売り切れています')
    expect(onPurchased).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // もう一度押せる状態に戻っている
    expect(screen.getByRole('button', { name: '購入を確定する' })).toBeEnabled()
  })

  it('価格交渉の状況を読めなかったときは、出品価格を出してその旨を伝える', async () => {
    mockFetch({ 'GET /me/offers': () => jsonResponse(500, {}) })
    renderModal()

    expect(await screen.findByText('¥3,000')).toBeInTheDocument()
    expect(screen.getByText(/価格交渉の状況を確認できなかったため/)).toBeInTheDocument()
  })
})
