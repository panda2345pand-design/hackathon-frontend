import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { renderPage } from './test/helpers'

describe('App(ページを分けて読み込む)', () => {
  it('ホーム以外のページは、読み込み中の表示のあとに中身が出る', async () => {
    renderPage(<App />, '/about-ai')

    // ページの JS を待つあいだも、ヘッダーと「読み込み中」は見えている
    expect(screen.getByRole('status', { name: 'ページを読み込んでいます' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 1, name: /AI/ })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'ページを読み込んでいます' })).not.toBeInTheDocument()
  })

  it('知らない URL は「見つかりません」のページになる', async () => {
    renderPage(<App />, '/no-such-page')

    expect(await screen.findByText('ページが見つかりません')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '商品をさがす' })).toBeInTheDocument()
  })
})
