import { Center, Loader } from '@mantine/core'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context'

/** ログインが必要なページを包む。未ログインならログイン画面へ送り、ログイン後に元のページへ戻す */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <Center mih={240}>
        <Loader aria-label="ログイン状態を確認しています" />
      </Center>
    )
  }
  if (status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}
