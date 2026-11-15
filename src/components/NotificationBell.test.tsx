import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderPage } from '../test/helpers'
import type { NotificationsResponse } from '../types'
import { AppLayout } from './AppLayout'
import { NotificationBell } from './NotificationBell'

const UNREAD: NotificationsResponse = {
  unread_count: 2,
  notifications: [
    {
      id: 'n1',
      type: 'auto_negotiation_agreed',
      message: '「Nintendo Switch Case」で、AI が ¥5,800 で合意しました',
      item_id: 'i1',
      read: false,
      created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    },
    {
      id: 'n2',
      type: 'offer_received',
      message: '「マウンテンパーカー」に ¥4,000 の価格交渉が届きました',
      item_id: 'i2',
      read: false,
      created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    },
  ],
}

/** タブが隠れた・見えた、をまねる */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

describe('NotificationBell', () => {
  it('未読の件数をベルに出し、開くと一覧(文・いつ・商品へのリンク)を出して、既読にする', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /me/notifications': () => jsonResponse(200, UNREAD),
      'POST /me/notifications/read-all': () => jsonResponse(200, { unread_count: 0 }),
    })
    renderPage(<NotificationBell />)

    const bell = await screen.findByRole('button', { name: 'お知らせ(未読 2 件)' })
    expect(screen.getByText('2')).toBeInTheDocument()

    await user.click(bell)

    const menu = await screen.findByRole('menu')
    // hidden: true … テスト環境(jsdom)は位置の計算ができず、Mantine のメニューが display: none のままになるため
    const first = await within(menu).findByRole('menuitem', { name: /AI が ¥5,800 で合意しました/, hidden: true })
    expect(first).toHaveAttribute('href', '/items/i1')
    expect(within(first).getByText('5分前')).toBeInTheDocument()
    expect(within(menu).getByText('3時間前')).toBeInTheDocument()

    // 開いたら「全部読んだ」と伝え、数字が消える
    await waitFor(() => expect(screen.getByRole('button', { name: 'お知らせ' })).toBeInTheDocument())
    expect(calls.filter((c) => c.key === 'POST /me/notifications/read-all')).toHaveLength(1)
    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })

  it('未読が 0 件なら数字を出さず、開いても read-all を呼ばない', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /me/notifications': () => jsonResponse(200, { unread_count: 0, notifications: [] }),
    })
    renderPage(<NotificationBell />)

    await waitFor(() => expect(calls.some((c) => c.key === 'GET /me/notifications')).toBe(true))
    await user.click(screen.getByRole('button', { name: 'お知らせ' }))

    expect(await screen.findByText('お知らせはまだありません')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /me/notifications/read-all')).toBe(false)
  })

  it('30 秒ごとに読み直し、タブが隠れているあいだは止める', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { calls } = mockFetch({ 'GET /me/notifications': () => jsonResponse(200, UNREAD) })
    const count = () => calls.filter((c) => c.key === 'GET /me/notifications').length
    renderPage(<NotificationBell />)

    await screen.findByRole('button', { name: 'お知らせ(未読 2 件)' })
    expect(count()).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(count()).toBe(2)

    setVisibility('hidden')
    await act(() => vi.advanceTimersByTimeAsync(120_000))
    expect(count()).toBe(2)

    // 見える状態に戻ったら、すぐ 1 回読む
    setVisibility('visible')
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(count()).toBe(3)
  })

  it('まだ API が無い(404)ときも、ベルは出したまま画面を壊さない', async () => {
    const user = userEvent.setup()
    mockFetch({})
    renderPage(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: 'お知らせ' }))

    expect(await screen.findByText('お知らせを読み込めませんでした')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('AppLayout', () => {
  it('ベルはログイン中だけ出す', async () => {
    mockFetch({ 'GET /me/notifications': () => jsonResponse(200, UNREAD) })
    const { unmount } = renderPage(<AppLayout />)
    expect(await screen.findByRole('button', { name: /お知らせ/ })).toBeInTheDocument()
    unmount()

    const { calls } = mockFetch({})
    renderPage(<AppLayout />, '/', { status: 'signedOut', user: null })
    expect(screen.getByRole('link', { name: 'ログイン' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /お知らせ/ })).not.toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })
})
