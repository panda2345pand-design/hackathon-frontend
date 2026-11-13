import { describe, expect, it } from 'vitest'
import { slugifyName } from '../auth/devAuth'
import { formatDate, formatPrice, parseYen } from './format'

describe('formatPrice', () => {
  it('円記号と 3 桁区切りを付ける', () => {
    expect(formatPrice(0)).toBe('¥0')
    expect(formatPrice(980)).toBe('¥980')
    expect(formatPrice(1200)).toBe('¥1,200')
    expect(formatPrice(1234567)).toBe('¥1,234,567')
  })

  it('小数は四捨五入して整数の円にする', () => {
    expect(formatPrice(1499.5)).toBe('¥1,500')
  })

  it('値が無いときは — を出す(¥0 や NaN と書かない)', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice(undefined)).toBe('—')
    expect(formatPrice(Number.NaN)).toBe('—')
  })
})

describe('parseYen', () => {
  it('正の整数だけを受け付ける', () => {
    expect(parseYen(3000)).toBe(3000)
    expect(parseYen('3,000')).toBe(3000)
    expect(parseYen('')).toBeNull()
    expect(parseYen(0)).toBeNull()
    expect(parseYen(-5)).toBeNull()
    expect(parseYen(12.5)).toBeNull()
    expect(parseYen('abc')).toBeNull()
  })
})

describe('formatDate', () => {
  it('ISO 8601 を 年/月/日 にする', () => {
    expect(formatDate('2026-11-14T12:00:00')).toBe('2026/11/14')
  })

  it('読めない値は空文字にする', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate('not a date')).toBe('')
    expect(formatDate(null)).toBe('')
  })
})

describe('slugifyName(dev ログインの uid)', () => {
  it('半角英数字は小文字にして、空白や記号は - にする', () => {
    expect(slugifyName('  Alice Smith ')).toBe('alice-smith')
    expect(slugifyName('bob_01!')).toBe('bob-01')
  })

  it('日本語の名前でも ASCII だけの uid になり、同じ名前は同じ uid になる', () => {
    const uid = slugifyName('たろう')
    expect(uid).toMatch(/^[a-z0-9-]+$/)
    expect(uid).toBe(slugifyName('たろう'))
    expect(uid).not.toBe(slugifyName('じろう'))
  })

  it('何も残らないときは user にする', () => {
    expect(slugifyName('   ')).toBe('user')
  })
})
