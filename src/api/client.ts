import { API_URL } from '../config'

/** API が返したエラー。message は画面にそのまま出せる日本語 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider = () => Promise.resolve(null)

/** 認証トークンの取り出し方を登録する(認証モードごとに src/auth から呼ぶ) */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

type QueryValue = string | number | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  /** ファイルを送るとき(multipart/form-data)。body とは同時に使わない */
  formData?: FormData
  signal?: AbortSignal
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: 'ログインが必要です',
  403: 'この操作をする権限がありません',
  404: '見つかりませんでした',
  409: 'ほかの操作と重なったため完了できませんでした',
  413: 'ファイルが大きすぎます',
  415: 'この種類のファイルは使えません',
  422: '入力内容を確認してください',
  429: '回数の上限に達しました。時間をおいてお試しください',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`
}

/** エラー応答 `{detail: {code, message}}` を ApiError にする。形が違っても落ちない */
export function toApiError(status: number, payload: unknown): ApiError {
  const fallback = FALLBACK_MESSAGES[status] ?? `サーバーでエラーが起きました(${status})`
  const detail = isRecord(payload) ? payload.detail : undefined

  // FastAPI 標準の入力検証エラー(detail が配列)
  if (Array.isArray(detail)) {
    return new ApiError(status, 'validation', fallback)
  }
  if (isRecord(detail)) {
    const code = typeof detail.code === 'string' ? detail.code : 'error'
    const message = typeof detail.message === 'string' && detail.message ? detail.message : fallback
    return new ApiError(status, code, message)
  }
  if (typeof detail === 'string' && detail) {
    return new ApiError(status, 'error', detail)
  }
  return new ApiError(status, 'error', fallback)
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** JSON API を呼ぶ。失敗はすべて ApiError で投げる */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, formData, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  // FormData のときは Content-Type を書かない(区切り文字 boundary つきの値をブラウザが自分で付けるため)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = await tokenProvider()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(
      0,
      'network',
      'サーバーに接続できませんでした。通信環境を確認して、もう一度お試しください',
    )
  }

  const payload = await readJson(response)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload as T
}
