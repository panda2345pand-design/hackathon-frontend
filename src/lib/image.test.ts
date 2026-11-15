import { describe, expect, it } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  it('長い辺を 1280px に合わせ、縦横の比を保つ', () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 })
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 })
  })

  it('もともと小さい画像は拡大しない', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })

  it('極端に細長くても 1px 未満にしない', () => {
    expect(fitWithin(10000, 2, 1280)).toEqual({ width: 1280, height: 1 })
  })
})
