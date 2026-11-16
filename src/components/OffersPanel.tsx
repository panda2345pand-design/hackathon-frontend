import { Badge, Button, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { useState } from 'react'
import { acceptOffer, listItemOffers, rejectOffer } from '../api'
import { notifyError, notifySuccess } from '../lib/errors'
import { OFFER_STATUS_LABEL, formatDate, formatPrice } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { ItemDetail, Offer } from '../types'
import { ErrorState } from './EmptyState'

interface OffersPanelProps {
  item: ItemDetail
  /** 承諾・見送りのあとに呼ぶ */
  onChanged: () => void
}

/** 出品者だけに見える「届いた価格交渉」。承諾・見送りができる */
export function OffersPanel({ item, onChanged }: OffersPanelProps) {
  const offers = useApi(() => listItemOffers(item.id), item.id)
  const [busyId, setBusyId] = useState<string | null>(null)

  const respond = async (offer: Offer, action: 'accept' | 'reject') => {
    setBusyId(offer.id)
    try {
      if (action === 'accept') {
        await acceptOffer(offer.id)
        notifySuccess(`${offer.buyer.name} さんの ${formatPrice(offer.amount)} を承諾しました`)
      } else {
        await rejectOffer(offer.id)
        notifySuccess(`${offer.buyer.name} さんの提案を見送りました`)
      }
      offers.reload()
      onChanged()
    } catch (error) {
      notifyError(error, '操作できませんでした')
    } finally {
      setBusyId(null)
    }
  }

  const list = offers.data?.offers ?? []
  const canRespond = item.status === 'on_sale'

  return (
    <section aria-labelledby="offers-heading">
      <Title order={2} size="h4" id="offers-heading" mb="sm">
        届いた価格交渉
      </Title>

      {offers.loading && !offers.data && (
        <Stack gap="sm" role="status" aria-label="価格交渉を読み込んでいます">
          <Skeleton height={84} />
          <Skeleton height={84} />
        </Stack>
      )}

      {offers.error !== null && <ErrorState error={offers.error} onRetry={offers.reload} />}

      {offers.data && list.length === 0 && (
        <Paper withBorder p="md">
          <Text size="sm" c="dimmed">
            まだ価格交渉は届いていません。
          </Text>
        </Paper>
      )}

      <Stack gap="sm">
        {list.map((offer) => {
          const status = OFFER_STATUS_LABEL[offer.status]
          return (
            <Paper key={offer.id} withBorder p="md">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text className="price" fw={600} size="xl" lh={1.2}>
                    {formatPrice(offer.amount)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {offer.buyer.name} さん・{formatDate(offer.created_at)}
                  </Text>
                </div>
                <Badge color={status.color} variant="light">
                  {status.label}
                </Badge>
              </Group>

              {offer.message && (
                <Text size="sm" mt="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {offer.message}
                </Text>
              )}

              {offer.ai_comment && (
                <Group gap={6} mt="sm" wrap="nowrap" align="flex-start" c="nego.9">
                  <IconSparkles size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                  <Text size="sm">
                    <Text span fw={600}>
                      AI のコメント:
                    </Text>
                    {offer.ai_comment}
                  </Text>
                </Group>
              )}

              {offer.status === 'pending' && canRespond && (
                <Group justify="flex-end" mt="md" gap="xs">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => respond(offer, 'reject')}
                    disabled={busyId !== null}
                    aria-label={`${offer.buyer.name} さんの ${formatPrice(offer.amount)} を見送る`}
                  >
                    見送る
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => respond(offer, 'accept')}
                    loading={busyId === offer.id}
                    disabled={busyId !== null && busyId !== offer.id}
                    aria-label={`${offer.buyer.name} さんの ${formatPrice(offer.amount)} を承諾する`}
                  >
                    承諾する
                  </Button>
                </Group>
              )}
            </Paper>
          )
        })}
      </Stack>
    </section>
  )
}
