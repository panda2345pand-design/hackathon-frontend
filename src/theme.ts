import { Badge, createTheme, type MantineColorsTuple } from '@mantine/core'

// Nego のメインカラー(深い緑)。ボタン・リンク・AI のパネルはすべてこの 1 色でそろえる
const nego: MantineColorsTuple = [
  '#e8f7f2',
  '#d3ece4',
  '#a8d8c9',
  '#79c3ac',
  '#52b194',
  '#39a685',
  '#2a9f7c',
  '#178a69',
  '#02765d',
  '#00664d',
]

export const theme = createTheme({
  primaryColor: 'nego',
  primaryShade: 8,
  colors: { nego },
  defaultRadius: 'md',
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic UI", Meiryo, system-ui, sans-serif',
  headings: { fontWeight: '700' },
  components: {
    // ブランド名や日本語のラベルを勝手に大文字にしない
    Badge: Badge.extend({ styles: { label: { textTransform: 'none' } } }),
  },
})
