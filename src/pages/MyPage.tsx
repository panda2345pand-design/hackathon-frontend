import { Badge, Button, Group, Paper, Skeleton, Stack, Tabs, Text, Title } from '@mantine/core'
import { IconMessageDollar, IconShoppingBag, IconTag } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listMyItems, listMyOffers, listMyOrders } from '../api'
import { useAuth } from '../auth/context'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { ItemGrid, ItemGridSkeleton } from '../components/ItemGrid'
import { OFFER_STATUS_LABEL, formatDate, formatPrice } from '../lib/format'
import { type ApiState, useApi } from '../lib/useApi'

const TABS = ['items', 'orders', 'offers'] as const
type TabKey = (typeof TABS)[number]

function RowsSkeleton() {
  return (
    <Stack gap="sm" role="status" aria-label="読み込んでいます">
      <Skeleton height={72} />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </Stack>
  )
}

/** 読み込み中・失敗・0 件・一覧 を同じ流れで出す */
function Loaded<T>({
  state,
  skeleton,
  children,
}: {
  state: ApiState<T>
  skeleton: ReactNode
  children: (data: T) => ReactNode
}) {
  if (state.data) return children(state.data)
  if (state.loading) return skeleton
  return <ErrorState error={state.error} onRetry={state.reload} />
}

function MyItems() {
  const state = useApi(listMyItems)
  return (
    <Loaded state={state} skeleton={<ItemGridSkeleton count={5} />}>
      {({ items }) =>
        items.length === 0 ? (
          <EmptyState
            icon={IconTag}
            title="まだ出品していません"
            description="AI が説明文と価格の目安を手伝うので、数分で出品できます。"
            action={
              <Button component={Link} to="/sell">
                出品する
              </Button>
            }
          />
        ) : (
          <ItemGrid items={items} />
        )
      }
    </Loaded>
  )
}

function MyOrders() {
  const state = useApi(listMyOrders)
  return (
    <Loaded state={state} skeleton={<RowsSkeleton />}>
      {({ orders }) =>
        orders.length === 0 ? (
          <EmptyState
            icon={IconShoppingBag}
            title="まだ購入した商品はありません"
            action={
              <Button component={Link} to="/" variant="light">
                商品をさがす
              </Button>
            }
          />
        ) : (
          <Stack gap="sm">
            {orders.map((order) => (
              <Paper key={order.id} withBorder p="md">
                <Group justify="space-between" gap="sm" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text component={Link} to={`/items/${order.item_id}`} fw={600} lineClamp={1} c="inherit">
                      {order.item_title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      購入日:{formatDate(order.created_at)}
                    </Text>
                  </div>
                  <Text className="price" fw={700} size="lg" style={{ flexShrink: 0 }}>
                    {formatPrice(order.price)}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )
      }
    </Loaded>
  )
}

function MyOffers() {
  const state = useApi(listMyOffers)
  return (
    <Loaded state={state} skeleton={<RowsSkeleton />}>
      {({ offers }) =>
        offers.length === 0 ? (
          <EmptyState
            icon={IconMessageDollar}
            title="まだ価格交渉を出していません"
            description="商品ページの「価格交渉する」から、AI と一緒に金額と文面を考えられます。"
            action={
              <Button component={Link} to="/" variant="light">
                商品をさがす
              </Button>
            }
          />
        ) : (
          <Stack gap="sm">
            {offers.map((offer) => {
              const status = OFFER_STATUS_LABEL[offer.status]
              return (
                <Paper key={offer.id} withBorder p="md">
                  <Group justify="space-between" gap="sm" wrap="nowrap" align="flex-start">
                    <div style={{ minWidth: 0 }}>
                      <Text component={Link} to={`/items/${offer.item_id}`} fw={600} lineClamp={1} c="inherit">
                        {offer.item_title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        提案日:{formatDate(offer.created_at)}
                      </Text>
                    </div>
                    <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                      <Text className="price" fw={700} size="lg" lh={1.2}>
                        {formatPrice(offer.amount)}
                      </Text>
                      <Badge color={status.color} variant="light">
                        {status.label}
                      </Badge>
                    </Stack>
                  </Group>
                  {offer.message && (
                    <Text size="sm" c="dimmed" mt="xs" lineClamp={3} style={{ overflowWrap: 'anywhere' }}>
                      {offer.message}
                    </Text>
                  )}
                  {offer.status === 'accepted' && (
                    <Group justify="flex-end" mt="sm">
                      <Button component={Link} to={`/items/${offer.item_id}`} size="xs">
                        この金額で購入にすすむ
                      </Button>
                    </Group>
                  )}
                </Paper>
              )
            })}
          </Stack>
        )
      }
    </Loaded>
  )
}

export function MyPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = TABS.find((t) => t === raw) ?? 'items'

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} size="h2">
          マイページ
        </Title>
        {user && (
          <Text size="sm" c="dimmed" mt={4}>
            {user.name} さん
          </Text>
        )}
      </div>

      <Tabs
        value={tab}
        onChange={(value) => setParams(value && value !== 'items' ? { tab: value } : {}, { replace: true })}
        keepMounted={false}
      >
        <Tabs.List mb="md">
          <Tabs.Tab value="items">出品した商品</Tabs.Tab>
          <Tabs.Tab value="orders">購入した商品</Tabs.Tab>
          <Tabs.Tab value="offers">出した価格交渉</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="items">
          <MyItems />
        </Tabs.Panel>
        <Tabs.Panel value="orders">
          <MyOrders />
        </Tabs.Panel>
        <Tabs.Panel value="offers">
          <MyOffers />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
