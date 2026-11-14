import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderPage } from '../test/helpers'
import { HomePage } from './HomePage'

const ITEM = {
  id: 'i1',
  title: 'Nintendo Switch Case',
  price: 1800,
  category: 'Electronics',
  condition: 'Like new',
  image_url: null,
  status: 'on_sale',
  cluster_id: 11,
  like_count: 2,
  created_at: '2026-11-14T00:00:00Z',
}

function mockHome(clusters: unknown[]) {
  return mockFetch({
    'GET /categories': () => jsonResponse(200, { categories: ['Women', 'Electronics'], conditions: ['New'] }),
    'GET /clusters': () => jsonResponse(200, { clusters }),
    'GET /items': () => jsonResponse(200, { items: [ITEM], total: 1 }),
  })
}

describe('HomePage', () => {
  it('AI ジャンルは label_ja があれば日本語で、無ければ元の label で出す', async () => {
    mockHome([
      { id: 11, label: 'Electronics: nintendo / case / iphone', label_ja: 'ゲーム機・スマホケース', count: 18 },
      { id: 2, label: 'Women: pink / secret / victoria', count: 1234 },
    ])
    renderPage(<HomePage />)

    expect(await screen.findByText('ゲーム機・スマホケース(18)')).toBeInTheDocument()
    expect(screen.queryByText(/Electronics: nintendo/)).not.toBeInTheDocument()
    // label_ja が無い(古いバックエンド)ときも壊れない
    expect(screen.getByText('Women: pink / secret / victoria(1,234)')).toBeInTheDocument()
  })

  it('カテゴリと状態は日本語で見せ、絞り込みでは英語の値のまま API に送る', async () => {
    const user = userEvent.setup()
    const { fetchMock } = mockHome([])
    renderPage(<HomePage />)

    // 選択肢の文字は日本語、value は英語のまま
    const option = await screen.findByRole('option', { name: '家電・ゲーム' })
    expect(option).toHaveValue('Electronics')
    // 商品カードの状態バッジと、写真なしの面のカテゴリ名
    expect(await screen.findByText('未使用に近い')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Nintendo Switch Case(写真なし・家電・ゲーム)' })).toBeInTheDocument()
    expect(screen.queryByText('Like new')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('カテゴリ'), 'Electronics')

    const sent = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname === '/items')
      .map((url) => url.searchParams.get('category'))
    expect(sent).toContain('Electronics')
    expect(sent).not.toContain('家電・ゲーム')
  })
})
