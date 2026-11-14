import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeItem, mockFetch, renderPage } from '../test/helpers'
import type { NegotiateResponse, Offer } from '../types'
import { NegotiateModal } from './NegotiateModal'

const ITEM = makeItem({ id: 'i1', price: 3000 })

const ADVICE: NegotiateResponse = {
  acceptance: 'high',
  reply: 'はじめまして。2,500円でお譲りいただけないでしょうか。',
  seller_tip: '適正価格に近い提案です。',
  predicted_price: 2800,
  source: 'gemini',
}

const OFFER: Offer = {
  id: 'o1',
  item_id: 'i1',
  item_title: ITEM.title,
  buyer: { id: 'alice', name: 'アリス' },
  amount: 2500,
  message: 'はじめまして。2,500円でお願いします。',
  ai_comment: null,
  status: 'pending',
  created_at: '2026-11-14T01:00:00Z',
}

function renderModal() {
  const onSent = vi.fn()
  const onClose = vi.fn()
  renderPage(<NegotiateModal item={ITEM} opened onClose={onClose} onSent={onSent} />)
  return { onSent, onClose }
}

async function askAi(user: ReturnType<typeof userEvent.setup>, amount: string) {
  await user.type(await screen.findByLabelText(/希望する金額/), amount)
  await user.click(screen.getByRole('button', { name: 'AI に相談する' }))
}

describe('NegotiateModal', () => {
  it('AI に相談 → 通りやすさと文面が出る → 文面を直して送る', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'POST /ai/negotiate': () => jsonResponse(200, ADVICE),
      'POST /items/i1/offers': () => jsonResponse(201, OFFER),
    })
    const { onSent } = renderModal()

    await askAi(user, '2500')

    // ② AI の答え: 通りやすさのバッジ・出どころ・適正価格の目安・出品者側の見方
    expect(await screen.findByLabelText('通りやすさ:通りやすい')).toBeInTheDocument()
    expect(screen.getByText('¥2,500')).toBeInTheDocument()
    expect(screen.getByText('AI の適正価格の目安:¥2,800')).toBeInTheDocument()
    expect(screen.getByText('適正価格に近い提案です。')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /ai/negotiate')?.body).toEqual({ item_id: 'i1', amount: 2500 })

    // ③ 文面は AI の下書きが入っていて、自由に直せる
    const message = screen.getByLabelText(/出品者に送るメッセージ/)
    expect(message).toHaveValue(ADVICE.reply)
    await user.clear(message)
    await user.type(message, 'はじめまして。2,500円でお願いします。')

    await user.click(screen.getByRole('button', { name: 'この内容で送る' }))

    await waitFor(() => expect(onSent).toHaveBeenCalledWith(OFFER))
    // 送るのは「相談したときの金額」と「直したあとの文面」
    expect(calls.find((c) => c.key === 'POST /items/i1/offers')?.body).toEqual({
      amount: 2500,
      message: 'はじめまして。2,500円でお願いします。',
    })
  })

  it('通りにくい金額のときは「通りにくい」と出し、AI 未接続ならそう表示する', async () => {
    const user = userEvent.setup()
    mockFetch({
      'POST /ai/negotiate': () =>
        jsonResponse(200, { ...ADVICE, acceptance: 'low', source: 'fallback', predicted_price: null }),
    })
    renderModal()

    await askAi(user, '500')

    expect(await screen.findByLabelText('通りやすさ:通りにくい')).toBeInTheDocument()
    expect(screen.getByText('AI 未接続(定型文)')).toBeInTheDocument()
    expect(screen.queryByText(/AI の適正価格の目安/)).not.toBeInTheDocument()
  })

  it('金額が空なら AI を呼ばずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({})
    renderModal()

    await user.click(await screen.findByRole('button', { name: 'AI に相談する' }))

    expect(screen.getByText('希望する金額を 1 円以上の整数で入れてください')).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })

  it('送信に失敗したら理由を出し、文面は残す', async () => {
    const user = userEvent.setup()
    mockFetch({
      'POST /ai/negotiate': () => jsonResponse(200, ADVICE),
      'POST /items/i1/offers': () =>
        jsonResponse(409, { detail: { code: 'sold_out', message: 'この商品はすでに売り切れています' } }),
    })
    const { onSent } = renderModal()

    await askAi(user, '2500')
    await user.click(await screen.findByRole('button', { name: 'この内容で送る' }))

    // 「出品者側から見ると」も Alert なので、タイトルで送信エラーのほうを選ぶ
    const alert = await screen.findByRole('alert', { name: '送れませんでした' })
    expect(alert).toHaveTextContent('この商品はすでに売り切れています')
    expect(onSent).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/出品者に送るメッセージ/)).toHaveValue(ADVICE.reply)
  })

  it('「金額を変える」で金額の入力に戻れる', async () => {
    const user = userEvent.setup()
    mockFetch({ 'POST /ai/negotiate': () => jsonResponse(200, ADVICE) })
    renderModal()

    await askAi(user, '2500')
    await user.click(await screen.findByRole('button', { name: '金額を変える' }))

    expect(screen.getByLabelText(/希望する金額/)).toHaveValue('¥2,500')
    expect(screen.queryByLabelText(/出品者に送るメッセージ/)).not.toBeInTheDocument()
  })
})
