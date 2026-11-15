import { ActionIcon, Box, Group, Indicator, Menu, Text } from '@mantine/core'
import { IconBell } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, readAllNotifications } from '../api'
import { formatRelativeTime } from '../lib/format'
import type { AppNotification, NotificationsResponse } from '../types'

/** 新しいお知らせを見にいく間隔 */
const POLL_MS = 30_000

function NotificationRow({ notification }: { notification: AppNotification }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      {/* まだ読んでいない印。場所はいつも取っておき、文の左端をそろえる */}
      <Box
        w={8}
        h={8}
        mt={6}
        bg={notification.read ? 'transparent' : 'nego.6'}
        style={{ borderRadius: '50%', flexShrink: 0 }}
        aria-hidden
      />
      <div style={{ minWidth: 0 }}>
        <Text size="sm" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
          {!notification.read && <span className="visually-hidden">新着:</span>}
          {notification.message}
        </Text>
        <Text size="xs" c="dimmed">
          {formatRelativeTime(notification.created_at)}
        </Text>
      </div>
    </Group>
  )
}

/**
 * ヘッダーのベル(お知らせ)。AI ではなく、サーバーが記録した出来事(交渉が届いた・売れた など)の一覧。
 * - タブが見えているあいだだけ、30 秒ごとに読みにいく(見ていないタブで通信し続けない)
 * - 開いたら「全部読んだ」とサーバーに伝えて、数字を消す
 * 読み込みに失敗しても、ほかの画面のじゃまはしない(通知は出さず、開いたときにだけ伝える)。
 */
export function NotificationBell() {
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const load = () => {
      getNotifications().then(
        (res) => {
          if (cancelled) return
          setData(res)
          setFailed(false)
        },
        () => {
          if (!cancelled) setFailed(true)
        },
      )
    }
    const stop = () => {
      window.clearInterval(timer)
      timer = undefined
    }
    /** タブが見えていれば「すぐ 1 回 + 30 秒ごと」を始め、隠れたら止める */
    const sync = () => {
      stop()
      if (document.visibilityState !== 'visible') return
      load()
      timer = window.setInterval(load, POLL_MS)
    }

    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const unread = data?.unread_count ?? 0
  const list = data?.notifications ?? []

  const markAllRead = () => {
    if (unread === 0) return
    // 数字だけ 0 にする。一覧の「新着」の印は、いま開いているあいだは残す(どれが新しいかが分かるように)
    readAllNotifications().then(
      (res) => setData((prev) => (prev ? { ...prev, unread_count: res.unread_count } : prev)),
      () => {},
    )
  }

  return (
    // Indicator(数字の印)は Menu の外側に置く。Menu.Target の直下は、押せるボタンそのものにする
    <Indicator label={unread > 99 ? '99+' : unread} disabled={unread === 0} size={16} offset={5} color="red">
      <Menu position="bottom-end" width={320} withinPortal onOpen={markAllRead}>
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label={unread > 0 ? `お知らせ(未読 ${unread} 件)` : 'お知らせ'}
          >
            <IconBell size={20} aria-hidden />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown maw="calc(100vw - 24px)" mah={420} style={{ overflowY: 'auto' }}>
          <Menu.Label>お知らせ</Menu.Label>
          {list.length === 0 && (
            <Text size="sm" c="dimmed" px="sm" py="md" ta="center">
              {failed && !data ? 'お知らせを読み込めませんでした' : data ? 'お知らせはまだありません' : '読み込んでいます…'}
            </Text>
          )}
          {list.map((notification) =>
            notification.item_id ? (
              <Menu.Item key={notification.id} component={Link} to={`/items/${notification.item_id}`}>
                <NotificationRow notification={notification} />
              </Menu.Item>
            ) : (
              <Menu.Item key={notification.id} component="div" style={{ cursor: 'default' }}>
                <NotificationRow notification={notification} />
              </Menu.Item>
            ),
          )}
        </Menu.Dropdown>
      </Menu>
    </Indicator>
  )
}
