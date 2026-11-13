import {
  Alert,
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
import { IconBan, IconSparkles } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, aiDescribe, aiPrice, createItem, getCategories } from '../api'
import { AiSourceBadge } from '../components/AiSourceBadge'
import { PriceEstimatePanel } from '../components/PriceEstimatePanel'
import { notifyError, notifySuccess } from '../lib/errors'
import { parseYen } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { AiSource, PriceEstimate } from '../types'

interface SellFormValues {
  title: string
  category: string
  condition: string
  brand: string
  price: number | string
  image_url: string
  description: string
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
      image_url: '',
      description: '',
    },
    validate: {
      title: required('商品名'),
      category: (value) => (value ? null : 'カテゴリを選んでください'),
      condition: (value) => (value ? null : '状態を選んでください'),
      price: (value) => (parseYen(value) === null ? '価格を 1 円以上の整数で入れてください' : null),
      image_url: (value) =>
        !value.trim() || /^https?:\/\/\S+$/.test(value.trim()) ? null : 'http(s):// で始まる URL を入れてください',
      description: required('商品の説明'),
    },
  })

  const [describing, setDescribing] = useState(false)
  const [describeSource, setDescribeSource] = useState<AiSource | null>(null)
  const [previousDescription, setPreviousDescription] = useState<string | null>(null)
  const [pricing, setPricing] = useState(false)
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null)
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
        image_url: values.image_url.trim() || undefined,
      })
      notifySuccess('商品を出品しました', '出品完了')
      navigate(`/items/${created.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'prohibited') {
        // 出品禁止: 理由を大きく出し、入力内容はそのまま残す
        setProhibited(error.message)
      } else {
        notifyError(error, '出品できませんでした')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const predicted = estimate?.available ? estimate.predicted_price : null
  const selectData = (placeholder: string, values: string[] | undefined) => [
    { value: '', label: placeholder, disabled: true },
    ...(values ?? []).map((v) => ({ value: v, label: v })),
  ]

  return (
    <Stack gap="lg" maw={720} mx="auto">
      <div>
        <Title order={1} size="h2">
          出品する
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          商品名・カテゴリ・状態を入れると、AI が説明文と価格の目安を手伝います。
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
                data={selectData(options.loading ? '読み込み中…' : '選んでください', options.data?.categories)}
                style={{ minWidth: 200 }}
                {...form.getInputProps('category')}
              />
              <NativeSelect
                label="状態"
                required
                disabled={options.loading}
                data={selectData(options.loading ? '読み込み中…' : '選んでください', options.data?.conditions)}
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

            <TextInput
              label="画像の URL(任意)"
              description="空のままなら、カテゴリのアイコンが表示されます"
              placeholder="https://…"
              type="url"
              inputMode="url"
              {...form.getInputProps('image_url')}
            />

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
