import { AppShell, Avatar, Burger, Button, Drawer, Group, Menu, Stack, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconChevronDown, IconLogout, IconPlus, IconUser } from '@tabler/icons-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { notifyError } from '../lib/errors'
import { NotificationBell } from './NotificationBell'

const NAV = [
  { to: '/', label: 'さがす', end: true },
  { to: '/sell', label: '出品する', end: false },
  { to: '/me', label: 'マイページ', end: false },
  { to: '/about-ai', label: 'AI のしくみ', end: false },
] as const

/** Nego のマーク(アーチの形)。ランディングページのロゴと同じ図形なので、同じ製品だと分かる */
function NegoMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M2.5 21.5V12a9.5 9.5 0 0 1 19 0v9.5h-6V12a3.5 3.5 0 0 0-7 0v9.5z" />
    </svg>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.end} className="nav-link" onClick={onNavigate}>
          {link.label}
        </NavLink>
      ))}
    </>
  )
}

function UserMenu() {
  const { status, user, signOut } = useAuth()
  const navigate = useNavigate()

  if (status === 'loading') return null

  if (!user) {
    // ヘッダーの主のボタン(ランディングのヘッダーと同じ、緑の塗りのピル)
    return (
      <Button component={Link} to="/login">
        ログイン
      </Button>
    )
  }

  const logout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      notifyError(error, 'ログアウトできませんでした')
    }
  }

  return (
    <Menu position="bottom-end" width={200} withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label={`ユーザーメニュー(${user.name})`} className="user-button">
          <Group gap={6} wrap="nowrap">
            <Avatar color="nego" radius="xl" size="sm" name={user.name} />
            <Text size="sm" fw={500} maw={120} truncate visibleFrom="xs">
              {user.name}
            </Text>
            <IconChevronDown size={14} aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{user.name} さん</Menu.Label>
        <Menu.Item component={Link} to="/me" leftSection={<IconUser size={16} aria-hidden />}>
          マイページ
        </Menu.Item>
        <Menu.Item component={Link} to="/sell" leftSection={<IconPlus size={16} aria-hidden />}>
          出品する
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item onClick={logout} leftSection={<IconLogout size={16} aria-hidden />}>
          ログアウト
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

/** 全ページ共通の枠: ヘッダー(ロゴ・ナビ・ユーザーメニュー)、本文、フッター */
export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)
  const { user } = useAuth()

  return (
    // ヘッダーの高さはランディングと同じ(パソコン 72px、スマホ 56px)
    <AppShell header={{ height: { base: 56, sm: 72 } }} padding={0}>
      <AppShell.Header>
        {/* nego-wrap: ランディングと同じ幅と左右の余白。ロゴが左の線、右端のボタンが右の線にそろう */}
        <div className="nego-wrap nego-bar">
          <Link to="/" className="brand" aria-label="Nego ホーム">
            <NegoMark />
            Nego
          </Link>
          <Group component="nav" gap={4} visibleFrom="sm" aria-label="メインメニュー" wrap="nowrap">
            <NavLinks />
          </Group>
          <div className="nego-bar__end">
            {/* お知らせはログイン中だけ。key で、別の人がログインしたら前の人のお知らせを捨てる */}
            {user && <NotificationBell key={user.id} />}
            <UserMenu />
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              // 押せる範囲を 44px にする
              w={44}
              h={44}
              aria-label={opened ? 'メニューを閉じる' : 'メニューを開く'}
            />
          </div>
        </div>
      </AppShell.Header>

      <Drawer opened={opened} onClose={close} title="メニュー" size="100%" position="right" hiddenFrom="sm">
        <Stack component="nav" gap={0} aria-label="メインメニュー" className="nav-sheet">
          <NavLinks onNavigate={close} />
        </Stack>
      </Drawer>

      {/* 本文が短いページでも、フッターが画面の下に来るように縦に並べる */}
      <AppShell.Main display="flex" style={{ flexDirection: 'column' }}>
        <div className="nego-wrap" style={{ flex: 1, paddingBlock: 'clamp(20px, 4vw, 40px)' }}>
          <Outlet />
        </div>
        <footer className="nego-footer">
          <div className="nego-wrap nego-footer__row">
            <Text size="sm" c="dimmed">
              Nego — AI があいだに立つフリマ
            </Text>
            {/* ランディングページは React の外にある静的な HTML なので、Link ではなくふつうの <a> で開く */}
            <a className="quiet-link" href="/welcome/">
              Nego とは
            </a>
          </div>
        </footer>
      </AppShell.Main>
    </AppShell>
  )
}
