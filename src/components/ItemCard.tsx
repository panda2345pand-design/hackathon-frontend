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
      // 写真の枠のまわりに 6px だけあける(カードの中に写真がはめ込まれて見える)
      padding={6}
      className="item-card"
      aria-label={`${item.title} ${formatPrice(item.price)}${sold ? ' 売り切れ' : ''}${negotiable ? ' AI 交渉可' : ''}`}
      h="100%"
    >
      {/* photo-frame: 写真の枠。売り切れのときは data-sold で写真だけうすくする(index.css) */}
      <div className="photo-frame" data-sold={sold || undefined}>
        <ItemImage title={item.title} category={item.category} imageUrl={item.image_url} />
        {sold && (
          <Badge color="dark" pos="absolute" top={8} left={8}>
            売り切れ
          </Badge>
        )}
        {negotiable && (
          <Badge size="sm" pos="absolute" top={8} left={8} leftSection={<IconSparkles size={12} aria-hidden />}>
            AI 交渉可
          </Badge>
        )}
        {aiImage && (
          // 実物の写真ではないことを、じゃまにならない大きさで角に出す
          <Badge color="dark" variant="filled" size="xs" pos="absolute" bottom={6} right={6} opacity={0.8}>
            AI 画像
          </Badge>
        )}
      </div>

      <Box px={6} pt="sm" pb={6}>
        <Text size="sm" lineClamp={2} mih="3.1em" lh={1.55}>
          {item.title}
        </Text>
        <Text className="price" fw={600} size="lg" mt={2} lh={1.3}>
          {formatPrice(item.price)}
        </Text>
        <Group justify="space-between" gap="xs" mt={8} wrap="nowrap">
          <Badge variant="light" color="gray" size="sm" style={{ minWidth: 0 }}>
            {conditionLabel(item.condition)}
          </Badge>
          <Group gap={3} wrap="nowrap" c="dimmed" aria-label={`いいね ${item.like_count} 件`}>
            <IconHeart size={14} aria-hidden />
            <Text size="xs" className="price">
              {item.like_count}
            </Text>
          </Group>
        </Group>
      </Box>
    </Card>
  )
}

export function ItemCardSkeleton() {
  return (
    // 本物のカードと同じ形(6px の内側に写真の枠、その下に 3 行)にして、読み込み後に画面が動かないようにする
    <Card withBorder padding={6} aria-hidden>
      <Skeleton style={{ aspectRatio: '1 / 1' }} radius={10} />
      <Box px={6} pt="sm" pb={6}>
        <Skeleton height={12} />
        <Skeleton height={12} mt={8} width="70%" />
        <Skeleton height={18} mt="sm" width="45%" />
        <Skeleton height={18} mt={10} width="30%" />
      </Box>
    </Card>
  )
}
