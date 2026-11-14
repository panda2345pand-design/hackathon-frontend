import { Badge, Box, Card, Group, Skeleton, Text } from '@mantine/core'
import { IconHeart, IconSparkles } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { conditionLabel } from '../lib/labels'
import type { ItemSummary } from '../types'
import { ItemImage } from './ItemImage'

export function ItemCard({ item }: { item: ItemSummary }) {
  const sold = item.status === 'sold'
  // あとから足した項目なので、古い応答に無いときは「付いていない」として扱う
  const negotiable = item.auto_negotiation === true && !sold
  const aiImage = item.image_ai_generated === true && Boolean(item.image_url)
  return (
    <Card
      component={Link}
      to={`/items/${item.id}`}
      withBorder
      padding="sm"
      className="item-card"
      aria-label={`${item.title} ${formatPrice(item.price)}${sold ? ' 売り切れ' : ''}${negotiable ? ' AI 交渉可' : ''}`}
      h="100%"
    >
      <Card.Section pos="relative">
        <Box style={sold ? { opacity: 0.55 } : undefined}>
          <ItemImage title={item.title} category={item.category} imageUrl={item.image_url} />
        </Box>
        {sold && (
          <Badge color="dark" radius="sm" pos="absolute" top={8} left={8}>
            売り切れ
          </Badge>
        )}
        {negotiable && (
          <Badge
            radius="sm"
            size="sm"
            pos="absolute"
            top={8}
            left={8}
            leftSection={<IconSparkles size={11} aria-hidden />}
          >
            AI 交渉可
          </Badge>
        )}
        {aiImage && (
          // 実物の写真ではないことを、じゃまにならない大きさで角に出す
          <Badge color="dark" variant="filled" radius="sm" size="xs" pos="absolute" bottom={6} right={6} opacity={0.8}>
            AI 画像
          </Badge>
        )}
      </Card.Section>

      <Text size="sm" fw={500} lineClamp={2} mt="sm" mih="2.9em" lh={1.45}>
        {item.title}
      </Text>
      <Text className="price" fw={700} size="lg" mt={4}>
        {formatPrice(item.price)}
      </Text>
      <Group justify="space-between" gap="xs" mt={6} wrap="nowrap">
        <Badge variant="light" color="gray" radius="sm" style={{ minWidth: 0 }}>
          {conditionLabel(item.condition)}
        </Badge>
        <Group gap={3} wrap="nowrap" c="dimmed" aria-label={`いいね ${item.like_count} 件`}>
          <IconHeart size={14} aria-hidden />
          <Text size="xs" className="price">
            {item.like_count}
          </Text>
        </Group>
      </Group>
    </Card>
  )
}

export function ItemCardSkeleton() {
  return (
    <Card withBorder padding="sm" aria-hidden>
      <Card.Section>
        <Skeleton style={{ aspectRatio: '1 / 1' }} radius={0} />
      </Card.Section>
      <Skeleton height={12} mt="md" />
      <Skeleton height={12} mt={8} width="70%" />
      <Skeleton height={18} mt="sm" width="45%" />
    </Card>
  )
}
