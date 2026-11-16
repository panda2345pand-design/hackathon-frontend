import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  createTheme,
  Drawer,
  Input,
  InputWrapper,
  Menu,
  Modal,
  Notification,
  Paper,
  SegmentedControl,
  Skeleton,
  Tabs,
  ThemeIcon,
  type MantineColorsTuple,
} from '@mantine/core'

// ─────────────────────────────────────────────────────────────────────────────
// Nego の見た目の決まり(デザインの「トークン」)をここ 1 か所にまとめる。
// 値はランディングページ(public/welcome/index.html と assets/system.css)から取った。
// ページごとに色や角丸を書かず、部品(Button・Paper など)がここから受け継ぐようにしている。
// ─────────────────────────────────────────────────────────────────────────────

// メインカラー(深い緑)。8 番目(nego.8)がランディングのボタンと同じ #02765D。
// 白い文字とのコントラスト比は約 5.7:1 で、読みやすさの基準(AA = 4.5:1)を満たす。
// 0〜2 はランディングの淡い緑の面(#e9f5f1 / #e3f3ee / #d3ece4)、9 は緑の文字色(#0b5c4a)。
const nego: MantineColorsTuple = [
  '#e9f5f1',
  '#e3f3ee',
  '#d3ece4',
  '#a8d8c9',
  '#79c3ac',
  '#4dab91',
  '#2a9478',
  '#128268',
  '#02765d',
  '#0b5c4a',
]

// 灰色。Mantine の既定は青みがかった灰色なので、ランディングの文字色(インク #1f2421)に寄せた
// 温かい灰色に置きかえる。3 = 枠線(#dcdedc)、6 = 控えめな文字(#646764。地の色の上で 5.6:1)、9 = インク。
const gray: MantineColorsTuple = [
  '#f5f5f3',
  '#eeeeec',
  '#e6e7e4',
  '#dcdedc',
  '#c9ccc9',
  '#8a8d8a',
  '#646764',
  '#4d514e',
  '#353a37',
  '#1f2421',
]

/** 文字の書体。英数字は Instrument Sans、日本語は端末に入っている日本語の書体に落とす(ランディングと同じ順番) */
const FONT_TEXT =
  '"Instrument Sans", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, system-ui, sans-serif'
/** 等幅の書体(型番や小さな数字のラベル用) */
const FONT_MONO = '"DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'

export const theme = createTheme({
  primaryColor: 'nego',
  // 8 番目を「主の色」にする。塗りのボタンがちょうど #02765D になる
  primaryShade: 8,
  colors: { nego, gray },
  // 真っ黒(#000)は使わない。文字はランディングと同じインク色
  black: '#1f2421',
  white: '#ffffff',

  fontFamily: FONT_TEXT,
  fontFamilyMonospace: FONT_MONO,
  // 13px より小さい文字は使わない(ランディングの決まり)。日本語が詰まらないように行間は広め
  fontSizes: { xs: '0.8125rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  lineHeights: { xs: '1.5', sm: '1.55', md: '1.65', lg: '1.6', xl: '1.5' },
  headings: {
    fontFamily: FONT_TEXT,
    // 大きい見出しは太さ 500(ランディングと同じ)。小さい見出しは本文と区別がつくように 600
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.25' },
      h2: { fontSize: '1.75rem', lineHeight: '1.3' },
      h3: { fontSize: '1.375rem', lineHeight: '1.4', fontWeight: '600' },
      h4: { fontSize: '1.125rem', lineHeight: '1.45', fontWeight: '600' },
    },
  },

  // 角丸は「round」(一般の人向けアプリ)。ランディングの 10 / 16 / 24 をそのまま使う
  radius: { xs: '6px', sm: '10px', md: '16px', lg: '24px', xl: '999px' },
  defaultRadius: 'md',
  // 間隔は 4, 8, 12, 16, 24, 32 の決まった段(ランディングの --s-1〜--s-6 と同じ)
  spacing: { xs: '8px', sm: '12px', md: '16px', lg: '24px', xl: '32px' },
  // 影はうすく。カードは細い枠線が主役で、影はほんの少し浮かせるだけ
  shadows: {
    xs: '0 1px 2px rgb(31 36 33 / 0.05)',
    sm: '0 1px 2px rgb(31 36 33 / 0.06), 0 6px 16px -8px rgb(31 36 33 / 0.12)',
    md: '0 1px 2px rgb(31 36 33 / 0.06), 0 14px 32px -18px rgb(31 36 33 / 0.28)',
    lg: '0 2px 4px -1px rgb(31 36 33 / 0.06), 0 12px 24px -8px rgb(31 36 33 / 0.12), 0 32px 64px -24px rgb(31 36 33 / 0.2)',
    xl: '0 2px 4px -1px rgb(31 36 33 / 0.08), 0 16px 32px -8px rgb(31 36 33 / 0.16), 0 40px 80px -24px rgb(31 36 33 / 0.24)',
  },
  // キーボードで選んだときだけ、緑の輪(2px)を出す
  focusRing: 'auto',

  components: {
    // ボタン: 丸い「ピル」の形で高さ 44px(スマホで押しやすい大きさ)。
    // variant="default"(2 番目のボタン)は、枠線なしのうすい灰色の面にする(ランディングの「tonal」)。
    Button: Button.extend({
      defaultProps: { radius: 'xl', size: 'md' },
      vars: (_theme, props) => {
        if (props.variant === 'default') {
          return {
            root: {
              '--button-bg': 'var(--nego-tonal)',
              '--button-hover': 'var(--nego-tonal-hover)',
              '--button-bd': '1px solid transparent',
              '--button-color': 'var(--nego-ink)',
            },
          }
        }
        return { root: {} }
      },
    }),

    // カードと面: 白い面 + 細い枠線 + 角丸 16px
    Card: Card.extend({ defaultProps: { radius: 'md', shadow: 'xs' } }),
    Paper: Paper.extend({ defaultProps: { radius: 'md' } }),

    // ラベル: 角の小さい札(ランディングの画面の中の札と同じ)。日本語やブランド名を勝手に大文字にしない
    Badge: Badge.extend({
      defaultProps: { radius: 'xs' },
      styles: { label: { textTransform: 'none' }, root: { fontWeight: 500, letterSpacing: 0 } },
    }),

    // 入力欄: 高さ 44px・文字 16px(スマホで勝手に拡大されない大きさ)・角丸 10px
    Input: Input.extend({ defaultProps: { radius: 'sm', size: 'md' } }),
    InputWrapper: InputWrapper.extend({
      defaultProps: { size: 'md' },
      // ラベルは 14px・太さ 500、説明は 13px
      styles: {
        label: { fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, marginBottom: 4 },
        description: { fontSize: 'var(--mantine-font-size-xs)', lineHeight: 1.5 },
        error: { fontSize: 'var(--mantine-font-size-xs)' },
      },
    }),

    Modal: Modal.extend({
      defaultProps: { radius: 'lg', shadow: 'xl', padding: 'lg', overlayProps: { backgroundOpacity: 0.4, color: '#1f2421' } },
      styles: { title: { fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' } },
    }),
    Drawer: Drawer.extend({
      defaultProps: { overlayProps: { backgroundOpacity: 0.4, color: '#1f2421' } },
      styles: { title: { fontWeight: 600 } },
    }),

    // タブ: 選んでいるタブをインク色のピルにする(ランディングのタブの決まり)。色は index.css
    Tabs: Tabs.extend({ defaultProps: { variant: 'pills', radius: 'xl' } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'xl', size: 'md' } }),
    Chip: Chip.extend({ defaultProps: { radius: 'xl' } }),

    Menu: Menu.extend({ defaultProps: { radius: 'md', shadow: 'lg' } }),
    Notification: Notification.extend({ defaultProps: { radius: 'md', withBorder: true } }),
    Alert: Alert.extend({
      defaultProps: { radius: 'md' },
      styles: { title: { fontWeight: 600 }, message: { lineHeight: 1.6 } },
    }),
    ThemeIcon: ThemeIcon.extend({ defaultProps: { radius: 'xl' } }),
    Skeleton: Skeleton.extend({ defaultProps: { radius: 'sm' } }),
  },
})
