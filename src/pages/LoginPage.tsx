import {
  Alert,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from '../config'
import { errorMessage } from '../lib/errors'

type Tab = 'signin' | 'signup'

function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('/login')) return from
  }
  return '/'
}

export function LoginPage() {
  const { mode, status, signInDev, signInWithEmail, signUpWithEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = redirectTarget(location.state)

  const [tab, setTab] = useState<Tab>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'signedIn') navigate(target, { replace: true })
  }, [status, target, navigate])

  const needsName = mode === 'dev' || tab === 'signup'

  // お試し用アカウントで入る(登録の手間なしで AI 機能まで届くようにする)
  const [demoBusy, setDemoBusy] = useState<DemoAccount['key'] | null>(null)
  const signInDemo = async (account: DemoAccount) => {
    setError(null)
    setDemoBusy(account.key)
    try {
      await signInWithEmail(account.email, DEMO_PASSWORD)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setDemoBusy(null)
    }
  }
  const showDemo = mode === 'firebase' && DEMO_ACCOUNTS.length > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (needsName && !name.trim()) {
      setError('表示名を入れてください')
      return
    }
    if (mode === 'firebase' && (!email.trim() || !password)) {
      setError('メールアドレスとパスワードを入れてください')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'dev') await signInDev(name)
      else if (tab === 'signup') await signUpWithEmail(email.trim(), password, name)
      else await signInWithEmail(email.trim(), password)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <Center mih={240}>
        <Loader aria-label="ログイン状態を確認しています" />
      </Center>
    )
  }

  return (
    <Center>
      <Paper withBorder p={{ base: 'lg', sm: 'xl' }} w="100%" maw={420}>
        <form onSubmit={submit} noValidate>
          <Stack gap="md">
            <div>
              <Title order={1} size="h3">
                {mode === 'firebase' && tab === 'signup' ? '新規登録' : 'ログイン'}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                出品・購入・価格交渉にはログインが必要です。
              </Text>
            </div>

            {mode === 'firebase' && (
              <SegmentedControl
                fullWidth
                value={tab}
                onChange={(value) => {
                  setTab(value === 'signup' ? 'signup' : 'signin')
                  setError(null)
                }}
                data={[
                  { value: 'signin', label: 'ログイン' },
                  { value: 'signup', label: '新規登録' },
                ]}
                aria-label="ログインか新規登録かを選ぶ"
              />
            )}

            {error && (
              <Alert color="red" variant="light" role="alert">
                {error}
              </Alert>
            )}

            {needsName && (
              <TextInput
                label="表示名"
                description={
                  mode === 'dev'
                    ? '開発用ログインです。同じ名前を入れると同じユーザーになります'
                    : 'ほかのユーザーに見える名前です'
                }
                placeholder="例: たろう"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                autoComplete="nickname"
                maxLength={40}
                required
              />
            )}

            {mode === 'firebase' && (
              <>
                <TextInput
                  label="メールアドレス"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  autoComplete="email"
                  required
                />
                <PasswordInput
                  label="パスワード"
                  description={tab === 'signup' ? '6 文字以上' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
              </>
            )}

            <Button type="submit" loading={submitting} fullWidth>
              {mode === 'firebase' && tab === 'signup' ? '登録してはじめる' : 'ログイン'}
            </Button>

            {showDemo && (
              <>
                <Divider label="登録せずに試す" labelPosition="center" />
                <Text size="xs" c="dimmed">
                  お試し用の共用アカウントです。ほかの人も同じアカウントを使います。
                </Text>
                <Group grow gap="sm" align="stretch">
                  {DEMO_ACCOUNTS.map((account) => (
                    <Button
                      key={account.key}
                      variant="light"
                      h="auto"
                      py="xs"
                      loading={demoBusy === account.key}
                      disabled={submitting || (demoBusy !== null && demoBusy !== account.key)}
                      onClick={() => signInDemo(account)}
                      aria-label={`${account.label}(${account.hint})`}
                    >
                      <Stack gap={2} align="center">
                        <Text size="sm" fw={700}>
                          {account.label}
                        </Text>
                        <Text size="xs" style={{ whiteSpace: 'normal' }}>
                          {account.hint}
                        </Text>
                      </Stack>
                    </Button>
                  ))}
                </Group>
              </>
            )}
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
