import { CloseButton, Group, Paper, SimpleGrid, Text, UnstyledButton } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, type To } from 'react-router-dom'
import { useAuth } from '../auth/context'

const STORAGE_KEY = 'nego:onboarding-dismissed'

// localStorage は、プライベートブラウズなどで使えずに例外になることがある。
// 案内が出せない・消せないだけで画面全体が落ちないように、必ず try/catch で包む
function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function rememberDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 保存できなくても、この表示のあいだは閉じたままにできる
  }
}

interface Step {
  title: string
  note: string
  to: To
  state?: unknown
  onClick?: () => void
}

/** 一覧まで画面を動かす(React Router のリンクは、# の場所まで自動では動かないため) */
const scrollToList = () => document.getElementById('item-list')?.scrollIntoView({ block: 'start' })

interface OnboardingCardProps {
  /** いま一覧に出ている、AI 交渉ができる商品(あれば ① からその商品へ直接行く) */
  negotiableItemId: string | null
}

/**
 * はじめて来た人(ひとりで見にきた審査員など)向けの案内。3 つの AI をどこで試せるかを 1 行ずつ出す。
 * 一度閉じたら出さない(その端末の localStorage に覚える)。
 */
export function OnboardingCard({ negotiableItemId }: OnboardingCardProps) {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (dismissed) return null

  const steps: Step[] = [
    !user
      ? { title: '買い手として試す', note: 'ログインして、AI 同士の交渉へ', to: '/login', state: { from: '/' } }
      : negotiableItemId
        ? { title: '買い手として試す', note: 'AI 同士の交渉ができる商品を開く', to: `/items/${negotiableItemId}` }
        : { title: '買い手として試す', note: '「AI 交渉可」の印がある商品を開く', to: '#item-list', onClick: scrollToList },
    { title: '売り手として試す', note: '写真から出品・AI の価格', to: '/sell' },
    { title: 'AI のしくみ', note: 'どの AI が何をしているか', to: '/about-ai' },
  ]

  return (
    // lit: ランディングで製品の画面の後ろに敷いている「空色の面」。その上に白いカードを 3 枚置く
    <Paper p={{ base: 'sm', sm: 'md' }} className="lit" component="section" aria-labelledby="onboarding-heading">
      <Group justify="space-between" wrap="nowrap" gap="xs" mb="xs">
        <Text fw={600} component="h2" m={0} id="onboarding-heading">
          はじめての方へ:3つの AI を試す
        </Text>
        <CloseButton
          size="lg"
          radius="xl"
          c="inherit"
          aria-label="案内を閉じる"
          onClick={() => {
            rememberDismissed()
            setDismissed(true)
          }}
        />
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" verticalSpacing="xs">
        {steps.map((step, index) => (
          <UnstyledButton
            key={step.title}
            component={Link}
            to={step.to}
            state={step.state}
            onClick={step.onClick}
            className="onboarding-step lit-card"
            aria-label={`${index + 1}. ${step.title}:${step.note}`}
          >
            <Group gap="sm" wrap="nowrap">
              <span className="step-num" aria-hidden>
                {index + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} lh={1.4}>
                  {step.title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.4} truncate>
                  {step.note}
                </Text>
              </div>
              <IconChevronRight size={16} color="var(--nego-accent)" aria-hidden />
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Paper>
  )
}
