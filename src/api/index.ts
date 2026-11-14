import type {
  AttentionInput,
  AttentionResponse,
  AutoNegotiation,
  CategoriesResponse,
  ClustersResponse,
  CreateItemInput,
  CreateOfferInput,
  DescribeImageResponse,
  DescribeInput,
  DescribeResponse,
  ItemDetail,
  ItemListQuery,
  ItemListResponse,
  ItemSummary,
  LikeResponse,
  NegotiateResponse,
  NotificationsResponse,
  Offer,
  Order,
  PriceEstimate,
  PriceInput,
  SimilarItemsResponse,
  UploadedImage,
  User,
} from '../types'
import { request } from './client'

export { ApiError, setTokenProvider } from './client'

const item = (id: string) => `/items/${encodeURIComponent(id)}`
const offer = (id: string) => `/offers/${encodeURIComponent(id)}`

// ---- 認証 ----
export const register = (name: string) =>
  request<User>('/auth/register', { method: 'POST', body: { name } })
export const getMe = () => request<User>('/me')

// ---- マスタ ----
export const getCategories = () => request<CategoriesResponse>('/categories')
export const getClusters = () => request<ClustersResponse>('/clusters')

// ---- 商品 ----
export const listItems = (query: ItemListQuery = {}) =>
  request<ItemListResponse>('/items', { query: { ...query } })
export const getItem = (id: string) => request<ItemDetail>(item(id))
export const createItem = (input: CreateItemInput) =>
  request<ItemDetail>('/items', { method: 'POST', body: input })
export const purchaseItem = (id: string) =>
  request<Order>(`${item(id)}/purchase`, { method: 'POST' })
export const getPriceEstimate = (id: string) =>
  request<PriceEstimate>(`${item(id)}/price-estimate`)
export const getSimilarItems = (id: string, limit = 8) =>
  request<SimilarItemsResponse>(`${item(id)}/similar`, { query: { limit } })
export const likeItem = (id: string) =>
  request<LikeResponse>(`${item(id)}/like`, { method: 'POST' })
export const unlikeItem = (id: string) =>
  request<LikeResponse>(`${item(id)}/like`, { method: 'DELETE' })

// ---- 価格交渉 ----
export const createOffer = (itemId: string, input: CreateOfferInput) =>
  request<Offer>(`${item(itemId)}/offers`, { method: 'POST', body: input })
export const listItemOffers = (itemId: string) =>
  request<{ offers: Offer[] }>(`${item(itemId)}/offers`)
export const acceptOffer = (offerId: string) =>
  request<Offer>(`${offer(offerId)}/accept`, { method: 'POST' })
export const rejectOffer = (offerId: string) =>
  request<Offer>(`${offer(offerId)}/reject`, { method: 'POST' })

// ---- AI 同士の価格交渉 ----

/** 最低価格を設定・変更する(null で AI 交渉をやめる)。出品者本人だけ。返り値は商品詳細 */
export const updateMinPrice = (itemId: string, minPrice: number | null) =>
  request<ItemDetail>(`${item(itemId)}/min-price`, { method: 'PATCH', body: { min_price: minPrice } })

/** 買い手の上限を自分の AI に預けて、売り手の AI と交渉させる。結果(全往復のやりとり)が一度に返る */
export const autoNegotiate = (itemId: string, maxPrice: number) =>
  request<AutoNegotiation>(`${item(itemId)}/auto-negotiate`, { method: 'POST', body: { max_price: maxPrice } })

/** 出品者には全員ぶん、それ以外には自分が買い手の記録だけが返る */
export const listNegotiations = (itemId: string) =>
  request<{ negotiations: AutoNegotiation[] }>(`${item(itemId)}/negotiations`)

// ---- 写真 ----

export const uploadImage = (file: Blob, filename = 'photo.jpg') => {
  const formData = new FormData()
  formData.append('file', file, filename)
  return request<UploadedImage>('/images', { method: 'POST', formData })
}

// ---- お知らせ ----

export const getNotifications = (limit = 20) =>
  request<NotificationsResponse>('/me/notifications', { query: { limit } })

export const readAllNotifications = () =>
  request<{ unread_count: number }>('/me/notifications/read-all', { method: 'POST' })

// ---- マイページ ----
export const listMyItems = () => request<{ items: ItemSummary[] }>('/me/items')
export const listMyOrders = () => request<{ orders: Order[] }>('/me/orders')
export const listMyOffers = () => request<{ offers: Offer[] }>('/me/offers')

// ---- AI ----
export const aiDescribe = (input: DescribeInput) =>
  request<DescribeResponse>('/ai/describe', { method: 'POST', body: input })
export const aiPrice = (input: PriceInput) =>
  request<PriceEstimate>('/ai/price', { method: 'POST', body: input })
export const aiNegotiate = (itemId: string, amount: number) =>
  request<NegotiateResponse>('/ai/negotiate', {
    method: 'POST',
    body: { item_id: itemId, amount },
  })

export const aiDescribeImage = (imageId: string) =>
  request<DescribeImageResponse>('/ai/describe-image', { method: 'POST', body: { image_id: imageId } })

export const aiAttention = (input: AttentionInput) =>
  request<AttentionResponse>('/ai/attention', { method: 'POST', body: input })
