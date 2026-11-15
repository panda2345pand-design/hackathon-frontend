import {
  Alert,
  Anchor,
  Button,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconBan, IconLock, IconSparkles } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, aiDescribe, aiDescribeImage, aiPrice, createItem, getCategories } from '../api'
import { AiSourceBadge } from '../components/AiSourceBadge'
import { ImagePicker } from '../components/ImagePicker'
import { PriceEstimatePanel } from '../components/PriceEstimatePanel'
import { notifyError, notifySuccess } from '../lib/errors'
import { formatPrice, parseYen } from '../lib/format'
import { categoryLabel, conditionLabel } from '../lib/labels'
import { useApi } from '../lib/useApi'
import type { AiSource, PriceEstimate, UploadedImage } from '../types'

interface SellFormValues {
  title: string
  category: string
  condition: string
  brand: string
  price: number | string
  /** AI 交渉の最低価格(任意)。空なら AI 交渉なし */
  min_price: number | string
  description: string
}

/** 写真から AI が読み取れる項目(API の項目名と、画面での呼び名) */
const PHOTO_FIELDS = [
  ['title', '商品名'],
  ['category', 'カテゴリ'],
  ['condition', '状態'],
  ['brand', 'ブランド'],
  ['description', '商品の説明'],
] as const
type PhotoField = (typeof PHOTO_FIELDS)[number][0]
type PhotoValues = Record<PhotoField, string>

const PHOTO_LABEL = Object.fromEntries(PHOTO_FIELDS) as Record<PhotoField, string>

/** 「写真から入力する」の結果。何を入れて、何をそのままにしたかを画面に出すために覚えておく */
interface PhotoFill {
  source: AiSource
  /** 空だったので入れた項目 */
  filled: PhotoField[]
  /** すでに入力があったので、入れずに取ってある AI の案(「上書きする」で使う) */
  pending: Partial<PhotoValues>
  /** 入れる前の値(「元に戻す」で使う) */
  before: PhotoValues
}

/** AI に渡すのに必要な項目(商品名・カテゴリ・状態) */
const AI_FIELDS = ['title', 'category', 'condition'] as const

const required = (label: string) => (value: string) => (value.trim() ? null : `${label}を入れてください`)

export function SellPage() {
  const navigate = useNavigate()
  const options = useApi(getCategories)

  const form = useForm<SellFormValues>({
    initialValues: {
      title: '',
      category: '',
      condition: '',
      brand: '',
      price: '',
      min_price: '',
      description: '',
    },
    validate: {
      title: required('商品名'),
      category: (value) => (value ? null : 'カテゴリを選んでください'),
      condition: (value) => (value ? null : '状態を選んでください'),
      price: (value) => (parseYen(value) === null ? '価格を 1 円以上の整数で入れてください' : null),
      min_price: (value, values) => {
        // 空のままなら AI 交渉なし(任意の項目)
        if (value === '') return null
        const minPrice = parseYen(value)
        if (minPrice === null) return '最低価格を 1 円以上の整数で入れてください'
        const price = parseYen(values.price)
        return price !== null && minPrice > price ? '最低価格は、価格以下にしてください' : null
      },
      description: required('商品の説明'),
    },
  })

  const [describing, setDescribing] = useState(false)
  const [describeSource, setDescribeSource] = useState<AiSource | null>(null)
  const [previousDescription, setPreviousDescription] = useState<string | null>(null)
  const [pricing, setPricing] = useState(false)
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null)
  const [photo, setPhoto] = useState<UploadedImage | null>(null)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [photoFill, setPhotoFill] = useState<PhotoFill | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [prohibited, setProhibited] = useState<string | null>(null)
  const prohibitedRef = useRef<HTMLDivElement>(null)

  // 出品禁止の理由が出たら、見える位置まで動かして読み上げ位置も合わせる
  useEffect(() => {
    if (!prohibited) return
    prohibitedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    prohibitedRef.current?.focus({ preventScroll: true })
  }, [prohibited])

  /** AI を呼ぶ前に、商品名・カテゴリ・状態が入っているかを確かめる */
  const aiInput = () => {
    const invalid = AI_FIELDS.map((field) => form.validateField(field).hasError).some(Boolean)
    if (invalid) return null
    const { title, category, condition, brand } = form.getValues()
    return { title: title.trim(), category, condition, brand: brand.trim() || undefined }
  }

  const describe = async () => {
    const input = aiInput()
    if (!input) return
    setDescribing(true)
    try {
      const res = await aiDescribe(input)
      const current = form.getValues().description
      setPreviousDescription(current.trim() ? current : null)
      form.setFieldValue('description', res.description)
      form.clearFieldError('description')
      setDescribeSource(res.source)
    } catch (error) {
      notifyError(error, '説明文を作れませんでした')
    } finally {
      setDescribing(false)
    }
  }

  const undoDescribe = () => {
    if (previousDescription === null) return
    form.setFieldValue('description', previousDescription)
    setPreviousDescription(null)
    setDescribeSource(null)
  }

  const askPrice = async () => {
    const input = aiInput()
    if (!input) return
    setPricing(true)
    try {
      setEstimate(await aiPrice(input))
    } catch (error) {
      notifyError(error, '価格の目安を取得できませんでした')
    } finally {
      setPricing(false)
    }
  }

  const photoValues = (): PhotoValues => {
    const { title, category, condition, brand, description } = form.getValues()
    return { title, category, condition, brand, description }
  }

  /** 写真を AI に見せて、空いている項目だけを埋める。すでに入力がある項目は、聞かずに書きかえない */
  const readPhoto = async () => {
    if (!photo) return
    setReadingPhoto(true)
    try {
      const res = await aiDescribeImage(photo.id)
      const before = photoValues()
      const filled: PhotoField[] = []
      const pending: Partial<PhotoValues> = {}
      for (const [field] of PHOTO_FIELDS) {
        const suggestion = res[field]?.trim()
        if (!suggestion) continue
        // カテゴリと状態は、選択肢にある値だけを使う(無い値を入れると選択欄が空に見えるため)
        if (field === 'category' && !options.data?.categories.includes(suggestion)) continue
        if (field === 'condition' && !options.data?.conditions.includes(suggestion)) continue
        if (!before[field].trim()) {
          form.setFieldValue(field, suggestion)
          form.clearFieldError(field)
          filled.push(field)
        } else if (before[field].trim() !== suggestion) {
          pending[field] = suggestion
        }
      }
      setPhotoFill({ source: res.source, filled, pending, before })
    } catch (error) {
      notifyError(error, '写真を読み取れませんでした')
    } finally {
      setReadingPhoto(false)
    }
  }

  /** そのままにしていた項目も、AI の案で書きかえる */
  const overwriteFromPhoto = () => {
    if (!photoFill) return
    const fields = PHOTO_FIELDS.map(([field]) => field).filter((field) => photoFill.pending[field] !== undefined)
    for (const field of fields) {
      form.setFieldValue(field, photoFill.pending[field] ?? '')
      form.clearFieldError(field)
    }
    setPhotoFill({ ...photoFill, filled: [...photoFill.filled, ...fields], pending: {} })
  }

  const undoPhotoFill = () => {
    if (!photoFill) return
    for (const [field] of PHOTO_FIELDS) form.setFieldValue(field, photoFill.before[field])
    setPhotoFill(null)
  }

  const changePhoto = (next: UploadedImage | null) => {
    setPhoto(next)
    // 別の写真になったら、前の写真の読み取り結果の表示は消す(入力した内容は残す)
    setPhotoFill(null)
  }

  const submit = async (values: SellFormValues) => {
    const price = parseYen(values.price)
    if (price === null) return
    setSubmitting(true)
    setProhibited(null)
    try {
      const created = await createItem({
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        condition: values.condition,
        price,
        brand: values.brand.trim() || undefined,
        image_url: photo?.url,
        // 空なら送らない(= AI 交渉なし)
        min_price: parseYen(values.min_price) ?? undefined,
      })
      notifySuccess('商品を出品しました', '出品完了')
      navigate(`/items/${created.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'prohibited') {
        // 出品禁止: 理由を大きく出し、入力内容はそのまま残す
        setProhibited(error.message)
      } else if (error instanceof ApiError && error.code === 'invalid_min_price') {
        form.setFieldError('min_price', error.message)
      } else {
        notifyError(error, '出品できませんでした')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const predicted = estimate?.available ? estimate.predicted_price : null
  // 最低価格の案: AI の目安の幅の下の端。ただし価格より高くはしない(最低価格は価格以下という決まりのため)
  const typedPrice = parseYen(form.values.price)
  const estimateLow = estimate?.available ? estimate.low : null
  const minPriceSuggestion =
    estimateLow !== null && estimateLow >= 1 ? Math.round(Math.min(estimateLow, typedPrice ?? estimateLow)) : null
  const pendingLabels = photoFill
    ? PHOTO_FIELDS.filter(([field]) => photoFill.pending[field] !== undefined).map(([, label]) => label)
    : []
  // value は API に送る英語のまま、見える文字(label)だけ日本語にする
  const selectData = (placeholder: string, values: string[] | undefined, toLabel: (value: string) => string) => [
    { value: '', label: placeholder, disabled: true },
    ...(values ?? []).map((v) => ({ value: v, label: toLabel(v) })),
  ]

  return (
    <Stack gap="lg" maw={720} mx="auto">
      <div>
        <Title order={1} size="h2">
          出品する
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          写真を選ぶと AI が内容を読み取ります。商品名・カテゴリ・状態を入れると、説明文と価格の目安も手伝います。
        </Text>
      </div>

      {prohibited && (
        <Alert
          ref={prohibitedRef}
          tabIndex={-1}
          color="red"
          variant="filled"
          role="alert"
          icon={<IconBan size={22} aria-hidden />}
          title="この商品は出品できません"
          withCloseButton
          closeButtonLabel="閉じる"
          onClose={() => setProhibited(null)}
        >
          <Text size="md" fw={600} c="white">
            {prohibited}
          </Text>
          <Text size="sm" c="white" mt={4}>
            入力した内容はそのまま残っています。内容を直すと、もう一度出品できます。
          </Text>
        </Alert>
      )}

      {options.error !== null && (
        <Alert color="red" variant="light" role="alert" title="カテゴリを読み込めませんでした">
          <Button variant="white" size="xs" mt={4} onClick={options.reload}>
            もう一度読み込む
          </Button>
        </Alert>
      )}

      <Paper withBorder p={{ base: 'md', sm: 'xl' }}>
        <form onSubmit={form.onSubmit(submit)} noValidate aria-label="出品フォーム">
          <Stack gap="md">
            <div>
              <ImagePicker image={photo} onChange={changePhoto}>
                <Button
                  variant="light"
                  size="xs"
                  onClick={readPhoto}
                  loading={readingPhoto}
                  leftSection={<IconSparkles size={14} aria-hidden />}
                >
                  写真から入力する
                </Button>
              </ImagePicker>
              {photoFill && (
                <Alert variant="light" color={photoFill.source === 'gemini' ? undefined : 'gray'} mt="xs" role="status" p="sm">
                  <Stack gap={6}>
                    <Group gap="xs">
                      <AiSourceBadge source={photoFill.source} />
                    </Group>
                    {photoFill.source === 'fallback' ? (
                      <Text size="sm">
                        AI につながっていないため、写真からは入力できませんでした。入力欄は何も変えていません。
                      </Text>
                    ) : photoFill.filled.length > 0 ? (
                      <Text size="sm">
                        写真から「{photoFill.filled.map((field) => PHOTO_LABEL[field]).join('・')}
                        」を入力しました。実物と違うところは直してください。
                      </Text>
                    ) : (
                      pendingLabels.length === 0 && <Text size="sm">写真からは、新しく入力できる内容が見つかりませんでした。</Text>
                    )}
                    {pendingLabels.length > 0 && (
                      <Text size="sm">
                        「{pendingLabels.join('・')}」は、すでに入力があるのでそのままにしています。
                      </Text>
                    )}
                    {(pendingLabels.length > 0 || photoFill.filled.length > 0) && (
                      <Group gap="xs">
                        {pendingLabels.length > 0 && (
                          <Button variant="default" size="xs" onClick={overwriteFromPhoto}>
                            AI の案で上書きする
                          </Button>
                        )}
                        {photoFill.filled.length > 0 && (
                          <Button variant="subtle" color="gray" size="xs" onClick={undoPhotoFill}>
                            入力を元に戻す
                          </Button>
                        )}
                      </Group>
                    )}
                  </Stack>
                </Alert>
              )}
            </div>

            <TextInput
              label="商品名"
              placeholder="例: ワイヤレスイヤホン ブラック"
              maxLength={80}
              required
              {...form.getInputProps('title')}
            />

            <Group grow align="flex-start" gap="md" preventGrowOverflow={false} wrap="wrap">
              <NativeSelect
                label="カテゴリ"
                required
                disabled={options.loading}
                data={selectData(options.loading ? '読み込み中…' : '選んでください', options.data?.categories, categoryLabel)}
                style={{ minWidth: 200 }}
                {...form.getInputProps('category')}
              />
              <NativeSelect
                label="状態"
                required
                disabled={options.loading}
                data={selectData(options.loading ? '読み込み中…' : '選んでください', options.data?.conditions, conditionLabel)}
                style={{ minWidth: 200 }}
                {...form.getInputProps('condition')}
              />
            </Group>

            <TextInput label="ブランド(任意)" placeholder="例: Sony" maxLength={60} {...form.getInputProps('brand')} />

            <div>
              <Textarea
                label="商品の説明"
                placeholder="色・サイズ・使った期間・傷の有無など"
                autosize
                minRows={5}
                maxRows={14}
                required
                {...form.getInputProps('description')}
              />
              <Group gap="xs" mt="xs">
                <Button
                  variant="light"
                  size="xs"
                  onClick={describe}
                  loading={describing}
                  leftSection={<IconSparkles size={14} aria-hidden />}
                >
                  AI で説明文を書く
                </Button>
                {describeSource && <AiSourceBadge source={describeSource} />}
                {previousDescription !== null && (
                  <Button variant="subtle" color="gray" size="xs" onClick={undoDescribe}>
                    元の文に戻す
                  </Button>
                )}
              </Group>
            </div>

            <div>
              <Group align="flex-end" gap="sm">
                <NumberInput
                  label="価格(円)"
                  placeholder="例: 3000"
                  min={1}
                  allowDecimal={false}
                  allowNegative={false}
                  thousandSeparator=","
                  prefix="¥"
                  inputMode="numeric"
                  required
                  style={{ flex: '1 1 180px', maxWidth: 260 }}
                  {...form.getInputProps('price')}
                />
                <Button
                  variant="light"
                  onClick={askPrice}
                  loading={pricing}
                  leftSection={<IconSparkles size={16} aria-hidden />}
                >
                  AI に価格を聞く
                </Button>
              </Group>
              {(estimate || pricing) && (
                <Stack mt="sm">
                  <PriceEstimatePanel
                    title="AI の価格の目安"
                    estimate={estimate}
                    loading={pricing}
                    action={
                      predicted !== null && (
                        <Button
                          size="sm"
                          onClick={() => {
                            form.setFieldValue('price', predicted)
                            form.clearFieldError('price')
                          }}
                        >
                          この価格を使う
                        </Button>
                      )
                    }
                  />
                </Stack>
              )}
            </div>

            <div>
              <NumberInput
                label="AI 交渉の最低価格(円)"
                description="設定すると、買い手の AI との交渉をあなたの AI が代わりに行います。この金額は買い手には見えません"
                placeholder="空のままなら AI 交渉なし"
                leftSection={<IconLock size={16} aria-hidden />}
                min={1}
                allowDecimal={false}
                allowNegative={false}
                thousandSeparator=","
                prefix="¥"
                inputMode="numeric"
                maw={260}
                {...form.getInputProps('min_price')}
              />
              {minPriceSuggestion !== null && (
                <Text size="xs" c="dimmed" mt={6}>
                  迷ったら:
                  <Anchor
                    component="button"
                    type="button"
                    inherit
                    onClick={() => {
                      form.setFieldValue('min_price', minPriceSuggestion)
                      form.clearFieldError('min_price')
                    }}
                  >
                    AI の目安の下限 {formatPrice(minPriceSuggestion)} を入れる
                  </Anchor>
                </Text>
              )}
            </div>

            <Group justify="flex-end" mt="sm">
              <Button type="submit" size="md" loading={submitting}>
                出品する
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
