import {
  ActionIcon,
  Anchor,
  Button,
  Center,
  Chip,
  Group,
  NativeSelect,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconSearch, IconSparkles, IconX } from '@tabler/icons-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCategories, getClusters, listItems } from '../api'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { ItemGrid, ItemGridSkeleton } from '../components/ItemGrid'
import { OnboardingCard } from '../components/OnboardingCard'
import { PAGE_SIZE } from '../config'
import { notifyError } from '../lib/errors'
import { formatCount } from '../lib/format'
import { categoryLabel, clusterLabel } from '../lib/labels'
import { useApi } from '../lib/useApi'
import type { ItemStatus, ItemSummary } from '../types'

interface ListState {
  /** どの絞り込み条件の結果か */
  key: string | null
  items: ItemSummary[]
  total: number
  error: unknown
}

const INITIAL: ListState = { key: null, items: [], total: 0, error: null }

/** 検索欄。URL の q が(戻る・進むで)変わったら key で作り直して中身を合わせる */
function SearchForm({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(initial)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(text.trim())
  }

  return (
    <form onSubmit={submit} role="search">
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <TextInput
          radius="xl"
          style={{ flex: 1 }}
          aria-label="キーワードで検索"
          placeholder="キーワードで検索"
          leftSection={<IconSearch size={16} aria-hidden />}
          rightSection={
            text ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="検索キーワードを消す"
                onClick={() => {
                  setText('')
                  onSearch('')
                }}
              >
                <IconX size={16} aria-hidden />
              </ActionIcon>
            ) : null
          }
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          enterKeyHint="search"
        />
        {/* 緑の塗りのボタンは 1 画面に 1 つ(ヘッダーの主のボタン)にしたいので、検索は灰色の面のボタンにする */}
        <Button type="submit" variant="default">
          検索
        </Button>
      </Group>
    </form>
  )
}

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const clusterParam = params.get('cluster')
  const cluster = clusterParam !== null && /^\d+$/.test(clusterParam) ? Number(clusterParam) : undefined
  const status: ItemStatus = params.get('status') === 'sold' ? 'sold' : 'on_sale'

  const [list, setList] = useState<ListState>(INITIAL)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const categories = useApi(getCategories)
  const clusters = useApi(getClusters)

  const listKey = JSON.stringify([q, category, cluster ?? null, status, reloadKey])
  const loading = list.key !== listKey

  // 絞り込みが変わったら 1 ページ目から読み直す
  useEffect(() => {
    let cancelled = false
    listItems({ q, category, cluster, status, limit: PAGE_SIZE, offset: 0 }).then(
      (res) => {
        if (!cancelled) setList({ key: listKey, items: res.items, total: res.total, error: null })
      },
      (error: unknown) => {
        if (!cancelled) setList({ key: listKey, items: [], total: 0, error })
      },
    )
    return () => {
      cancelled = true
    }
  }, [q, category, cluster, status, listKey])

  const updateParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await listItems({
        q,
        category,
        cluster,
        status,
        limit: PAGE_SIZE,
        offset: list.items.length,
      })
      setList((prev) => {
        // 待っているあいだに絞り込みが変わっていたら、古い条件の続きは足さない
        if (prev.key !== listKey) return prev
        const known = new Set(prev.items.map((item) => item.id))
        return {
          ...prev,
          items: [...prev.items, ...res.items.filter((item) => !known.has(item.id))],
          total: res.total,
        }
      })
    } catch (error) {
      notifyError(error, '続きを読み込めませんでした')
    } finally {
      setLoadingMore(false)
    }
  }

  const hasFilter = Boolean(q || category || cluster !== undefined)
  const clusterList = clusters.data?.clusters ?? []
  const hasMore = list.items.length < list.total
  // 案内の ① から直接行ける、AI 交渉ができる販売中の商品(無ければ null)
  const negotiableItemId =
    list.items.find((item) => item.auto_negotiation === true && item.status === 'on_sale')?.id ?? null

  return (
    <Stack gap="xl">
      <OnboardingCard negotiableItemId={negotiableItemId} />

      <div>
        <Title order={1} size="h2">
          商品をさがす
        </Title>
        <Text c="dimmed" mt={6} maw={640}>
          AI が出品者と購入者のあいだに立つフリマ。適正価格の目安がつき、価格交渉は AI 同士に任せることもできます。
        </Text>
      </div>

      <Stack gap="md">
        <SearchForm key={q} initial={q} onSearch={(value) => updateParam('q', value)} />

        <Group gap="sm" align="flex-end">
          <NativeSelect
            aria-label="カテゴリ"
            value={category}
            onChange={(e) => updateParam('category', e.currentTarget.value)}
            data={[
              { value: '', label: 'すべてのカテゴリ' },
              // value は API に送る英語のまま、見える文字だけ日本語にする
              ...(categories.data?.categories ?? []).map((c) => ({ value: c, label: categoryLabel(c) })),
            ]}
            disabled={categories.loading}
            style={{ flex: '1 1 180px', maxWidth: 280 }}
          />
          <SegmentedControl
            aria-label="販売状況"
            value={status}
            onChange={(value) => updateParam('status', value === 'sold' ? 'sold' : '')}
            data={[
              { value: 'on_sale', label: '販売中' },
              { value: 'sold', label: '売り切れ' },
            ]}
          />
        </Group>

        <div>
          <Group gap={6} mb="xs">
            <IconSparkles size={16} color="var(--nego-accent)" aria-hidden />
            <Text size="sm" fw={600} id="cluster-label">
              AI ジャンル
            </Text>
            <Text size="xs" c="dimmed">
              AI が似た商品を自動でまとめたグループです(<Anchor component={Link} to="/about-ai" inherit>しくみ</Anchor>)
            </Text>
          </Group>
          {clusters.loading && (
            <Group gap="xs" wrap="nowrap" role="status" aria-label="AI ジャンルを読み込んでいます">
              {[96, 120, 88, 110].map((w) => (
                <Skeleton key={w} height={32} width={w} radius="xl" />
              ))}
            </Group>
          )}
          {!clusters.loading && clusterList.length === 0 && (
            <Text size="sm" c="dimmed">
              {clusters.error !== null
                ? 'AI ジャンルを読み込めませんでした。'
                : 'AI ジャンルはまだ作られていません。'}
            </Text>
          )}
          {clusterList.length > 0 && (
            <ScrollArea type="auto" offsetScrollbars="x" scrollbarSize={6}>
              <Group gap="xs" wrap="nowrap" role="group" aria-labelledby="cluster-label" pb={4}>
                {clusterList.map((c) => (
                  <Chip
                    key={c.id}
                    checked={cluster === c.id}
                    onChange={(checked) => updateParam('cluster', checked ? String(c.id) : '')}
                    variant="outline"
                    size="sm"
                    style={{ flexShrink: 0 }}
                  >
                    {clusterLabel(c.label, c.label_ja)}({formatCount(c.count)})
                  </Chip>
                ))}
              </Group>
            </ScrollArea>
          )}
        </div>
      </Stack>

      <section aria-label="検索結果" id="item-list">
        {loading ? (
          <ItemGridSkeleton />
        ) : list.error !== null ? (
          <ErrorState error={list.error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={IconSearch}
            title={hasFilter ? '条件に合う商品がありません' : 'まだ商品がありません'}
            description={
              hasFilter
                ? 'キーワードを短くするか、カテゴリや AI ジャンルを外してみてください。'
                : '最初の 1 点を出品してみませんか。AI が説明文と価格の目安を手伝います。'
            }
            action={
              hasFilter ? (
                <Button variant="default" onClick={() => setParams({}, { replace: true })}>
                  条件をすべて外す
                </Button>
              ) : (
                <Button component={Link} to="/sell">
                  出品する
                </Button>
              )
            }
          />
        ) : (
          <Stack gap="md">
            <Text size="sm" c="dimmed" aria-live="polite" className="price">
              {formatCount(list.total)} 件中 {formatCount(list.items.length)} 件を表示
            </Text>
            <ItemGrid items={list.items} />
            {hasMore && (
              <Center>
                <Button variant="default" onClick={loadMore} loading={loadingMore}>
                  もっと見る
                </Button>
              </Center>
            )}
          </Stack>
        )}
      </section>
    </Stack>
  )
}
