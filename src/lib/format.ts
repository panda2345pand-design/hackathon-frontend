import type { Acceptance, OfferStatus } from '../types'

const yen = new Intl.NumberFormat('ja-JP')

/** 円の金額を「¥1,200」の形にする。値が無いときは「—」 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  return `¥${yen.format(Math.round(amount))}`
}

/** 件数などの整数を桁区切りにする */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return yen.format(value)
}

const tokyoDate = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })

/**
 * サーバーの日時の文字列を Date にする。読めなければ null。
 * サーバーは UTC の時刻をタイムゾーンの印なしで返す。印がない文字列をそのまま Date に渡すと「この端末の時刻」と解釈されて
 * 9 時間ずれ、日本の朝 9 時より前の出品が前の日付で表示された(2026-11-15 に本番で確認)。印がなければ UTC として読む。
 */
function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(iso)
  const date = new Date(hasZone || !iso.includes('T') ? iso : `${iso}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 「2026/11/14」の形(日本時間)。読めないときは空文字 */
export function formatDate(iso: string | null | undefined): string {
  const date = parseServerDate(iso)
  return date ? tokyoDate.format(date) : ''
}

/**
 * 「5分前」「3時間前」のような、今からどれくらい前か(お知らせ用)。7 日より前は日付にする。
 * now はテストで時刻を固定するための引数。
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  const date = parseServerDate(iso)
  if (!date) return ''
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  // サーバーと端末の時計が少しずれて「未来」になっても「たった今」にする
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}日前`
  return tokyoDate.format(date)
}

/** 入力欄の値を正の整数(円)にする。正の整数でなければ null */
export function parseYen(value: number | string): number | null {
  const n = typeof value === 'number' ? value : Number(value.replaceAll(',', '').trim() || NaN)
  return Number.isInteger(n) && n > 0 ? n : null
}

export const OFFER_STATUS_LABEL: Record<OfferStatus, { label: string; color: string }> = {
  pending: { label: '返事待ち', color: 'yellow' },
  accepted: { label: '承諾', color: 'nego' },
  rejected: { label: '見送り', color: 'gray' },
}

export const ACCEPTANCE_LABEL: Record<Acceptance, { label: string; color: string }> = {
  high: { label: '通りやすい', color: 'nego' },
  mid: { label: '五分五分', color: 'yellow' },
  low: { label: '通りにくい', color: 'red' },
}
