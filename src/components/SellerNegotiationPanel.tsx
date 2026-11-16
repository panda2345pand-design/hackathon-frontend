import { Accordion, Badge, Button, Group, NumberInput, Paper, Skeleton, Stack, Text, Title } from '@mantine/core'
import { IconLock, IconPencil } from '@tabler/icons-react'
import { type FormEvent, useState } from 'react'
import { listNegotiations, updateMinPrice } from '../api'
import { notifyError, notifySuccess } from '../lib/errors'
import { formatDate, formatPrice, parseYen } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { ItemDetail } from '../types'
import { AiSourceBadge } from './AiSourceBadge'
import { NegotiationTranscript } from './NegotiationTranscript'

interface SellerNegotiationPanelProps {
  item: ItemDetail
  /** 最低価格を変えたあと、サーバーが返した商品で画面を置きかえる */
  onItemChanged: (item: ItemDetail) => void
}

/** 最低価格の表示と変更。最低価格は出品者本人にだけサーバーが返す(買い手の応答では必ず null) */
function MinPriceEditor({ item, onItemChanged }: SellerNegotiationPanelProps) {
  const current = item.min_price ?? null
  const canEdit = item.status === 'on_sale'
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState<number | string>(current ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async (minPrice: number | null) => {
    setSaving(true)
    try {
      onItemChanged(await updateMinPrice(item.id, minPrice))
      notifySuccess(
        minPrice === null
          ? 'AI 交渉をやめました'
          : `最低価格を ${formatPrice(minPrice)} にしました。買い手の AI との交渉を、あなたの AI が代わりに行います`,
      )
      setEditing(false)
    } catch (e) {
      notifyError(e, '最低価格を保存できませんでした')
    } finally {
      setSaving(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = parseYen(input)
    if (value === null) {
      setError('最低価格を 1 円以上の整数で入れてください')
      return
    }
    if (value > item.price) {
      setError(`最低価格は、出品価格(${formatPrice(item.price)})以下にしてください`)
      return
    }
    setError(null)
    void save(value)
  }

  return (
    <Paper withBorder p="md">
      {!editing ? (
        <Group justify="space-between" gap="sm">
          <div>
            <Text size="xs" c="dimmed">
              AI 交渉の最低価格
            </Text>
            <Text className="price" fw={600} size="xl" lh={1.2}>
              {current !== null ? formatPrice(current) : '未設定'}
            </Text>
          </div>
          {canEdit && (
            <Button
              variant="light"
              size="sm"
              leftSection={<IconPencil size={16} aria-hidden />}
              onClick={() => {
                setInput(current ?? '')
                setError(null)
                setEditing(true)
              }}
            >
              {current !== null ? '最低価格を変える' : '最低価格を設定する'}
            </Button>
          )}
        </Group>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack gap="sm">
            <NumberInput
              label="AI 交渉の最低価格(円)"
              description={`出品価格 ${formatPrice(item.price)} 以下で入れてください`}
              value={input}
              onChange={setInput}
              error={error}
              min={1}
              allowDecimal={false}
              allowNegative={false}
              thousandSeparator=","
              prefix="¥"
              inputMode="numeric"
              maw={260}
              autoFocus
            />
            <Group gap="xs">
              <Button type="submit" size="sm" loading={saving}>
                保存する
              </Button>
              <Button variant="default" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                キャンセル
              </Button>
              {current !== null && (
                <Button variant="subtle" color="red" size="sm" onClick={() => save(null)} disabled={saving}>
                  AI 交渉をやめる
                </Button>
              )}
            </Group>
          </Stack>
        </form>
      )}
      <Group gap={6} mt="sm" wrap="nowrap" align="flex-start" c="dimmed">
        <IconLock size={14} style={{ flexShrink: 0, marginTop: 3 }} aria-hidden />
        <Text size="xs">
          {current !== null
            ? 'この金額は買い手には見えません。これより安くは、あなたの AI が合意しません。'
            : '設定すると、買い手の AI との交渉をあなたの AI が代わりに行います。この金額は買い手には見えません。'}
        </Text>
      </Group>
    </Paper>
  )
}

/** 出品者だけに見える「AI 同士の交渉」: 最低価格の設定と、AI が代わりに交渉した記録 */
export function SellerNegotiationPanel({ item, onItemChanged }: SellerNegotiationPanelProps) {
  const records = useApi(() => listNegotiations(item.id), item.id)
  const list = records.data?.negotiations ?? []

  return (
    <section aria-labelledby="auto-negotiation-heading">
      <Title order={2} size="h4" id="auto-negotiation-heading" mb="sm">
        AI が代わりに交渉した記録
      </Title>

      <Stack gap="sm">
        <MinPriceEditor item={item} onItemChanged={onItemChanged} />

        {records.loading && !records.data && (
          <Stack gap="sm" role="status" aria-label="交渉の記録を読み込んでいます">
            <Skeleton height={76} />
          </Stack>
        )}

        {records.error !== null && (
          <Paper withBorder p="md">
            <Group justify="space-between" gap="sm">
              <Text size="sm" c="dimmed">
                交渉の記録を読み込めませんでした。
              </Text>
              <Button variant="light" size="xs" onClick={records.reload}>
                もう一度読み込む
              </Button>
            </Group>
          </Paper>
        )}

        {records.data && list.length === 0 && (
          <Paper withBorder p="md">
            <Text size="sm" c="dimmed">
              まだ AI 同士の交渉はありません。
            </Text>
          </Paper>
        )}

        {list.map((record) => {
          const agreed = record.outcome === 'agreed'
          return (
            <Paper key={record.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text className="price" fw={600} size="xl" lh={1.2}>
                    {agreed ? formatPrice(record.agreed_price) : '—'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {record.buyer?.name ? `${record.buyer.name} さん・` : ''}
                    {formatDate(record.created_at)}
                  </Text>
                </div>
                <Badge color={agreed ? 'nego' : 'gray'} variant="light">
                  {agreed ? '合意' : '不成立'}
                </Badge>
              </Group>

              <Accordion variant="default" chevronPosition="left" mt="xs" styles={{ content: { paddingInline: 0 } }}>
                <Accordion.Item value="transcript" style={{ borderBottom: 0 }}>
                  <Accordion.Control px={0}>
                    <Text size="sm" fw={600}>
                      やりとりを見る({record.rounds.length} 往復)
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <NegotiationTranscript rounds={record.rounds} viewer="seller" />
                      <Text size="xs" c="dimmed">
                        {record.rule}
                      </Text>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">
                          せりふ:
                        </Text>
                        <AiSourceBadge source={record.source} />
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Paper>
          )
        })}
      </Stack>
    </section>
  )
}
