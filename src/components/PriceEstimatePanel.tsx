import { Accordion, Anchor, Badge, Group, List, Paper, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconPlugConnectedX, IconSparkles } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage } from '../lib/errors'
import { formatCount, formatPrice } from '../lib/format'
import { basisValueLabel, localizeQuoted } from '../lib/labels'
import type { PriceBasis, PriceEstimate } from '../types'

interface PriceEstimatePanelProps {
  title?: string
  estimate: PriceEstimate | null
  loading?: boolean
  error?: unknown
  /** 「この価格を使う」などの操作 */
  action?: ReactNode
}

type Direction = 'up' | 'down' | null

/** effect(数値または文字)から、価格を上げる要因か下げる要因かを読む。読めなければ null */
function direction(effect: PriceBasis['effect']): Direction {
  if (typeof effect === 'number') return effect > 0 ? 'up' : effect < 0 ? 'down' : null
  if (typeof effect !== 'string') return null
  const text = effect.trim().toLowerCase()
  if (/^(\+|up|positive|plus|上)/.test(text)) return 'up'
  if (/^(-|−|down|negative|minus|下)/.test(text)) return 'down'
  return null
}

function BasisRow({ basis }: { basis: PriceBasis }) {
  const dir = direction(basis.effect)
  // 理由の文はサーバーが作る。中に出てくるカテゴリ・状態の英語名だけ、表示用の日本語にする
  const effectText = typeof basis.effect === 'string' ? localizeQuoted(basis.effect) : null
  const valueText = basisValueLabel(basis.feature, basis.value)
  return (
    <List.Item>
      <Group gap={8} wrap="wrap">
        <Text size="sm">
          <Text span fw={600}>
            {basis.feature}
          </Text>
          {valueText !== '' && `:${valueText}`}
        </Text>
        {dir === 'up' && (
          <Badge size="sm" variant="light">
            ↑ 価格を上げる要因
          </Badge>
        )}
        {dir === 'down' && (
          <Badge size="sm" variant="light" color="gray">
            ↓ 価格を下げる要因
          </Badge>
        )}
        {dir === null && effectText && (
          <Text size="xs" c="dimmed">
            {effectText}
          </Text>
        )}
      </Group>
    </List.Item>
  )
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder p="md" bg="nego.0" style={{ borderColor: 'var(--mantine-color-nego-2)' }}>
      <Group gap={8} mb="sm" wrap="nowrap">
        <ThemeIcon size="sm" radius="xl" aria-hidden>
          <IconSparkles size={14} />
        </ThemeIcon>
        <Text fw={700} size="sm" component="h3" m={0}>
          {title}
        </Text>
      </Group>
      {children}
    </Paper>
  )
}

/** 回帰モデルによる「適正価格の目安」。数値・理由・精度はすべて API の値をそのまま出す */
export function PriceEstimatePanel({
  title = 'AI の適正価格の目安',
  estimate,
  loading = false,
  error,
  action,
}: PriceEstimatePanelProps) {
  if (loading) {
    return (
      <Frame title={title}>
        <div role="status" aria-label="適正価格を計算しています">
          <Skeleton height={30} width="50%" />
          <Skeleton height={12} mt="sm" width="70%" />
          <Skeleton height={12} mt={8} width="85%" />
        </div>
      </Frame>
    )
  }

  if (error) {
    return (
      <Frame title={title}>
        <Text size="sm" c="red.8" role="alert">
          目安を取得できませんでした:{errorMessage(error)}
        </Text>
      </Frame>
    )
  }

  if (!estimate) return null

  if (!estimate.available || estimate.predicted_price === null) {
    return (
      <Frame title={title}>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Badge color="gray" variant="filled" leftSection={<IconPlugConnectedX size={12} aria-hidden />}>
            未接続
          </Badge>
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            価格予測モデルがまだつながっていないため、目安を出せません。表示されている価格は出品者が決めたものです。
          </Text>
        </Group>
      </Frame>
    )
  }

  const basis = estimate.basis ?? []
  const model = estimate.model

  return (
    <Frame title={title}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-end" gap="sm">
          <div>
            <Text className="price" fw={700} fz={28} lh={1.1} c="nego.9">
              {formatPrice(estimate.predicted_price)}
            </Text>
            {estimate.low !== null && estimate.high !== null && (
              <Text size="sm" c="dimmed" className="price" mt={4}>
                目安の幅 {formatPrice(estimate.low)} 〜 {formatPrice(estimate.high)}
              </Text>
            )}
          </div>
          {action}
        </Group>

        {basis.length > 0 && (
          <div>
            <Text size="xs" fw={700} c="dimmed" mb={4}>
              この目安になった理由
            </Text>
            <List spacing={4} size="sm">
              {basis.map((b, i) => (
                <BasisRow key={`${b.feature}-${i}`} basis={b} />
              ))}
            </List>
          </div>
        )}

        {model && (
          <Accordion variant="default" chevronPosition="left" styles={{ content: { paddingTop: 0 } }}>
            <Accordion.Item value="accuracy" style={{ borderBottom: 0 }}>
              <Accordion.Control px={0}>
                <Text size="sm" fw={600}>
                  このAIの精度
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <List size="sm" spacing={2} listStyleType="none">
                  <List.Item>モデル:{model.name ?? '—'}</List.Item>
                  <List.Item>
                    平均的な誤差(MAE):{model.mae === null ? '—' : `約 ${formatPrice(model.mae)}`}
                  </List.Item>
                  <List.Item>
                    決定係数(R²):{model.r2 === null ? '—' : model.r2.toFixed(2)}(1 に近いほど当たる)
                  </List.Item>
                  <List.Item>学習に使った商品:{formatCount(model.trained_rows)} 件</List.Item>
                </List>
                <Text size="xs" c="dimmed" mt="xs">
                  過去の出品データから学んだ回帰モデルの予測です。あくまで目安で、実際の価値を保証するものではありません。
                  <Anchor component={Link} to="/about-ai" inherit>AI のしくみを見る</Anchor>
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Frame>
  )
}
