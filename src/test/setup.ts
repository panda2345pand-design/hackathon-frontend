import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// findBy / waitFor の待ち時間を 1 秒 → 3 秒にする。CI や、ほかの処理と同時に走るときに、
// 画面の更新が 1 秒に間に合わずテストがたまに落ちた(2026-11-15、お知らせのベルのテスト)
configure({ asyncUtilTimeout: 3000 })

// jsdom に無いブラウザ API(Mantine が使う)を最小限だけ用意する
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
window.ResizeObserver = ResizeObserverStub
window.HTMLElement.prototype.scrollIntoView = () => {}
// Textarea の autosize がフォントの読み込みを待つために使う
Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: { addEventListener: () => {}, removeEventListener: () => {} },
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
