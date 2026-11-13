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

/** ISO 8601 の日時を「2026/11/14」の形にする。読めないときは空文字 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
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
