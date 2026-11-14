import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/helpers'
import { ItemImage } from './ItemImage'

describe('ItemImage', () => {
  it('写真を読み込めなかったら、カテゴリのアイコンの面に切りかえる', () => {
    renderPage(<ItemImage title="植木鉢" category="Garden & Outdoor" imageUrl="https://api.example/images/gone" />)

    fireEvent.error(screen.getByRole('img', { name: '植木鉢' }))

    expect(screen.getByRole('img', { name: '植木鉢(写真なし・ガーデン・屋外)' })).toBeInTheDocument()
  })
})
