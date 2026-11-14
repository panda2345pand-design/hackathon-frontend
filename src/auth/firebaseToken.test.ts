import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers'

// Firebase の ID トークンは 1 時間で切れる。
// ログインしたときのトークンを覚えて使い回すと、1 時間後から API が 401 になる。
// そこで「API を呼ぶたびに SDK の getIdToken() から取り直している」ことを確かめる
// (SDK の getIdToken() は、期限が近ければ自動で新しいトークンに取りかえて返す)。

const sdk = vi.hoisted(() => {
  const userGetIdToken = vi.fn<() => Promise<string>>()
  const auth = {
    currentUser: { getIdToken: userGetIdToken } as { getIdToken: () => Promise<string> } | null,
    authStateReady: vi.fn(async () => {}),
  }
  return { userGetIdToken, auth }
})

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => sdk.auth),
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}))
// firebase モードにする(本番と同じつなぎ方を確かめるため)
vi.mock('../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config')>()),
  AUTH_MODE: 'firebase',
}))

function stubFetch() {
  const mock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse(200, {}))
  vi.stubGlobal('fetch', mock)
  const authorization = (i: number) => new Headers(mock.mock.calls[i][1]?.headers).get('Authorization')
  return { mock, authorization }
}

describe('firebase モードのトークン', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
    sdk.userGetIdToken.mockReset()
    sdk.auth.currentUser = { getIdToken: sdk.userGetIdToken }
  })

  it('API を呼ぶたびに getIdToken() から取り直す(ログイン時のトークンを使い回さない)', async () => {
    // AuthProvider を読み込むと、トークンの取り出し方が API クライアントに登録される
    await import('./AuthProvider')
    const { request } = await import('../api/client')
    const { authorization } = stubFetch()

    // 1 回目は古いトークン、2 回目は SDK が更新したあとの新しいトークン
    sdk.userGetIdToken.mockResolvedValueOnce('token-old').mockResolvedValueOnce('token-refreshed')

    await request('/me')
    await request('/me/orders')

    expect(sdk.userGetIdToken).toHaveBeenCalledTimes(2)
    expect(authorization(0)).toBe('Bearer token-old')
    expect(authorization(1)).toBe('Bearer token-refreshed')
  })

  it('未ログインのときは Authorization を付けない', async () => {
    await import('./AuthProvider')
    const { request } = await import('../api/client')
    const { mock, authorization } = stubFetch()
    sdk.auth.currentUser = null

    await request('/items')

    expect(mock).toHaveBeenCalledTimes(1)
    expect(authorization(0)).toBeNull()
    expect(sdk.userGetIdToken).not.toHaveBeenCalled()
  })

  it('ログイン状態の復元(authStateReady)を待ってからトークンを読む', async () => {
    const { getIdToken } = await import('./firebaseAuth')
    sdk.auth.authStateReady.mockClear()
    sdk.userGetIdToken.mockResolvedValueOnce('token-1')

    expect(await getIdToken()).toBe('token-1')
    expect(sdk.auth.authStateReady).toHaveBeenCalledTimes(1)
  })
})
