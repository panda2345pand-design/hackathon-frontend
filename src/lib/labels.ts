// 画面に出すときだけ使う日本語の名前。
// 商品データは米国メルカリ由来なので、カテゴリと状態は英語のまま DB に入っている。
// API に送る値・URL の絞り込み条件は英語のまま変えない(モデルも英語の値で学習しているため)。
// 訳はバックエンドの app/ml/predictor.py の CATEGORY_LABELS_JA / CONDITION_LABELS_JA とそろえている。

const CATEGORY_LABELS: Record<string, string> = {
  Women: 'レディース',
  'Toys & Collectibles': 'おもちゃ・コレクション',
  Men: 'メンズ',
  Kids: 'キッズ',
  Electronics: '家電・ゲーム',
  Home: 'ホーム・インテリア',
  Beauty: 'コスメ・美容',
  'Vintage & collectibles': 'ヴィンテージ・収集品',
  Other: 'その他',
  Books: '本',
  'Sports & outdoors': 'スポーツ・アウトドア',
  Handmade: 'ハンドメイド',
  'Arts & Crafts': 'アート・クラフト',
  'Garden & Outdoor': 'ガーデン・屋外',
  Office: 'オフィス用品',
  'Pet Supplies': 'ペット用品',
  Tools: '工具',
}

const CONDITION_LABELS: Record<string, string> = {
  New: '新品',
  'Like new': '未使用に近い',
  Good: '良い',
  Fair: 'やや傷あり',
  Poor: '悪い',
}

/** 大文字・小文字や前後の空白の違い("Sports & Outdoors" など)では外れないように、小文字にして引く */
function toLookup(labels: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(labels).map(([key, label]) => [key.toLowerCase(), label]))
}

const CATEGORY_LOOKUP = toLookup(CATEGORY_LABELS)
const CONDITION_LOOKUP = toLookup(CONDITION_LABELS)

function lookup(table: Map<string, string>, value: string | null | undefined): string {
  if (!value) return ''
  // 知らない値(ユーザーが足したカテゴリなど)は、元の文字のまま出す
  return table.get(value.trim().toLowerCase()) ?? value
}

/** カテゴリの表示名("Women" → "レディース")。知らない値はそのまま返す */
export function categoryLabel(category: string | null | undefined): string {
  return lookup(CATEGORY_LOOKUP, category)
}

/** 商品の状態の表示名("Like new" → "未使用に近い")。知らない値はそのまま返す */
export function conditionLabel(condition: string | null | undefined): string {
  return lookup(CONDITION_LOOKUP, condition)
}

/** AI ジャンルの表示名。日本語の名前(label_ja)があればそれを、無ければ元の名前を出す */
export function clusterLabel(label: string, labelJa?: string | null): string {
  return labelJa?.trim() ? labelJa : label
}

/** 価格の目安の「理由」の値。項目がカテゴリ・状態のときだけ日本語にする(ブランドや商品名は訳さない) */
export function basisValueLabel(feature: string, value: string | number | null): string {
  if (value === null) return ''
  if (typeof value === 'number') return String(value)
  if (/カテゴリ|category/i.test(feature)) return categoryLabel(value)
  if (/状態|condition/i.test(feature)) return conditionLabel(value)
  return value
}

/**
 * 説明文の中の「New」のような、かぎかっこで囲まれたカテゴリ・状態だけを日本語にする。
 * 「cord」のような商品名の語は表に無いので、そのまま残る。
 */
export function localizeQuoted(text: string): string {
  return text.replace(/「([^「」]+)」/g, (whole, inner: string) => {
    const key = inner.trim().toLowerCase()
    const label = CONDITION_LOOKUP.get(key) ?? CATEGORY_LOOKUP.get(key)
    return label ? `「${label}」` : whole
  })
}
