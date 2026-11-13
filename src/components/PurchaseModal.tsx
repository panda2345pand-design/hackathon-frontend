import { Alert, Button, Group, Modal, Paper, Skeleton, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { listMyOffers, purchaseItem } from '../api'
import { errorMessage } from '../lib/errors'
import { formatPrice } from '../lib/format'
import { useApi } from '../lib/useApi'
import type { ItemDetail, Order } from '../types'

interface PurchaseModalProps {
  item: ItemDetail
  opened: boolean
  onClose: () => void
  onPurchased: (order: Order) => void
}

/**
 * 購入の確認。金額はサーバーが決める(承諾された価格交渉があればその金額、なければ出品価格)。
 * ここでは、サーバーから読んだ「自分の承諾済みの交渉」を見せるだけで、金額の確定はしない。
 */
function PurchaseBody({ item, onClose, onPurchased }: Omit<PurchaseModalProps, 'opened'>) {
  const myOffers = useApi(listMyOffers, item.id)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accepted = myOffers.data?.offers.find(
    (offer) => offer.item_id === item.id && offer.status === 'accepted',
  )
  const price = accepted ? accepted.amount : item.price

  const buy = async () => {
    setBuying(true)
    setError(null)
    try {
      onPurchased(await purchaseItem(item.id))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBuying(false)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" lineClamp={2}>
        {item.title}
      </Text>

      <Paper withBorder p="md">
        <Text size="xs" c="dimmed">
          お支払い金額
        </Text>
        {myOffers.loading ? (
          <Skeleton height={32} width={140} mt={4} />
        ) : (
          <Text className="price" fw={700} fz={28} lh={1.2}>
            {formatPrice(price)}
          </Text>
        )}
        {accepted && (
          <Text size="sm" c="nego.9" mt={4} className="price">
            価格交渉が成立した金額です(出品価格 {formatPrice(item.price)})
          </Text>
        )}
        <Text size="xs" c="dimmed" mt={6}>
          金額はサーバーが確定します。確定した金額は購入後に表示されます。
        </Text>
      </Paper>

      {myOffers.error !== null && (
        <Text size="xs" c="dimmed">
          価格交渉の状況を確認できなかったため、出品価格を表示しています。
        </Text>
      )}

      {error && (
        <Alert color="red" variant="light" role="alert" title="購入できませんでした">
          {error}
        </Alert>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose} disabled={buying}>
          やめる
        </Button>
        <Button onClick={buy} loading={buying} disabled={myOffers.loading}>
          購入を確定する
        </Button>
      </Group>
    </Stack>
  )
}

export function PurchaseModal({ item, opened, onClose, onPurchased }: PurchaseModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="購入の確認" centered>
      {opened && <PurchaseBody item={item} onClose={onClose} onPurchased={onPurchased} />}
    </Modal>
  )
}
