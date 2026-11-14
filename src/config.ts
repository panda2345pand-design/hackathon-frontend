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

/**
 * お試し用アカウント(審査員やはじめての人が、登録なしで1クリックで入るため)。
 * だれでも使える共用アカウントなので、パスワードは秘密ではない(ブラウザに配られる)。3つそろっていなければボタンを出さない。
 */
export interface DemoAccount {
  key: 'buyer' | 'seller'
  label: string
  hint: string
  email: string
}
const DEMO_PASSWORD_VALUE: string = import.meta.env.VITE_DEMO_PASSWORD || ''
export const DEMO_PASSWORD = DEMO_PASSWORD_VALUE
export const DEMO_ACCOUNTS: DemoAccount[] = DEMO_PASSWORD_VALUE
  ? [
      {
        key: 'buyer' as const,
        label: '買い手として試す',
        hint: '商品を選んで、AI と価格交渉・購入',
        email: import.meta.env.VITE_DEMO_BUYER_EMAIL || '',
      },
      {
        key: 'seller' as const,
        label: '売り手として試す',
        hint: 'AI と出品、届いた交渉に返事',
        email: import.meta.env.VITE_DEMO_SELLER_EMAIL || '',
      },
    ].filter((a) => a.email)
  : []
