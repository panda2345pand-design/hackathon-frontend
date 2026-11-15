import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderPage } from '../test/helpers'
import { OnboardingCard } from './OnboardingCard'

beforeEach(() => {
  window.localStorage.clear()
})

describe('OnboardingCard', () => {
  it('3 つの入口を出す。ログイン中で AI 交渉できる商品があれば、① はその商品へ行く', () => {
    renderPage(<OnboardingCard negotiableItemId="i7" />)

    expect(screen.getByRole('heading', { name: 'はじめての方へ:3つの AI を試す' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /1\. 買い手として試す/ })).toHaveAttribute('href', '/items/i7')
    expect(screen.getByRole('link', { name: /2\. 売り手として試す/ })).toHaveAttribute('href', '/sell')
    expect(screen.getByRole('link', { name: /3\. AI のしくみ/ })).toHaveAttribute('href', '/about-ai')
  })

  it('ログインしていなければ、① はログイン画面へ行く', () => {
    renderPage(<OnboardingCard negotiableItemId="i7" />, '/', { status: 'signedOut', user: null })

    expect(screen.getByRole('link', { name: /1\. 買い手として試す/ })).toHaveAttribute('href', '/login')
  })

  it('閉じると消え、次に開いたときも出さない', async () => {
    const user = userEvent.setup()
    const { unmount } = renderPage(<OnboardingCard negotiableItemId={null} />)

    await user.click(screen.getByRole('button', { name: '案内を閉じる' }))
    expect(screen.queryByText(/はじめての方へ/)).not.toBeInTheDocument()

    unmount()
    renderPage(<OnboardingCard negotiableItemId={null} />)
    expect(screen.queryByText(/はじめての方へ/)).not.toBeInTheDocument()
  })

  it('localStorage が使えなくても落ちない(案内は出て、閉じることもできる)', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderPage(<OnboardingCard negotiableItemId={null} />)

    await user.click(screen.getByRole('button', { name: '案内を閉じる' }))

    expect(screen.queryByText(/はじめての方へ/)).not.toBeInTheDocument()
  })
})
