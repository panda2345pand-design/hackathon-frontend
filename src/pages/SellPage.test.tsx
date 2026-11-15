import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch, renderPage } from '../test/helpers'
import type { DescribeImageResponse, PriceEstimate } from '../types'
import { SellPage } from './SellPage'

// 写真の縮小は canvas を使うので、テスト環境(jsdom)では動かない。縮小した結果だけを差しかえる
const downscaled: Blob[] = []
vi.mock('../lib/image', () => ({
  downscaleImage: async (file: Blob) => {
    downscaled.push(file)
    return new Blob(['small-jpeg'], { type: 'image/jpeg' })
  },
}))

const CATEGORIES = { categories: ['家電', '本'], conditions: ['新品', '目立った傷なし'] }

function renderSell() {
  return renderPage(
    <Routes>
      <Route path="/sell" element={<SellPage />} />
      <Route path="/items/:id" element={<p>商品ページ</p>} />
    </Routes>,
    '/sell',
  )
}

/** カテゴリの読み込みを待ってから、必須の項目を埋める */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: '家電' })
  await user.type(screen.getByLabelText(/商品名/), '処方薬 まとめ売り')
  await user.selectOptions(screen.getByLabelText(/カテゴリ/), '家電')
  await user.selectOptions(screen.getByLabelText(/状態/), '新品')
}

describe('SellPage', () => {
  it('出品禁止(422 prohibited)のとき、理由を大きく出して入力内容を残す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /items': () =>
        jsonResponse(422, {
          detail: { code: 'prohibited', message: '医薬品は出品できません(禁止されている品目です)' },
        }),
    })
    renderSell()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '飲み残しの薬です')
    await user.type(screen.getByLabelText(/^価格/), '1500')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('この商品は出品できません')).toBeInTheDocument()
    expect(within(alert).getByText('医薬品は出品できません(禁止されている品目です)')).toBeInTheDocument()

    // サーバーには入力どおりに送っている(金額は整数の円)
    expect(calls.find((c) => c.key === 'POST /items')?.body).toEqual({
      title: '処方薬 まとめ売り',
      description: '飲み残しの薬です',
      category: '家電',
      condition: '新品',
      price: 1500,
    })

    // 入力内容は消えていないし、商品ページへも移動していない
    expect(screen.getByLabelText(/商品名/)).toHaveValue('処方薬 まとめ売り')
    expect(screen.getByLabelText(/商品の説明/)).toHaveValue('飲み残しの薬です')
    expect(screen.getByLabelText(/カテゴリ/)).toHaveValue('家電')
    expect(screen.getByLabelText(/状態/)).toHaveValue('新品')
    expect(screen.getByLabelText(/^価格/)).toHaveValue('¥1,500')
    expect(screen.queryByText('商品ページ')).not.toBeInTheDocument()
  })

  it('必須の項目が空なら API を呼ばずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({ 'GET /categories': () => jsonResponse(200, CATEGORIES) })
    renderSell()

    await screen.findByRole('option', { name: '家電' })
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('商品名を入れてください')).toBeInTheDocument()
    expect(screen.getByText('価格を 1 円以上の整数で入れてください')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /items')).toBe(false)
  })

  it('AI の説明文が fallback のときは「AI 未接続(定型文)」と表示する', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/describe': () => jsonResponse(200, { description: '定型の説明文です。', source: 'fallback' }),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI で説明文を書く' }))

    await waitFor(() => expect(screen.getByLabelText(/商品の説明/)).toHaveValue('定型の説明文です。'))
    expect(screen.getByText('AI 未接続(定型文)')).toBeInTheDocument()
    expect(screen.queryByText('Gemini が作成')).not.toBeInTheDocument()
  })

  it('「この価格を使う」でサーバーの予測価格をそのまま価格欄に入れる', async () => {
    const user = userEvent.setup()
    const estimate: PriceEstimate = {
      predicted_price: 4200,
      low: 3500,
      high: 5000,
      currency: 'JPY',
      basis: [{ feature: 'カテゴリ', value: '家電', effect: 'up' }],
      model: { name: 'ridge', mae: 800, r2: 0.61, trained_rows: 12000 },
      available: true,
    }
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/price': () => jsonResponse(200, estimate),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI に価格を聞く' }))

    expect(await screen.findByText('¥4,200')).toBeInTheDocument()
    expect(screen.getByText(/¥3,500 〜 ¥5,000/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'この価格を使う' }))
    expect(screen.getByLabelText(/^価格/)).toHaveValue('¥4,200')
  })

  it('価格モデルが未接続(available=false)なら「未接続」と出し、数字は出さない', async () => {
    const user = userEvent.setup()
    const estimate: PriceEstimate = {
      predicted_price: null,
      low: null,
      high: null,
      currency: 'JPY',
      basis: [],
      model: null,
      available: false,
    }
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/price': () => jsonResponse(200, estimate),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI に価格を聞く' }))

    expect(await screen.findByText('未接続')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この価格を使う' })).not.toBeInTheDocument()
  })
})

const ESTIMATE: PriceEstimate = {
  predicted_price: 4200,
  low: 3500,
  high: 5000,
  currency: 'JPY',
  basis: [],
  model: null,
  available: true,
}

describe('SellPage(AI 交渉の最低価格)', () => {
  it('最低価格を入れると min_price として送る', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /items': () => jsonResponse(201, { id: 'new1' }),
    })
    renderSell()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '説明です')
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.type(screen.getByLabelText(/AI 交渉の最低価格/), '2500')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('商品ページ')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /items')?.body).toMatchObject({ price: 3000, min_price: 2500 })
    expect(screen.queryByText(/買い手には見えません/)).not.toBeInTheDocument()
  })

  it('最低価格が価格より高いと、送らずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({ 'GET /categories': () => jsonResponse(200, CATEGORIES) })
    renderSell()

    expect(await screen.findByText(/この金額は買い手には見えません/)).toBeInTheDocument()
    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '説明です')
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.type(screen.getByLabelText(/AI 交渉の最低価格/), '3500')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('最低価格は、価格以下にしてください')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /items')).toBe(false)
  })

  it('AI の目安が出ていれば、下限をワンクリックで最低価格に入れられる(価格より高くはしない)', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /ai/price': () => jsonResponse(200, ESTIMATE),
    })
    renderSell()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'AI に価格を聞く' }))
    await user.click(await screen.findByRole('button', { name: 'AI の目安の下限 ¥3,500 を入れる' }))
    expect(screen.getByLabelText(/AI 交渉の最低価格/)).toHaveValue('¥3,500')

    // 価格を目安の下限より安くしたら、案も価格までに抑える
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.click(screen.getByRole('button', { name: 'AI の目安の下限 ¥3,000 を入れる' }))
    expect(screen.getByLabelText(/AI 交渉の最低価格/)).toHaveValue('¥3,000')
  })

  it('サーバーが invalid_min_price で断ったら、最低価格の欄にその理由を出す', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /items': () =>
        jsonResponse(422, { detail: { code: 'invalid_min_price', message: '最低価格は 1 円以上、価格以下にしてください' } }),
    })
    renderSell()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '説明です')
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.type(screen.getByLabelText(/AI 交渉の最低価格/), '2500')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('最低価格は 1 円以上、価格以下にしてください')).toBeInTheDocument()
    expect(screen.queryByText('商品ページ')).not.toBeInTheDocument()
  })
})

const PHOTO = new File(['big-photo-bytes'], 'IMG_0001.png', { type: 'image/png' })
const UPLOADED = { id: 'img1', url: 'https://api.example/images/img1', content_type: 'image/jpeg' }
const FROM_PHOTO: DescribeImageResponse = {
  title: 'ナイキ ランニングシューズ',
  category: '家電',
  condition: '目立った傷なし',
  brand: 'Nike',
  description: '写真から読み取った説明です。',
  source: 'gemini',
}

async function choosePhoto(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: '家電' })
  await user.upload(screen.getByLabelText('商品の写真'), PHOTO)
  return screen.findByRole('img', { name: '選んだ写真' })
}

describe('SellPage(写真)', () => {
  beforeEach(() => {
    downscaled.length = 0
  })

  it('写真を選ぶと、小さくしてから POST /images に送り、返ってきた URL を image_url として出品する', async () => {
    const user = userEvent.setup()
    const { calls, fetchMock } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(201, UPLOADED),
      'POST /items': () => jsonResponse(201, { id: 'new1' }),
    })
    renderSell()

    const preview = await choosePhoto(user)
    expect(preview).toHaveAttribute('src', UPLOADED.url)

    // 元のファイルを縮小にかけ、送ったのは縮小したほう(multipart の file)
    expect(downscaled).toEqual([PHOTO])
    const upload = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/images'))
    const body = upload?.[1]?.body
    expect(body).toBeInstanceOf(FormData)
    const sent = (body as FormData).get('file') as File
    expect(sent.type).toBe('image/jpeg')
    expect(sent.size).toBe('small-jpeg'.length)
    // Content-Type は自分で書かない(boundary つきの値をブラウザに付けさせる)
    const headers = (upload?.[1]?.headers ?? {}) as Record<string, string>
    expect(headers['Content-Type']).toBeUndefined()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '説明です')
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    expect(await screen.findByText('商品ページ')).toBeInTheDocument()
    expect(calls.find((c) => c.key === 'POST /items')?.body).toMatchObject({ image_url: UPLOADED.url })
  })

  it('「写真を外す」で写真なしに戻り、image_url を送らない', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(201, UPLOADED),
      'POST /items': () => jsonResponse(201, { id: 'new1' }),
    })
    renderSell()

    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: '写真を外す' }))
    expect(screen.queryByRole('img', { name: '選んだ写真' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /写真を選ぶ/ })).toBeInTheDocument()

    await fillRequired(user)
    await user.type(screen.getByLabelText(/商品の説明/), '説明です')
    await user.type(screen.getByLabelText(/^価格/), '3000')
    await user.click(screen.getByRole('button', { name: '出品する' }))

    await screen.findByText('商品ページ')
    expect(calls.find((c) => c.key === 'POST /items')?.body).not.toHaveProperty('image_url')
  })

  it('サーバーが写真を断ったら(大きすぎる・種類が違う)、理由を出して写真なしのままにする', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(413, { detail: { code: 'image_too_large', message: '画像は 2MB までです' } }),
    })
    renderSell()

    await screen.findByRole('option', { name: '家電' })
    await user.upload(screen.getByLabelText('商品の写真'), PHOTO)

    expect(await screen.findByText('画像は 2MB までです')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '選んだ写真' })).not.toBeInTheDocument()
  })

  it('画像ではないファイルは、送らずに断る', async () => {
    // accept に合わないファイルも渡せるようにする(ドラッグ&ドロップでは accept が効かないため)
    const user = userEvent.setup({ applyAccept: false })
    const { calls } = mockFetch({ 'GET /categories': () => jsonResponse(200, CATEGORIES) })
    renderSell()

    await screen.findByRole('option', { name: '家電' })
    await user.upload(screen.getByLabelText('商品の写真'), new File(['%PDF'], 'memo.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('JPEG・PNG・WebP の画像を選んでください')).toBeInTheDocument()
    expect(calls.some((c) => c.key === 'POST /images')).toBe(false)
  })

  it('「写真から入力する」は空の項目だけを埋め、入力済みの項目は「上書きする」を押すまで変えない。元にも戻せる', async () => {
    const user = userEvent.setup()
    const { calls } = mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(201, UPLOADED),
      'POST /ai/describe-image': () => jsonResponse(200, FROM_PHOTO),
    })
    renderSell()

    await choosePhoto(user)
    // 商品名だけ、先に自分で入れておく
    await user.type(screen.getByLabelText(/商品名/), '自分で書いた名前')
    await user.click(screen.getByRole('button', { name: '写真から入力する' }))

    const status = await screen.findByRole('status')
    expect(calls.find((c) => c.key === 'POST /ai/describe-image')?.body).toEqual({ image_id: 'img1' })
    expect(within(status).getByText('Gemini が作成')).toBeInTheDocument()
    expect(within(status).getByText(/「カテゴリ・状態・ブランド・商品の説明」を入力しました/)).toBeInTheDocument()
    expect(within(status).getByText(/「商品名」は、すでに入力があるのでそのままにしています/)).toBeInTheDocument()

    expect(screen.getByLabelText(/商品名/)).toHaveValue('自分で書いた名前')
    expect(screen.getByLabelText(/カテゴリ/)).toHaveValue('家電')
    expect(screen.getByLabelText(/状態/)).toHaveValue('目立った傷なし')
    expect(screen.getByLabelText(/ブランド/)).toHaveValue('Nike')
    expect(screen.getByLabelText(/商品の説明/)).toHaveValue('写真から読み取った説明です。')

    await user.click(within(status).getByRole('button', { name: 'AI の案で上書きする' }))
    expect(screen.getByLabelText(/商品名/)).toHaveValue('ナイキ ランニングシューズ')
    expect(screen.queryByRole('button', { name: 'AI の案で上書きする' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '入力を元に戻す' }))
    expect(screen.getByLabelText(/商品名/)).toHaveValue('自分で書いた名前')
    expect(screen.getByLabelText(/カテゴリ/)).toHaveValue('')
    expect(screen.getByLabelText(/ブランド/)).toHaveValue('')
    expect(screen.getByLabelText(/商品の説明/)).toHaveValue('')
  })

  it('値が null の項目や、選択肢に無いカテゴリは入れない', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(201, UPLOADED),
      'POST /ai/describe-image': () =>
        jsonResponse(200, { ...FROM_PHOTO, category: 'Unknown Category', condition: null, brand: null }),
    })
    renderSell()

    await choosePhoto(user)
    await user.click(screen.getByRole('button', { name: '写真から入力する' }))

    expect(await screen.findByText(/「商品名・商品の説明」を入力しました/)).toBeInTheDocument()
    expect(screen.getByLabelText(/カテゴリ/)).toHaveValue('')
    expect(screen.getByLabelText(/状態/)).toHaveValue('')
    expect(screen.getByLabelText(/ブランド/)).toHaveValue('')
  })

  it('AI が未接続(fallback)のときは、そう伝えて何も入力しない', async () => {
    const user = userEvent.setup()
    mockFetch({
      'GET /categories': () => jsonResponse(200, CATEGORIES),
      'POST /images': () => jsonResponse(201, UPLOADED),
      'POST /ai/describe-image': () =>
        jsonResponse(200, { title: null, category: null, condition: null, brand: null, description: null, source: 'fallback' }),
    })
    renderSell()

    await choosePhoto(user)
    await user.type(screen.getByLabelText(/商品名/), '自分で書いた名前')
    await user.click(screen.getByRole('button', { name: '写真から入力する' }))

    const status = await screen.findByRole('status')
    expect(within(status).getByText('AI 未接続(定型文)')).toBeInTheDocument()
    expect(within(status).getByText(/AI につながっていないため、写真からは入力できませんでした/)).toBeInTheDocument()
    expect(within(status).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/商品名/)).toHaveValue('自分で書いた名前')
    expect(screen.getByLabelText(/商品の説明/)).toHaveValue('')
  })
})
