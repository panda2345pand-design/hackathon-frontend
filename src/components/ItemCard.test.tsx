import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/helpers'
import type { ItemSummary } from '../types'
import { ItemCard } from './ItemCard'

// 新しい項目(auto_negotiation / image_ai_generated)が無い、古い形の応答
const OLD: ItemSummary = {
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

describe('ItemCard', () => {
  it('古い応答(新しい項目が無い)では、AI 交渉可・AI 画像の印を出さない', () => {
    renderPage(<ItemCard item={OLD} />)

    expect(screen.getByRole('link', { name: 'Nintendo Switch Case ¥1,800' })).toBeInTheDocument()
    expect(screen.queryByText('AI 交渉可')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 画像')).not.toBeInTheDocument()
  })

  it('AI 交渉ができる商品には「AI 交渉可」、AI が作った画像には「AI 画像」を出す', () => {
    renderPage(
      <ItemCard
        item={{ ...OLD, auto_negotiation: true, image_url: 'https://api.example/images/x', image_ai_generated: true }}
      />,
    )

    expect(screen.getByRole('link', { name: 'Nintendo Switch Case ¥1,800 AI 交渉可' })).toBeInTheDocument()
    expect(screen.getByText('AI 交渉可')).toBeInTheDocument()
    expect(screen.getByText('AI 画像')).toBeInTheDocument()
    // 写真は、画面に近づくまで読み込まない
    expect(screen.getByRole('img', { name: 'Nintendo Switch Case' })).toHaveAttribute('loading', 'lazy')
  })

  it('売り切れは「売り切れ」と出し、AI 交渉可は出さない', () => {
    renderPage(<ItemCard item={{ ...OLD, status: 'sold', auto_negotiation: true }} />)

    expect(screen.getByText('売り切れ')).toBeInTheDocument()
    expect(screen.queryByText('SOLD')).not.toBeInTheDocument()
    expect(screen.queryByText('AI 交渉可')).not.toBeInTheDocument()
  })
})
