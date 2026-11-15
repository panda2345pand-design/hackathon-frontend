// バックエンドの API 仕様(hackathon-backend/docs/api.md v1 と docs/api-next.md)に合わせた型。
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
  // ↓ あとから足した項目。古い応答には無いことがあるので、無ければ false として扱う
  /** 出品者が最低価格を設定していて、AI 同士の交渉ができる商品か */
  auto_negotiation?: boolean
  /** 見本データ用に AI が作ったイメージ画像か(実物の写真ではない) */
  image_ai_generated?: boolean
}

export interface ItemDetail extends ItemSummary {
  /** AI 交渉の最低価格。出品者本人が読んだときだけ値が入り、ほかの人には必ず null */
  min_price?: number | null
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

// ---- AI 同士の価格交渉 ----

export type NegotiationOutcome = 'agreed' | 'no_deal'

/** 1 往復ぶん。買い手の AI の提示と、売り手の AI の提示 */
export interface NegotiationRound {
  round: number
  buyer_offer: number
  buyer_message: string
  seller_ask: number
  seller_message: string
}

/** AI 同士の交渉の記録。合意するか・いくらかはサーバーの規則が決め、Gemini はせりふだけを書く */
export interface AutoNegotiation {
  id: string
  item_id: string
  outcome: NegotiationOutcome
  /** 不成立なら null */
  agreed_price: number | null
  list_price: number
  /** 買い手の上限。買い手本人への応答にだけ入る(出品者には null) */
  max_price?: number | null
  rounds: NegotiationRound[]
  /** 合意したときに作られる承諾済みの交渉(offers)の id */
  offer_id: string | null
  source: AiSource
  /** 合意の決め方の説明(日本語 1〜2 文) */
  rule: string
  created_at: string
  /** 一覧(GET /items/{id}/negotiations)にだけ付く */
  buyer?: UserRef
}

// ---- 写真 ----

export interface UploadedImage {
  id: string
  url: string
  content_type: string
}

/** 写真から読み取った出品内容。自信がない項目は null。Gemini が使えないときは全部 null で source が fallback */
export interface DescribeImageResponse {
  title: string | null
  category: string | null
  condition: string | null
  brand: string | null
  description: string | null
  source: AiSource
}

// ---- お知らせ ----

export interface AppNotification {
  id: string
  type: string
  message: string
  item_id: string | null
  read: boolean
  created_at: string
}

export interface NotificationsResponse {
  unread_count: number
  notifications: AppNotification[]
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
  /** AI 交渉の最低価格(任意)。1 以上 price 以下 */
  min_price?: number
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
