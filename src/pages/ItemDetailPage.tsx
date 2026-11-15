import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconArrowLeft, IconHeart, IconHeartFilled, IconMessageDollar, IconPhotoAi, IconSparkles } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, getItem, getPriceEstimate, getSimilarItems, likeItem, listMyOffers, unlikeItem } from '../api'
import { useAuth } from '../auth/context'
import { AutoNegotiateModal } from '../components/AutoNegotiateModal'
import { EmptyState, ErrorState } from '../components/EmptyState'
import { ItemCard, ItemCardSkeleton } from '../components/ItemCard'
import { ItemImage } from '../components/ItemImage'
import { NegotiateModal } from '../components/NegotiateModal'
import { OffersPanel } from '../components/OffersPanel'
import { PriceEstimatePanel } from '../components/PriceEstimatePanel'
import { PurchaseModal } from '../components/PurchaseModal'
import { SellerNegotiationPanel } from '../components/SellerNegotiationPanel'
import { notifyError, notifySuccess } from '../lib/errors'
import { formatDate, formatPrice } from '../lib/format'
import { categoryLabel, clusterLabel, conditionLabel } from '../lib/labels'
import { useApi } from '../lib/useApi'
import type { Offer, Order } from '../types'

const SIMILAR_CARD_WIDTH = 168

function DetailSkeleton() {
  return (
    <Grid gap="lg" role="status" aria-label="商品を読み込んでいます">
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <Skeleton style={{ aspectRatio: '1 / 1' }} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <Skeleton height={28} width="80%" />
        <Skeleton height={36} width="40%" mt="md" />
        <Skeleton height={120} mt="lg" />
        <Skeleton height={42} mt="lg" />
      </Grid.Col>
    </Grid>
  )
}

function SimilarItems({ itemId }: { itemId: string }) {
  const similar = useApi(() => getSimilarItems(itemId, 8), itemId)
  const items = similar.data?.items ?? []

  return (
    <section aria-labelledby="similar-heading">
      <Group gap={8} mb="sm" align="baseline">
        <Title order={2} size="h4" id="similar-heading">
          似ている商品
        </Title>
        {similar.data?.cluster_label && (
          <Badge variant="light" leftSection={<IconSparkles size={12} aria-hidden />}>
            AI ジャンル:{clusterLabel(similar.data.cluster_label, similar.data.cluster_label_ja)}
          </Badge>
        )}
      </Group>

      {similar.loading && (
        <Group gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }} role="status" aria-label="似ている商品を読み込んでいます">
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} w={SIMILAR_CARD_WIDTH} style={{ flexShrink: 0 }}>
              <ItemCardSkeleton />
            </Box>
          ))}
        </Group>
      )}

      {!similar.loading && items.length === 0 && (
        <Paper withBorder p="md">
          <Text size="sm" c="dimmed">
            {similar.error !== null
              ? '似ている商品を読み込めませんでした。'
              : '同じ AI ジャンルの商品はまだありません。'}
          </Text>
        </Paper>
      )}

      {items.length > 0 && (
        <ScrollArea type="auto" offsetScrollbars="x" scrollbarSize={6}>
          <Group gap="sm" wrap="nowrap" align="stretch" pb="xs">
            {items.map((item) => (
              <Box key={item.id} w={SIMILAR_CARD_WIDTH} style={{ flexShrink: 0 }}>
                <ItemCard item={item} />
              </Box>
            ))}
          </Group>
        </ScrollArea>
      )}
    </section>
  )
}

function ItemDetailView({ id }: { id: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const item = useApi(() => getItem(id), `${id}:${user?.id ?? ''}`)
  const estimate = useApi(() => getPriceEstimate(id), id)

  const [purchaseOpened, purchase] = useDisclosure(false)
  const [negotiateOpened, negotiate] = useDisclosure(false)
  const [autoOpened, auto] = useDisclosure(false)
  const [liking, setLiking] = useState(false)

  const data = item.data
  // AI 同士の交渉ができる商品を、ログイン中の買い手が見ているか。
  // auto_negotiation はあとから足した項目なので、無い(古い応答)ときは false として扱う
  const canAutoNegotiate =
    data !== null &&
    data.auto_negotiation === true &&
    data.status === 'on_sale' &&
    user !== null &&
    user.id !== data.seller.id

  // すでに合意した金額があるか(AI 交渉が合意すると、サーバーが「承諾済みの交渉」を作る)。
  // ページを開き直しても「合意済み」と出せるように、サーバーから読む。読めなくても、ほかの表示は止めない
  const myOffers = useApi(
    () => (canAutoNegotiate ? listMyOffers() : Promise.resolve(null)),
    `${id}:${user?.id ?? ''}:${canAutoNegotiate}`,
  )
  const agreedOffer =
    canAutoNegotiate && myOffers.data
      ? myOffers.data.offers.find((offer) => offer.item_id === id && offer.status === 'accepted')
      : undefined

  if (!data) {
    if (item.loading) return <DetailSkeleton />
    if (item.error instanceof ApiError && item.error.status === 404) {
      return (
        <EmptyState
          title="商品が見つかりません"
          description="削除されたか、URL が間違っている可能性があります。"
          action={
            <Button component={Link} to="/" variant="light">
              商品をさがす
            </Button>
          }
        />
      )
    }
    return <ErrorState error={item.error} onRetry={item.reload} />
  }

  const sold = data.status === 'sold'
  const isSeller = user !== null && user.id === data.seller.id

  /** ログインしていなければログイン画面へ送る(あとでこのページに戻る) */
  const requireLogin = (): boolean => {
    if (user) return true
    navigate('/login', { state: { from: location.pathname } })
    return false
  }

  const toggleLike = async () => {
    if (!requireLogin()) return
    setLiking(true)
    try {
      const res = data.liked ? await unlikeItem(data.id) : await likeItem(data.id)
      item.setData({ ...data, like_count: res.like_count, liked: res.liked })
    } catch (error) {
      notifyError(error, 'いいねできませんでした')
    } finally {
      setLiking(false)
    }
  }

  const onPurchased = (order: Order) => {
    purchase.close()
    notifySuccess(`${formatPrice(order.price)} で購入しました。マイページで確認できます。`, '購入が完了しました')
    item.reload()
  }

  // 合意済みなら、もう一度 AI 交渉はできない(サーバーも already_agreed で断る)ので、ボタンを出さない。
  // ログインしていない人にも、AI 交渉できる商品だと分かるようにボタンは見せる(押すとログインへ)
  const showAutoNegotiate = data.auto_negotiation === true && !agreedOffer

  /** AI 交渉の結果から購入へ: 交渉のモーダルを閉じて、購入の確認を開く(合意額は購入の確認がサーバーから読み直す) */
  const purchaseAfterAuto = () => {
    auto.close()
    purchase.open()
  }

  const onOfferSent = (offer: Offer) => {
    negotiate.close()
    notifySuccess(
      `${formatPrice(offer.amount)} で価格交渉を送りました。返事はマイページで確認できます。`,
      '送信しました',
    )
  }

  return (
    <Stack gap="xl">
      <Anchor component={Link} to="/" size="sm" c="dimmed">
        <Group gap={4} component="span" display="inline-flex">
          <IconArrowLeft size={14} aria-hidden />
          一覧にもどる
        </Group>
      </Anchor>

      <Grid gap={{ base: 'md', sm: 'xl' }}>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Paper withBorder style={{ overflow: 'hidden' }} pos="relative">
            <Box style={sold ? { opacity: 0.55 } : undefined}>
              <ItemImage title={data.title} category={data.category} imageUrl={data.image_url} iconSize={72} />
            </Box>
            {sold && (
              <Badge color="dark" size="lg" radius="sm" pos="absolute" top={12} left={12}>
                売り切れ
              </Badge>
            )}
          </Paper>
          {data.image_ai_generated === true && data.image_url && (
            // 見本データの画像は AI が作ったもの。実物の写真と思われないように、写真のすぐ下に書く
            <Group gap={6} mt="xs" wrap="nowrap" align="flex-start" c="dimmed">
              <IconPhotoAi size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
              <Text size="xs">AI が作ったイメージ画像です(実物の写真ではありません)</Text>
            </Group>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap="md">
            <div>
              <Title order={1} size="h3" style={{ overflowWrap: 'anywhere' }}>
                {data.title}
              </Title>
              <Group gap={6} mt="xs">
                <Badge variant="light" color="gray" radius="sm">
                  {categoryLabel(data.category)}
                </Badge>
                <Badge variant="light" color="gray" radius="sm">
                  {conditionLabel(data.condition)}
                </Badge>
                {data.brand && (
                  <Badge variant="light" color="gray" radius="sm">
                    {data.brand}
                  </Badge>
                )}
              </Group>
            </div>

            <Group justify="space-between" align="center">
              <Text className="price" fw={700} fz={32} lh={1.1}>
                {formatPrice(data.price)}
              </Text>
              <Button
                variant={data.liked ? 'light' : 'default'}
                color={data.liked ? 'red' : undefined}
                onClick={toggleLike}
                loading={liking}
                aria-pressed={data.liked}
                aria-label={`いいね(現在 ${data.like_count} 件)`}
                leftSection={
                  data.liked ? <IconHeartFilled size={16} aria-hidden /> : <IconHeart size={16} aria-hidden />
                }
              >
                <span className="price">{data.like_count}</span>
              </Button>
            </Group>

            <PriceEstimatePanel
              estimate={estimate.data}
              loading={estimate.loading}
              error={estimate.error}
            />

            {sold ? (
              <Alert color="gray" variant="light" title="この商品は売り切れました">
                似ている商品を下に表示しています。
              </Alert>
            ) : isSeller ? (
              <Alert variant="light" title="あなたが出品した商品です">
                届いた価格交渉は、このページの下で承諾・見送りができます。
              </Alert>
            ) : (
              <Stack gap="xs">
                {agreedOffer && (
                  <Alert variant="light" title={`${formatPrice(agreedOffer.amount)} で交渉が成立しています`}>
                    出品価格 {formatPrice(data.price)} ではなく、成立した金額で購入できます。
                  </Alert>
                )}
                {showAutoNegotiate && (
                  <div>
                    <Button
                      size="md"
                      fullWidth
                      leftSection={<IconSparkles size={18} aria-hidden />}
                      onClick={() => requireLogin() && auto.open()}
                    >
                      AI に交渉を任せる
                    </Button>
                    <Text size="xs" c="dimmed" mt={4}>
                      あなたの AI と出品者の AI が、最大 4 往復で金額を決めます。上限そのものは出品者に表示されません。
                    </Text>
                  </div>
                )}
                <Group grow gap="sm">
                  {/* 画面でいちばん目立つボタンは 1 つにする。AI 交渉を出しているあいだは、購入を枠線だけにする */}
                  <Button
                    size="md"
                    variant={showAutoNegotiate ? 'outline' : 'filled'}
                    onClick={() => requireLogin() && purchase.open()}
                  >
                    {agreedOffer ? 'この金額で購入する' : '購入する'}
                  </Button>
                  <Button
                    size="md"
                    variant="light"
                    leftSection={<IconMessageDollar size={18} aria-hidden />}
                    onClick={() => requireLogin() && negotiate.open()}
                  >
                    価格交渉する
                  </Button>
                </Group>
                {!user && (
                  <Text size="xs" c="dimmed">
                    購入と価格交渉にはログインが必要です。
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Grid.Col>
      </Grid>

      <section aria-labelledby="description-heading">
        <Title order={2} size="h4" id="description-heading" mb="sm">
          商品の説明
        </Title>
        <Paper withBorder p="md">
          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {data.description || '説明はありません。'}
          </Text>
          <Text size="sm" c="dimmed" mt="md">
            出品者:{data.seller.name} さん・出品日:{formatDate(data.created_at)}
          </Text>
        </Paper>
      </section>

      {isSeller && <OffersPanel item={data} onChanged={item.reload} />}

      {/* 古いバックエンド(AI 交渉の項目が無い)では出さない */}
      {isSeller && data.auto_negotiation !== undefined && (
        <SellerNegotiationPanel item={data} onItemChanged={item.setData} />
      )}

      <SimilarItems itemId={data.id} />

      {!isSeller && user && (
        <>
          <PurchaseModal item={data} opened={purchaseOpened} onClose={purchase.close} onPurchased={onPurchased} />
          <NegotiateModal item={data} opened={negotiateOpened} onClose={negotiate.close} onSent={onOfferSent} />
          <AutoNegotiateModal
            item={data}
            opened={autoOpened}
            onClose={auto.close}
            estimate={estimate.data}
            // 合意すると承諾済みの交渉ができるので、「成立しています」の表示を読み直す
            onSettled={(result) => result.outcome === 'agreed' && myOffers.reload()}
            onPurchase={purchaseAfterAuto}
          />
        </>
      )}
    </Stack>
  )
}

export function ItemDetailPage() {
  const { id = '' } = useParams()
  // 似ている商品から別の商品へ移ったとき、前の商品の状態を残さない
  return <ItemDetailView key={id} id={id} />
}
