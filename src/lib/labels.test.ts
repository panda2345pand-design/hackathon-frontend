import { describe, expect, it } from 'vitest'
import { basisValueLabel, categoryLabel, clusterLabel, conditionLabel, localizeQuoted } from './labels'

// 本番の GET /categories が返す値(2026-11-15 時点)
const API_CATEGORIES = [
  'Women',
  'Toys & Collectibles',
  'Men',
  'Kids',
  'Electronics',
  'Home',
  'Beauty',
  'Vintage & collectibles',
  'Other',
  'Books',
  'Sports & outdoors',
  'Handmade',
  'Arts & Crafts',
  'Garden & Outdoor',
  'Office',
  'Pet Supplies',
  'Tools',
]
const API_CONDITIONS = ['New', 'Like new', 'Good', 'Fair', 'Poor']

describe('categoryLabel', () => {
  it('英語のカテゴリを日本語にする', () => {
    expect(categoryLabel('Women')).toBe('レディース')
    expect(categoryLabel('Electronics')).toBe('家電・ゲーム')
    expect(categoryLabel('Vintage & collectibles')).toBe('ヴィンテージ・収集品')
  })

  it('API が返すカテゴリはすべて日本語になる(英語のまま残らない)', () => {
    for (const category of API_CATEGORIES) {
      expect(categoryLabel(category)).not.toMatch(/[A-Za-z]/)
    }
  })

  it('大文字・小文字や前後の空白が違っても引ける', () => {
    expect(categoryLabel('Sports & Outdoors')).toBe('スポーツ・アウトドア')
    expect(categoryLabel(' women ')).toBe('レディース')
  })

  it('知らない値はそのまま返し、空は空文字にする', () => {
    expect(categoryLabel('Musical Instruments')).toBe('Musical Instruments')
    expect(categoryLabel('家電')).toBe('家電')
    expect(categoryLabel('')).toBe('')
    expect(categoryLabel(null)).toBe('')
    expect(categoryLabel(undefined)).toBe('')
  })
})

describe('conditionLabel', () => {
  it('5 つの状態をすべて日本語にする', () => {
    expect(API_CONDITIONS.map(conditionLabel)).toEqual(['新品', '未使用に近い', '良い', 'やや傷あり', '悪い'])
  })

  it('大文字・小文字が違っても引け、知らない値はそのまま返す', () => {
    expect(conditionLabel('Like New')).toBe('未使用に近い')
    expect(conditionLabel('Refurbished')).toBe('Refurbished')
    expect(conditionLabel(null)).toBe('')
  })
})

describe('clusterLabel', () => {
  it('label_ja があればそれを、無い・空なら元の label を出す', () => {
    expect(clusterLabel('Women: pink / secret', 'レディース:ピンク系')).toBe('レディース:ピンク系')
    expect(clusterLabel('Women: pink / secret')).toBe('Women: pink / secret')
    expect(clusterLabel('Women: pink / secret', null)).toBe('Women: pink / secret')
    expect(clusterLabel('Women: pink / secret', '  ')).toBe('Women: pink / secret')
  })
})

describe('basisValueLabel', () => {
  it('カテゴリと状態の値だけ日本語にする', () => {
    expect(basisValueLabel('カテゴリ', 'Garden & Outdoor')).toBe('ガーデン・屋外')
    expect(basisValueLabel('状態', 'Like new')).toBe('未使用に近い')
  })

  it('ブランドや商品名は訳さない', () => {
    // "Home" や "New" という名前のブランドがあっても、カテゴリ・状態として訳さない
    expect(basisValueLabel('ブランド', 'Home')).toBe('Home')
    expect(basisValueLabel('タイトルの語', 'New Balance 574')).toBe('New Balance 574')
  })

  it('数値は文字に、null は空文字にする', () => {
    expect(basisValueLabel('件数', 12)).toBe('12')
    expect(basisValueLabel('カテゴリ', null)).toBe('')
  })
})

describe('localizeQuoted', () => {
  it('かぎかっこの中の状態・カテゴリだけ日本語にする', () => {
    expect(localizeQuoted('同じ商品で状態だけを「New」に変えた場合と比べて、モデル上は約-11%')).toBe(
      '同じ商品で状態だけを「新品」に変えた場合と比べて、モデル上は約-11%',
    )
  })

  it('商品名の語はそのまま残す', () => {
    const text = '価格への影響が大きい語(モデル上): 「cord」約-18%、「hue」約+19%'
    expect(localizeQuoted(text)).toBe(text)
  })
})
