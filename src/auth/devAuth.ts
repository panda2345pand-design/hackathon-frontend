import type { User } from '../types'

// 開発用ログイン(VITE_AUTH_MODE=dev)。名前から uid を作り、token は `dev:<uid>`。

const STORAGE_KEY = 'nego.dev-session'

export interface DevSession {
  uid: string
  user: User
}

/**
 * 名前を uid にする。HTTP ヘッダーに入れるので ASCII だけにする:
 * 半角英数字はそのまま、空白や記号は「-」、日本語などは文字コード(16 進)に置きかえる。
 * 同じ名前からは必ず同じ uid になる。
 */
export function slugifyName(name: string): string {
  let slug = ''
  for (const ch of name.normalize('NFKC').trim().toLowerCase()) {
    if (/[a-z0-9]/.test(ch)) slug += ch
    else if (ch.charCodeAt(0) < 128) slug += '-'
    else slug += `-u${(ch.codePointAt(0) ?? 0).toString(16)}`
  }
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '')
  return slug || 'user'
}

export function devToken(uid: string): string {
  return `dev:${uid}`
}

function isSession(value: unknown): value is DevSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { uid?: unknown; user?: { id?: unknown; name?: unknown } | null }
  return (
    typeof v.uid === 'string' &&
    typeof v.user === 'object' &&
    v.user !== null &&
    typeof v.user.id === 'string' &&
    typeof v.user.name === 'string'
  )
}

export function loadDevSession(): DevSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveDevSession(session: DevSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // 保存できなくてもログイン自体は続ける(再読み込みでログアウトになるだけ)
  }
}

export function clearDevSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 何もしない
  }
}
