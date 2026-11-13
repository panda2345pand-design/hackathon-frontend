import type {
  CategoriesResponse,
  ClustersResponse,
  CreateItemInput,
  CreateOfferInput,
  DescribeInput,
  DescribeResponse,
  ItemDetail,
  ItemListQuery,
  ItemListResponse,
  ItemSummary,
  LikeResponse,
  NegotiateResponse,
  Offer,
  Order,
  PriceEstimate,
  PriceInput,
  SimilarItemsResponse,
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
