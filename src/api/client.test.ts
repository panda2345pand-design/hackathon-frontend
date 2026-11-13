import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers'
import { ApiError, request, setTokenProvider } from './client'

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl)
  vi.stubGlobal('fetch', mock)
  return mock
}

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('エラーになるはずが成功した')
}

afterEach(() => setTokenProvider(() => Promise.resolve(null)))

describe('request', () => {
  it('成功したら JSON を返し、クエリの空の値は送らない', async () => {
    const mock = stubFetch(async () => jsonResponse(200, { items: [], total: 0 }))

    const res = await request<{ total: number }>('/items', {
      query: { q: 'カメラ', category: '', cluster: undefined, limit: 24, offset: 0 },
    })

    expect(res.total).toBe(0)
    const url = new URL(String(mock.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe('http://localhost:8000/items')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'カメラ', limit: '24', offset: '0' })
  })

  it('トークンがあれば Authorization: Bearer を付け、なければ付けない', async () => {
    const mock = stubFetch(async () => jsonResponse(200, {}))

    await request('/me')
    setTokenProvider(() => Promise.resolve('dev:alice'))
    await request('/me')

    const headersOf = (i: number) => new Headers(mock.mock.calls[i][1]?.headers)
    expect(headersOf(0).has('Authorization')).toBe(false)
    expect(headersOf(1).get('Authorization')).toBe('Bearer dev:alice')
  })

  it('body は JSON にして POST する', async () => {
    const mock = stubFetch(async () => jsonResponse(201, { id: 'x' }))

    await request('/auth/register', { method: 'POST', body: { name: 'アリス' } })

    const init = mock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ name: 'アリス' }))
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('エラー応答の detail.code と detail.message を ApiError に入れる', async () => {
    stubFetch(async () =>
      jsonResponse(422, { detail: { code: 'prohibited', message: '医薬品は出品できません' } }),
    )

    const error = await catchError(request('/items', { method: 'POST', body: {} }))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'prohibited', message: '医薬品は出品できません' })
  })

  it('FastAPI 標準の検証エラー(detail が配列)でも日本語の文を出す', async () => {
    stubFetch(async () =>
      jsonResponse(422, { detail: [{ loc: ['body', 'price'], msg: 'Input should be > 0', type: 'gt' }] }),
    )

    const error = await catchError(request('/items', { method: 'POST', body: {} }))

    expect(error).toMatchObject({ status: 422, code: 'validation', message: '入力内容を確認してください' })
  })

  it('JSON でないエラー応答でも落ちずに ApiError にする', async () => {
    stubFetch(async () => new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await catchError(request('/items'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'error' })
    expect((error as ApiError).message).toContain('502')
  })

  it('サーバーにつながらないときは code=network の ApiError にする', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    const error = await catchError(request('/items'))

    expect(error).toMatchObject({ status: 0, code: 'network' })
    expect((error as ApiError).message).toContain('接続できません')
  })
})
