import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, getMe, register, setTokenProvider } from '../api'
import { AUTH_MODE } from '../config'
import { notifyError } from '../lib/errors'
import type { User } from '../types'
import { toAuthError } from './authErrors'
import { AuthContext, type AuthContextValue, type AuthStatus } from './context'
import {
  clearDevSession,
  devToken,
  loadDevSession,
  saveDevSession,
  slugifyName,
} from './devAuth'

interface AuthState {
  status: AuthStatus
  user: User | null
}

const SIGNED_OUT: AuthState = { status: 'signedOut', user: null }

const loadFirebase = () => import('./firebaseAuth')

// 画面の最初の API 呼び出しより前にトークンの取り出し方を決めておく
let devUid: string | null = AUTH_MODE === 'dev' ? (loadDevSession()?.uid ?? null) : null
if (AUTH_MODE === 'dev') {
  setTokenProvider(() => Promise.resolve(devUid ? devToken(devUid) : null))
} else {
  setTokenProvider(async () => (await loadFirebase()).getIdToken())
}

function initialState(): AuthState {
  if (AUTH_MODE === 'firebase') return { status: 'loading', user: null }
  const session = loadDevSession()
  return session ? { status: 'signedIn', user: session.user } : SIGNED_OUT
}

/** API 側のユーザーを用意する。名前の指定があれば登録(更新)、なければ既存を読み、無ければ登録 */
async function ensureRegistered(explicitName: string | null, fallbackName: string): Promise<User> {
  if (explicitName) return register(explicitName)
  try {
    return await getMe()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return register(fallbackName)
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  // 新規登録で入力された表示名(Firebase の状態変化より先に決まる)
  const pendingName = useRef<string | null>(null)

  // dev: 保存済みのログインがあれば、API 側のユーザーを作り直しておく(DB が初期化されても動くように)
  useEffect(() => {
    if (AUTH_MODE !== 'dev') return
    const session = loadDevSession()
    if (!session) return
    let cancelled = false
    register(session.user.name).then(
      (user) => {
        if (cancelled) return
        saveDevSession({ uid: session.uid, user })
        setState({ status: 'signedIn', user })
      },
      () => {
        // バックエンドが止まっていても、保存済みの情報で画面は出す
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // firebase: ログイン状態を購読する
  useEffect(() => {
    if (AUTH_MODE !== 'firebase') return
    let cancelled = false
    let unsubscribe = () => {}

    loadFirebase()
      .then((fb) => {
        if (cancelled) return
        unsubscribe = fb.subscribe((identity) => {
          if (!identity) {
            setState(SIGNED_OUT)
            return
          }
          const fallbackName = identity.displayName || identity.email?.split('@')[0] || 'ユーザー'
          ensureRegistered(pendingName.current, fallbackName).then(
            (user) => {
              pendingName.current = null
              if (!cancelled) setState({ status: 'signedIn', user })
            },
            (error: unknown) => {
              pendingName.current = null
              notifyError(error, 'ログインを完了できませんでした')
              void fb.signOut()
            },
          )
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        notifyError(error, 'Firebase を初期化できませんでした')
        setState(SIGNED_OUT)
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const signInDev = useCallback(async (name: string) => {
    const trimmed = name.trim()
    const uid = slugifyName(trimmed)
    const previous = devUid
    devUid = uid
    try {
      const user = await register(trimmed)
      saveDevSession({ uid, user })
      setState({ status: 'signedIn', user })
    } catch (error) {
      devUid = previous
      throw error
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await (await loadFirebase()).signIn(email, password)
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    pendingName.current = name.trim()
    try {
      await (await loadFirebase()).signUp(email, password, name.trim())
    } catch (error) {
      pendingName.current = null
      throw toAuthError(error)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (AUTH_MODE === 'dev') {
      devUid = null
      clearDevSession()
      setState(SIGNED_OUT)
      return
    }
    await (await loadFirebase()).signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ mode: AUTH_MODE, ...state, signInDev, signInWithEmail, signUpWithEmail, signOut }),
    [state, signInDev, signInWithEmail, signUpWithEmail, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
