import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { jsonResponse, mockFetch, renderPage } from '../test/helpers'
import type { PriceEstimate } from '../types'
import { SellPage } from './SellPage'

const CATEGORIES = { categories: ['家電', '本'], conditions: ['新品', '目立った傷なし'] }

function renderSell() {
  return renderPage(
    <Routes>
      <Route path="/sell" element={<SellPage />} />
      <Route path="/items/:id" element={<p>商品ページ</p>} />
    </Routes>,
    '/sell',
  )
}

/** カテゴリの読み込みを待ってから、必須の項目を埋める */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: '家電' })
  await user.type(screen.getByLabelText(/商品名/), '処方薬 まとめ売り')
  await user.selectOptions(screen.getByLabelText(/カテゴリ/), '家電')
  await user.selectOptions(screen.getByLabelText(/状態/), '新品')
}

describe('SellPage', () => {
  it('出品禁止(422 prohibited)のとき、理由を大きく出して入力内容を残す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /items': () =>
        jsonResponse(422, {
          detail: { code: 'prohibited', message: '医薬品は出品できません(禁止されている品目です)' },
        }),
    })
    renderSell()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '飲み残しの薬です')
    await user.type(screen.getByLabelText(/価格/), '1500')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('この商品は出品できません')).toBeInTheDocument()
    expect(within(alert).getByText('医薬品は出品できません(禁止されている品目です)')).toBeInTheDocument()

    // サーバーには入力どおりに送っている(金額は整数の円)
    expect(calls.find((c) => c.key === 'POST /items')?.body).toEqual({
      title: '処方薬 まとめ売り',
      description: '飲み残しの薬です',
      category: '家電',
      condition: '新品',
      price: 1500,
    })

    // 入力内容は消えていないし、商品ページへも移動していない
    expect(screen.getByLabelText(/商品名/)).toHaveValue('処方薬 まとめ売り')
    expect(screen.getByLabelText(/商品の説明/)).toHaveValue('飲み残しの薬です')
    expect(screen.getByLabelText(/カテゴリ/)).toHaveValue('家電')
    expect(screen.getByLabelText(/状態/)).toHaveValue('新品')
    expect(screen.getByLabelText(/価格/)).toHaveValue('¥1,500')
    expect(screen.queryByText('商品ページ')).not.toBeInTheDocument()
  })

  it('必須の項目が空なら API を呼ばずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({ 'GET /categories': () => jsonResponse(200, CATEGORIES) })
    renderSell()

    await screen.findByRole('option', { name: '家電' })
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('商品名を入れてください')).toBeInTheDocument()
    expect(screen.getByText('価格を 1 円以上の整数で入れてください')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /items')).toBe(false)
  })

  it('AI の説明文が fallback のときは「AI 未接続(定型文)」と表示する', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/describe': () => jsonResponse(200, { description: '定型の説明文です。', source: 'fallback' }),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI で説明文を書く' }))

    await waitFor(() => expect(screen.getByLabelText(/商品の説明/)).toHaveValue('定型の説明文です。'))
    expect(screen.getByText('AI 未接続(定型文)')).toBeInTheDocument()
    expect(screen.queryByText('Gemini が作成')).not.toBeInTheDocument()
  })

  it('「この価格を使う」でサーバーの予測価格をそのまま価格欄に入れる', async () => {
    const user = userEvent.setup()
    const estimate: PriceEstimate = {
      predicted_price: 4200,
      low: 3500,
      high: 5000,
      currency: 'JPY',
      basis: [{ feature: 'カテゴリ', value: '家電', effect: 'up' }],
      model: { name: 'ridge', mae: 800, r2: 0.61, trained_rows: 12000 },
      available: true,
    }
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/price': () => jsonResponse(200, estimate),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI に価格を聞く' }))

    expect(await screen.findByText('¥4,200')).toBeInTheDocument()
    expect(screen.getByText(/¥3,500 〜 ¥5,000/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'この価格を使う' }))
    expect(screen.getByLabelText(/価格/)).toHaveValue('¥4,200')
  })

  it('価格モデルが未接続(available=false)なら「未接続」と出し、数字は出さない', async () => {
    const user = userEvent.setup()
    const estimate: PriceEstimate = {
      predicted_price: null,
      low: null,
      high: null,
      currency: 'JPY',
      basis: [],
      model: null,
      available: false,
    }
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/price': () => jsonResponse(200, estimate),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI に価格を聞く' }))

    expect(await screen.findByText('未接続')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この価格を使う' })).not.toBeInTheDocument()
  })
})
