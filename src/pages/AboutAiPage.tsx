import { Badge, Group, List, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import {
  IconCategory,
  IconCoinYen,
  IconMessageDollar,
  IconPencil,
  IconShieldCheck,
  type Icon,
} from '@tabler/icons-react'
import { AiSourceBadge } from '../components/AiSourceBadge'

interface Feature {
  icon: Icon
  title: string
  where: string
  engine: string
  what: string
  note: string
}

const FEATURES: Feature[] = [
  {
    icon: IconPencil,
    title: '説明文を書く',
    where: '出品フォームの「AI で説明文を書く」',
    engine: 'Gemini(文章生成 AI)',
    what: '商品名・カテゴリ・状態・ブランドをもとに、説明文の下書きを作ります。',
    note: '下書きです。実物と違うところは、出品する前に自分で直してください。',
  },
  {
    icon: IconCoinYen,
    title: '適正価格の目安',
    where: '出品フォームの「AI に価格を聞く」/商品ページの「AI の適正価格の目安」',
    engine: '回帰モデル(機械学習)',
    what: '過去の出品データから学んだモデルが、商品名・カテゴリ・ブランド・状態から価格を予測し、目安の幅と理由を出します。',
    note: '「このAIの精度」を開くと、平均的な誤差(MAE)や決定係数(R²)、学習に使った件数を見られます。予測であって保証ではありません。',
  },
  {
    icon: IconShieldCheck,
    title: '出品できない物を止める',
    where: '出品フォームの「出品する」を押したとき',
    engine: 'キーワードの規則 + Gemini(二段構え)',
    what: 'まず禁止キーワードの規則で確認し、次に Gemini が内容を審査します。禁止されている物にあたると判断したときは出品を止め、理由を表示します。入力した内容は消えません。',
    note: '判断はサーバーで行います。画面側で勝手に通したり止めたりはしません。',
  },
  {
    icon: IconMessageDollar,
    title: '価格交渉を手伝う',
    where: '商品ページの「価格交渉する」',
    engine: '数字の規則(通りやすさ)+ Gemini(文面)',
    what: '希望額を入れると、通りやすさ(通りやすい/五分五分/通りにくい)、丁寧な文面の下書き、出品者側から見たヒントを出します。',
    note: '通りやすさは「希望額÷出品価格」と AI の目安価格から規則で決めています(交渉のデータから学習したものではありません)。文面は送る前に自由に直せます。承諾するかどうかを決めるのは出品者です。',
  },
  {
    icon: IconCategory,
    title: 'AI ジャンル・似ている商品',
    where: 'トップの「AI ジャンル」/商品ページの「似ている商品」',
    engine: 'KMeans クラスタリング(教師なし学習)',
    what: '人が決めたカテゴリとは別に、似た特徴の商品を AI が自動でグループに分けます。同じグループの商品を「似ている商品」として出します。',
    note: '正解ラベルなしでまとめているので、人の感覚と合わないグループができることもあります。',
  },
]

export function AboutAiPage() {
  return (
    <Stack gap="xl" maw={880} mx="auto">
      <div>
        <Title order={1} size="h2">
          AI のしくみ
        </Title>
        <Text mt="xs">
          Nego では、AI が出品者と購入者の「あいだ」に立ちます。どの機能で、どの AI が、何をしているのかをまとめました。
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {FEATURES.map((feature) => (
          <Paper key={feature.title} withBorder p="lg" component="section" aria-label={feature.title}>
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon variant="light" size={40} radius="md" aria-hidden>
                <feature.icon size={22} stroke={1.6} />
              </ThemeIcon>
              <div>
                <Title order={2} size="h4">
                  {feature.title}
                </Title>
                <Badge variant="light" mt={6} style={{ maxWidth: '100%' }}>
                  {feature.engine}
                </Badge>
              </div>
            </Group>
            <Text size="sm" mt="md">
              {feature.what}
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              使う場所:{feature.where}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {feature.note}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder p="lg" component="section" aria-labelledby="honest-heading">
        <Title order={2} size="h4" id="honest-heading">
          正直に表示すること
        </Title>
        <List size="sm" spacing="sm" mt="md">
          <List.Item>
            Gemini につながらないとき(キーが無い・失敗した)は、あらかじめ用意した定型文を返します。そのときは必ず{' '}
            <AiSourceBadge source="fallback" /> と表示し、AI が書いたようには見せません。
          </List.Item>
          <List.Item>
            価格予測モデルがつながっていないときは、適正価格の目安の欄に「未接続」と表示し、数字は出しません。
          </List.Item>
          <List.Item>
            購入金額・商品 ID・交渉の成立などの確定は、すべてサーバーが行います。AI も画面も、金額を勝手に決めません。
          </List.Item>
          <List.Item>
            AI の文章や数字は参考です。出品するか、いくらにするか、交渉を受けるかを決めるのは、いつも利用者です。
          </List.Item>
        </List>
      </Paper>
    </Stack>
  )
}
