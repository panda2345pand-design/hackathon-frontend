import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { theme } from '../theme'
import type { ItemDetail } from '../types'

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Handler = (init: RequestInit | undefined) => Response

/**
 * fetch を差しかえる。routes のキーは「メソッド パス」(例: "POST /items")。
 * 戻り値の calls で、どの API が何回・どんな body で呼ばれたかを確かめられる。
 */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    calls.push({ key, body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined })
    const handler = routes[key]
    if (!handler) return jsonResponse(404, { detail: { code: 'not_found', message: `未定義: ${key}` } })
    return handler(init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

const signedIn: AuthContextValue = {
  mode: 'dev',
  status: 'signedIn',
  user: { id: 'alice', name: 'アリス', created_at: '2026-11-14T00:00:00Z' },
  signInDev: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
}

/**
 * Mantine・ルーター・認証コンテキストで包んで描画する。
 * 既定はログイン済み(dev モード)。auth で一部だけ差しかえられる(未ログイン、firebase モードなど)。
 */
export function renderPage(ui: ReactElement, route = '/', auth: Partial<AuthContextValue> = {}) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <AuthContext.Provider value={{ ...signedIn, ...auth }}>{ui}</AuthContext.Provider>
      </MemoryRouter>
    </MantineProvider>,
  )
}

/** テスト用の商品(詳細)。必要な項目だけ上書きして使う */
export function makeItem(overrides: Partial<ItemDetail> = {}): ItemDetail {
  return {
    id: 'i1',
    title: 'Nintendo Switch Case',
    price: 3000,
    category: 'Electronics',
    condition: 'Like new',
    image_url: null,
    status: 'on_sale',
    cluster_id: 11,
    like_count: 0,
    created_at: '2026-11-14T00:00:00Z',
    description: 'ケースです',
    brand: null,
    predicted_price: 2800,
    cluster_label: null,
    seller: { id: 'bob', name: 'ボブ' },
    liked: false,
    ...overrides,
  }
}
