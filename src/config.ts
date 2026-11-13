export type AuthMode = 'dev' | 'firebase'

/** バックエンドの URL(末尾の / は取りのぞく) */
export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
)

/** 認証モード。未設定なら dev */
export const AUTH_MODE: AuthMode = import.meta.env.VITE_AUTH_MODE === 'firebase' ? 'firebase' : 'dev'

/** 一覧で一度に読み込む件数 */
export const PAGE_SIZE = 24
