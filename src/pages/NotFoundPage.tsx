import { Button } from '@mantine/core'
import { IconMapOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={IconMapOff}
      title="ページが見つかりません"
      description="URL が変わったか、ページが無くなった可能性があります。"
      action={
        <Button component={Link} to="/" variant="light">
          商品をさがす
        </Button>
      }
    />
  )
}
