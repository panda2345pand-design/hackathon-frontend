import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../auth/context'
import { renderPage } from '../test/helpers'
import { LoginPage } from './LoginPage'

/** 未ログインの状態でログイン画面を出す。ログインの関数は呼ばれ方を確かめられるように差しかえる */
function renderLogin(auth: Partial<AuthContextValue> = {}) {
  const signInDev = vi.fn(async () => {})
  const signInWithEmail = vi.fn(async () => {})
  const signUpWithEmail = vi.fn(async () => {})
  renderPage(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>ホーム</p>} />
    </Routes>,
    '/login',
    { mode: 'firebase', status: 'signedOut', user: null, signInDev, signInWithEmail, signUpWithEmail, ...auth },
  )
  return { signInDev, signInWithEmail, signUpWithEmail }
}

const emailInput = () => screen.getByRole('textbox', { name: /メールアドレス/ })
const passwordInput = () => screen.getByLabelText(/^パスワード/, { selector: 'input' })

describe('LoginPage(firebase モード)', () => {
  it('「新規登録」に切りかえると表示名の欄が出て、「ログイン」に戻すと消える', async () => {
    const user = userEvent.setup()
    renderLogin()

    expect(screen.getByRole('heading', { level: 1, name: 'ログイン' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/表示名/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '新規登録' }))

    expect(screen.getByRole('heading', { level: 1, name: '新規登録' })).toBeInTheDocument()
    expect(screen.getByLabelText(/表示名/)).toBeInTheDocument()
    expect(screen.getByText('6 文字以上')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録してはじめる' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'ログイン' }))

    expect(screen.queryByLabelText(/表示名/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('メールアドレスとパスワードが空なら、ログインを呼ばずにエラーを出す', async () => {
    const user = userEvent.setup()
    const { signInWithEmail } = renderLogin()

    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(screen.getByRole('alert')).toHaveTextContent('メールアドレスとパスワードを入れてください')
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it('新規登録で表示名が空なら、登録を呼ばずにエラーを出す。タブを切りかえるとエラーは消える', async () => {
    const user = userEvent.setup()
    const { signUpWithEmail } = renderLogin()

    await user.click(screen.getByRole('radio', { name: '新規登録' }))
    await user.type(emailInput(), 'taro@example.com')
    await user.type(passwordInput(), 'secret123')
    await user.click(screen.getByRole('button', { name: '登録してはじめる' }))

    expect(screen.getByRole('alert')).toHaveTextContent('表示名を入れてください')
    expect(signUpWithEmail).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'ログイン' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ログイン: メールアドレスは前後の空白を取って渡す', async () => {
    const user = userEvent.setup()
    const { signInWithEmail, signUpWithEmail } = renderLogin()

    await user.type(emailInput(), '  taro@example.com ')
    await user.type(passwordInput(), 'secret123')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(signInWithEmail).toHaveBeenCalledWith('taro@example.com', 'secret123')
    expect(signUpWithEmail).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('新規登録: メールアドレス・パスワード・表示名を渡す', async () => {
    const user = userEvent.setup()
    const { signInWithEmail, signUpWithEmail } = renderLogin()

    await user.click(screen.getByRole('radio', { name: '新規登録' }))
    await user.type(screen.getByLabelText(/表示名/), 'たろう')
    await user.type(emailInput(), 'taro@example.com')
    await user.type(passwordInput(), 'secret123')
    await user.click(screen.getByRole('button', { name: '登録してはじめる' }))

    expect(signUpWithEmail).toHaveBeenCalledWith('taro@example.com', 'secret123', 'たろう')
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it('ログインに失敗したら、理由を画面に出して入力は残す', async () => {
    const user = userEvent.setup()
    renderLogin({
      signInWithEmail: vi.fn(async () => {
        throw new Error('メールアドレスかパスワードが違います')
      }),
    })

    await user.type(emailInput(), 'taro@example.com')
    await user.type(passwordInput(), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('メールアドレスかパスワードが違います')
    expect(emailInput()).toHaveValue('taro@example.com')
    expect(screen.queryByText('ホーム')).not.toBeInTheDocument()
  })

  it('ログイン済みになったら、もとのページ(既定はホーム)へ移る', async () => {
    renderLogin({ status: 'signedIn' })

    expect(await screen.findByText('ホーム')).toBeInTheDocument()
  })
})

describe('LoginPage(dev モード)', () => {
  it('表示名だけでログインする(メールアドレスの欄は出ない)', async () => {
    const user = userEvent.setup()
    const { signInDev } = renderLogin({ mode: 'dev' })

    expect(screen.queryByRole('textbox', { name: /メールアドレス/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: '新規登録' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(screen.getByRole('alert')).toHaveTextContent('表示名を入れてください')
    expect(signInDev).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/表示名/), 'たろう')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(signInDev).toHaveBeenCalledWith('たろう')
  })
})
