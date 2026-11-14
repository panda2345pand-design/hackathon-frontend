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
  IconPlant2,
  IconSofa,
  type Icon,
} from '@tabler/icons-react'
import { useState } from 'react'
import { categoryLabel } from '../lib/labels'

// 商品写真が無いとき、または写真を読み込めなかったときは、カテゴリごとに決まった色とアイコンの面を出す。
// 同じカテゴリは必ず同じ見た目になる。

const COLORS = ['nego', 'indigo', 'orange', 'grape', 'cyan', 'pink', 'lime', 'blue'] as const

const ICONS: ReadonlyArray<readonly [RegExp, Icon]> = [
  [/家電|スマホ|電子|パソコン|カメラ|electronic|phone|computer|camera/i, IconDeviceMobile],
  [/本|書籍|雑誌|漫画|book|magazine/i, IconBook],
  [/ベビー|キッズ|子ども|子供|baby|kid/i, IconBabyCarriage],
  // 「Garden & Outdoor」が下の outdoor(スポーツ)に取られないように、先に園芸を見る
  [/ガーデン|園芸|garden/i, IconPlant2],
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
          // 画面に近づくまで読み込まず、画像の展開で画面の描画を止めない
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          style={{ objectFit: 'cover', display: 'block' }}
        />
      </AspectRatio>
    )
  }

  // 色とアイコンは元の(英語の)カテゴリ名から決め、見える文字だけ日本語にする
  const { color, PlaceholderIcon } = placeholderFor(category)
  const label = categoryLabel(category)
  return (
    <AspectRatio ratio={ratio}>
      <Box
        role="img"
        aria-label={`${title}(写真なし・${label || 'カテゴリなし'})`}
        bg={`${color}.0`}
        c={`${color}.8`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Stack align="center" gap={6} px="xs">
          <PlaceholderIcon size={iconSize} stroke={1.4} aria-hidden />
          {showLabel && label && (
            <Text size="xs" fw={600} ta="center" lineClamp={1}>
              {label}
            </Text>
          )}
        </Stack>
      </Box>
    </AspectRatio>
  )
}
