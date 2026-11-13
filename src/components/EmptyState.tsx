import { Button, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle, IconInbox, type Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../lib/errors'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: Icon
  /** ボタンなどの次の行動 */
  action?: ReactNode
}

/** 「まだ何もない」ときの表示 */
export function EmptyState({ title, description, icon: IconComponent = IconInbox, action }: EmptyStateProps) {
  return (
    <Paper withBorder p="xl">
      <Stack align="center" gap="sm" py="md">
        <ThemeIcon variant="light" color="gray" size={52} radius="xl">
          <IconComponent size={26} stroke={1.5} aria-hidden />
        </ThemeIcon>
        <Text fw={700} ta="center">
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed" ta="center" maw={420}>
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Paper>
  )
}

/** 読み込みに失敗したときの表示(もう一度読み込むボタンつき) */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon={IconAlertTriangle}
        title="読み込めませんでした"
        description={errorMessage(error)}
        action={
          onRetry && (
            <Button variant="light" onClick={onRetry}>
              もう一度読み込む
            </Button>
          )
        }
      />
    </div>
  )
}
