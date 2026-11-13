import { createContext, useContext } from 'react'
import type { AuthMode } from '../config'
import type { User } from '../types'

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

export interface AuthContextValue {
  mode: AuthMode
  status: AuthStatus
  user: User | null
  /** dev モード: 名前だけでログイン */
  signInDev: (name: string) => Promise<void>
  /** firebase モード: メール+パスワードでログイン */
  signInWithEmail: (email: string, password: string) => Promise<void>
  /** firebase モード: 新規登録(表示名つき) */
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth は AuthProvider の中で使ってください')
  return value
}
