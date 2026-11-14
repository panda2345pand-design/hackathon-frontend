import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderPage } from '../test/helpers'
import { MyPage } from './MyPage'

describe('MyPage', () => {
  it('「購入した商品」に、買った商品と実際に払った金額(交渉後の金額)が出る', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /me/items': () => jsonResponse(200, { items: [] }),
      // 出品価格 3,000 円の商品を、交渉が成立した 2,500 円で買った注文
      'GET /me/orders': () =>
        jsonResponse(200, {
          orders: [
            {
              id: 'order1',
              item_id: 'i1',
              item_title: 'Nintendo Switch Case',
              price: 2500,
              created_at: '2026-11-14T02:00:00Z',
            },
          ],
        }),
    })
    renderPage(<MyPage />, '/me')

    await user.click(screen.getByRole('tab', { name: '購入した商品' }))

    const link = await screen.findByRole('link', { name: 'Nintendo Switch Case' })
    expect(link).toHaveAttribute('href', '/items/i1')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('¥2,500')).toBeInTheDocument()
    expect(within(panel).getByText(/購入日:2026\/11\/14/)).toBeInTheDocument()
    // タブを開いたときにサーバーから読んでいる(購入の直後でも最新が出る)
    expect(calls.filter((c) => c.key === 'GET /me/orders')).toHaveLength(1)
  })

  it('購入がまだ無いときは、その旨と「商品をさがす」を出す', async () => {
    mockFetch({ 'GET /me/orders': () => jsonResponse(200, { orders: [] }) })
    renderPage(<MyPage />, '/me?tab=orders')

    expect(await screen.findByText('まだ購入した商品はありません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品をさがす' })).toBeInTheDocument()
  })
})
