// バックエンドの API 仕様(hackathon-backend/docs/api.md v1)に合わせた型。
// 金額はすべて円(整数)、日時は ISO 8601 の文字列。

export type ItemStatus = 'on_sale' | 'sold'
export type OfferStatus = 'pending' | 'accepted' | 'rejected'
export type AiSource = 'gemini' | 'fallback'
export type Acceptance = 'high' | 'mid' | 'low'

export interface User {
  id: string
  name: string
  created_at: string
}

export interface UserRef {
  id: string
  name: string
}

export interface ItemSummary {
  id: string
  title: string
  price: number
  category: string
  condition: string
  image_url: string | null
  status: ItemStatus
  cluster_id: number | null
  like_count: number
  created_at: string
}

export interface ItemDetail extends ItemSummary {
  description: string
  brand: string | null
  predicted_price: number | null
  cluster_label: string | null
  /** AI ジャンルの日本語名。バックエンドが返さないこともある */
  cluster_label_ja?: string | null
  seller: UserRef
  liked: boolean
}

export interface Order {
  id: string
  item_id: string
  item_title: string
  price: number
  created_at: string
}

export interface Offer {
  id: string
  item_id: string
  item_title: string
  buyer: UserRef
  amount: number
  message: string | null
  ai_comment: string | null
  status: OfferStatus
  created_at: string
}

export interface PriceBasis {
  feature: string
  value: string | number | null
  effect: string | number | null
}

export interface PriceModelInfo {
  name: string | null
  mae: number | null
  r2: number | null
  trained_rows: number | null
}

export interface PriceEstimate {
  predicted_price: number | null
  low: number | null
  high: number | null
  currency: 'JPY'
  basis: PriceBasis[] | null
  model: PriceModelInfo | null
  available: boolean
}

export interface Cluster {
  id: number
  label: string
  /** 日本語の名前。バックエンドが返さないこともあるので、無ければ label を出す */
  label_ja?: string | null
  count: number
}

export interface CategoriesResponse {
  categories: string[]
  conditions: string[]
}

export interface ClustersResponse {
  clusters: Cluster[]
}

export interface ItemListResponse {
  items: ItemSummary[]
  total: number
}

export interface SimilarItemsResponse {
  cluster_id: number | null
  cluster_label: string | null
  cluster_label_ja?: string | null
  items: ItemSummary[]
}

export interface LikeResponse {
  like_count: number
  liked: boolean
}

export interface DescribeResponse {
  description: string
  source: AiSource
}

export interface NegotiateResponse {
  acceptance: Acceptance
  reply: string
  seller_tip: string
  predicted_price: number | null
  source: AiSource
}

// ---- 入力 ----

export interface ItemListQuery {
  q?: string
  category?: string
  cluster?: number
  status?: ItemStatus
  limit?: number
  offset?: number
}

export interface CreateItemInput {
  title: string
  description: string
  category: string
  condition: string
  price: number
  brand?: string
  image_url?: string
}

export interface DescribeInput {
  title: string
  category: string
  condition: string
  brand?: string
}

export interface PriceInput {
  title: string
  category: string
  condition: string
  brand?: string
}

export interface CreateOfferInput {
  amount: number
  message?: string
}
