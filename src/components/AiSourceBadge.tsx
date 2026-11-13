import { Badge } from '@mantine/core'
import { IconPlugConnectedX, IconSparkles } from '@tabler/icons-react'
import type { AiSource } from '../types'

/**
 * AI の文章がどこから来たかを正直に出すラベル。
 * source が "fallback" のときは Gemini につながっておらず、決め打ちの文なのでそう書く。
 */
export function AiSourceBadge({ source }: { source: AiSource }) {
  if (source === 'gemini') {
    return (
      <Badge variant="light" leftSection={<IconSparkles size={12} aria-hidden />}>
        Gemini が作成
      </Badge>
    )
  }
  return (
    <Badge variant="light" color="gray" leftSection={<IconPlugConnectedX size={12} aria-hidden />}>
      AI 未接続(定型文)
    </Badge>
  )
}
