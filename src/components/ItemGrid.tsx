import { SimpleGrid, VisuallyHidden } from '@mantine/core'
import type { ItemSummary } from '../types'
import { ItemCard, ItemCardSkeleton } from './ItemCard'

const COLS = { base: 2, sm: 3, md: 4, lg: 5 }
const SPACING = { base: 'sm', sm: 'md' }

export function ItemGrid({ items }: { items: ItemSummary[] }) {
  return (
    <SimpleGrid cols={COLS} spacing={SPACING} verticalSpacing={SPACING}>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </SimpleGrid>
  )
}

export function ItemGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div role="status">
      <VisuallyHidden>商品を読み込んでいます</VisuallyHidden>
      <SimpleGrid cols={COLS} spacing={SPACING} verticalSpacing={SPACING}>
        {Array.from({ length: count }, (_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </SimpleGrid>
    </div>
  )
}
