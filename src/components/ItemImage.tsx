import { AspectRatio, Box, Stack, Text } from '@mantine/core'
import {
  IconBabyCarriage,
  IconBallBasketball,
  IconBook,
  IconBrush,
  IconCar,
  IconDeviceGamepad2,
  IconDeviceMobile,
  IconDiamond,
  IconHanger,
  IconNeedleThread,
  IconPackage,
  IconSofa,
  type Icon,
} from '@tabler/icons-react'
import { useState } from 'react'

// 商品写真が無いとき(データセットに写真は無い)は、カテゴリごとに決まった色とアイコンの面を出す。
// 同じカテゴリは必ず同じ見た目になる。外部の画像は使わない。

const COLORS = ['nego', 'indigo', 'orange', 'grape', 'cyan', 'pink', 'lime', 'blue'] as const

const ICONS: ReadonlyArray<readonly [RegExp, Icon]> = [
  [/家電|スマホ|電子|パソコン|カメラ|electronic|phone|computer|camera/i, IconDeviceMobile],
  [/本|書籍|雑誌|漫画|book|magazine/i, IconBook],
  [/ベビー|キッズ|子ども|子供|baby|kid/i, IconBabyCarriage],
  [/スポーツ|アウトドア|sport|outdoor/i, IconBallBasketball],
  [/コスメ|美容|香水|beauty|cosme|makeup/i, IconBrush],
  [/ゲーム|おもちゃ|ホビー|game|toy|hobby/i, IconDeviceGamepad2],
  [/インテリア|家具|住まい|キッチン|home|furniture|kitchen/i, IconSofa],
  [/ハンドメイド|手芸|handmade|craft/i, IconNeedleThread],
  [/アクセサリー|ジュエリー|時計|ヴィンテージ|コレクション|jewel|watch|vintage|collect/i, IconDiamond],
  [/自動車|バイク|車|car|auto|bike/i, IconCar],
  [/服|ファッション|レディース|メンズ|靴|バッグ|women|men|fashion|cloth|shoe|bag/i, IconHanger],
]

function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return h
}

function placeholderFor(category: string): { color: string; PlaceholderIcon: Icon } {
  const color = COLORS[hash(category) % COLORS.length]
  const match = ICONS.find(([pattern]) => pattern.test(category))
  return { color, PlaceholderIcon: match ? match[1] : IconPackage }
}

interface ItemImageProps {
  title: string
  category: string
  imageUrl: string | null | undefined
  /** 幅 ÷ 高さ。既定は正方形 */
  ratio?: number
  /** カテゴリ名を面に出すか(小さいサムネイルでは消す) */
  showLabel?: boolean
  iconSize?: number
}

export function ItemImage({
  title,
  category,
  imageUrl,
  ratio = 1,
  showLabel = true,
  iconSize = 44,
}: ItemImageProps) {
  const [broken, setBroken] = useState(false)

  if (imageUrl && !broken) {
    return (
      <AspectRatio ratio={ratio}>
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          onError={() => setBroken(true)}
          style={{ objectFit: 'cover', display: 'block' }}
        />
      </AspectRatio>
    )
  }

  const { color, PlaceholderIcon } = placeholderFor(category)
  return (
    <AspectRatio ratio={ratio}>
      <Box
        role="img"
        aria-label={`${title}(写真なし・${category || 'カテゴリなし'})`}
        bg={`${color}.0`}
        c={`${color}.8`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Stack align="center" gap={6} px="xs">
          <PlaceholderIcon size={iconSize} stroke={1.4} aria-hidden />
          {showLabel && category && (
            <Text size="xs" fw={600} ta="center" lineClamp={1}>
              {category}
            </Text>
          )}
        </Stack>
      </Box>
    </AspectRatio>
  )
}
