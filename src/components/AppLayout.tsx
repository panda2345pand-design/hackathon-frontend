import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconChevronDown, IconLogout, IconPlus, IconUser } from '@tabler/icons-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { notifyError } from '../lib/errors'

const NAV = [
  { to: '/', label: 'さがす', end: true },
  { to: '/sell', label: '出品する', end: false },
  { to: '/me', label: 'マイページ', end: false },
  { to: '/about-ai', label: 'AI のしくみ', end: false },
] as const

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
    return (
      <Button component={Link} to="/login" variant="light" size="sm">
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
        <UnstyledButton aria-label={`ユーザーメニュー(${user.name})`} py={4}>
          <Group gap={6} wrap="nowrap">
            <Avatar color="nego" radius="xl" size="sm" name={user.name} />
            <Text size="sm" fw={600} maw={120} truncate visibleFrom="xs">
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

/** 全ページ共通の枠: ヘッダー(ロゴ・ナビ・ユーザーメニュー)と本文 */
export function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={opened ? 'メニューを閉じる' : 'メニューを開く'}
              />
              <Text
                component={Link}
                to="/"
                fw={800}
                fz={22}
                c="nego.8"
                style={{ textDecoration: 'none', letterSpacing: '-0.02em' }}
                aria-label="Nego ホーム"
              >
                Nego
              </Text>
              <Group component="nav" gap={4} ml="md" visibleFrom="sm" aria-label="メインメニュー">
                <NavLinks />
              </Group>
            </Group>
            <UserMenu />
          </Group>
        </Container>
      </AppShell.Header>

      <Drawer opened={opened} onClose={close} title="メニュー" size="75%" hiddenFrom="sm">
        <Stack component="nav" gap={4} aria-label="メインメニュー">
          <NavLinks onNavigate={close} />
        </Stack>
      </Drawer>

      <AppShell.Main>
        <Container size="lg" py={{ base: 'md', sm: 'xl' }}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
