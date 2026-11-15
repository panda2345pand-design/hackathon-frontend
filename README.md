# Nego(仮)— frontend

[![CI](https://github.com/panda2345pand-design/hackathon-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/panda2345pand-design/hackathon-frontend/actions/workflows/ci.yml)

UTTC 10期 ハッカソン(AIコース)の課題「次世代フリマアプリ」のフロントエンド。作者:水谷 風賀。

コンセプトは **「AI が売り手と買い手のあいだに立つフリマ」**。

- 出品するとき:AI が説明文を書き、機械学習モデルが適正価格の目安を出し、出品できない物は止める
- 買うとき:**AI 同士の価格交渉**。買い手は「出せる上限」、売り手は「最低価格」を自分の AI にだけ伝え、2 つの AI が最大 4 往復で金額を決める(合意と金額は数字の規則、せりふだけ Gemini)。自分で文面を書いて提案する交渉もできる
- 写真:出品するときに写真を選ぶと、ブラウザで小さくしてから送り、AI が写真から商品名などを入力する
- お知らせ:交渉が届いた・売れた・AI が代わりに合意した、をヘッダーのベルに出す(AI ではない)
- 商品ページ:適正価格の目安とその理由、AI がまとめた「似ている商品」を出す

| | URL |
|---|---|
| アプリ | https://hackathon-frontend-smoky-xi.vercel.app |
| API の一覧(OpenAPI) | https://hackathon-backend-651327414604.asia-northeast1.run.app/docs |
| バックエンドのリポジトリ | [hackathon-backend](https://github.com/panda2345pand-design/hackathon-backend)(FastAPI / Cloud Run) |

Vite + React 19 + TypeScript + React Router + Mantine。本番は Vercel。
設計の判断、機械学習の数字、限界は、バックエンドの README にまとめてある。API の仕様はバックエンド側の `docs/api.md` が正。

## 60 秒で試す

登録は要らない。ログイン画面に、お試し用の共用アカウントで入るボタンが 2 つある。

1. https://hackathon-frontend-smoky-xi.vercel.app を開き、「ログイン」を押す
2. **「買い手として試す」** を押す
3. 「ノースフェイス マウンテンパーカー 黒 Lサイズ」を開く(売り切れていたら、ほかのどの商品でもよい)
4. 「AI の適正価格の目安」に、金額・幅・「この目安になった理由」が出る。「このAIの精度」を開くと誤差(MAE)と決定係数(R²)が出る
5. 「AI 交渉可」の印がある商品を開き、「AI に交渉を任せる」を押して上限を入れる → 2 つの AI のやりとりが 1 個ずつ出て、合意額(または不成立)と決め方が出る。合意したら「この金額で購入する」
6. 「価格交渉する」を押して希望額を入れる → 通りやすさの目安と、出品者に送る文面の下書きが出る
7. ログアウトして、ログイン画面で **「売り手として試す」** を押す
8. 「出品する」で、写真を選んで「写真から入力する」、「AI で説明文を書く」、「AI に価格を聞く」を試す。「AI 交渉の最低価格」を入れると、その商品は AI 同士の交渉ができるようになる
9. 商品名に「スーパーコピー」などを入れて出品すると、理由つきで止められる(入力した内容は消えない)
10. 「AI のしくみ」のページに、どの機能でどの AI が何をしているかをまとめてある

お試し用アカウントはほかの人も同じものを使うので、商品が売り切れていたり、見覚えのない交渉が届いていたりすることがある。

## 画面

| パス | 画面 | 内容 |
|---|---|---|
| `/` | ホーム | はじめての方への案内、検索、カテゴリ、「AI ジャンル」のチップ、商品の一覧 |
| `/items/:id` | 商品ページ | 商品、AI の適正価格の目安と理由、購入、AI 同士の交渉、価格交渉、似ている商品。出品者には届いた交渉(承諾・見送り)、最低価格の変更、AI が代わりに交渉した記録 |
| `/sell` | 出品 | 出品フォーム。写真の選択と写真からの入力、AI の説明文と価格、AI 交渉の最低価格、出品できない物の理由の表示 |
| `/me` | マイページ | 出品した商品/購入した商品/出した価格交渉 |
| `/about-ai` | AI のしくみ | どの機能でどの AI が何をしているか、正直に表示すること |
| `/login` | ログイン | ログイン・新規登録・お試し用アカウント |

`/sell` と `/me` はログインが必要。

## 動かし方

```bash
npm install
cp .env.example .env   # 必要なら中身を直す
npm run dev            # http://localhost:5173
```

バックエンドを `http://localhost:8000` で動かしておく(バックエンドの README の「動かし方」)。

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック(`tsc -b`)+ 本番ビルド(`dist/`) |
| `npm run lint` | oxlint |
| `npm run typecheck` | 型チェックだけ(`tsc -b`) |
| `npm test` | Vitest + React Testing Library(1 回だけ実行) |
| `npm run preview` | ビルド結果の確認 |

## 環境変数

| 名前 | 既定 | 内容 |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | バックエンドの URL。Vercel では Cloud Run の URL |
| `VITE_AUTH_MODE` | `dev` | 認証モード。`dev` か `firebase`。バックエンドの `AUTH_MODE` とそろえる |
| `VITE_FIREBASE_API_KEY` ほか 5 つ | (空) | `firebase` モードのときだけ必要。`AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID` |
| `VITE_DEMO_BUYER_EMAIL` / `VITE_DEMO_SELLER_EMAIL` / `VITE_DEMO_PASSWORD` | (空) | お試し用アカウント。3 つそろっているときだけ、ログイン画面にボタンを出す |

- `.env` は git に入れない(`.gitignore` 済み)。項目の一覧は `.env.example`。
- `.env.production` だけは git に入れている。本番ビルド用の値で、どれもブラウザに配られる前提のもの(お試し用アカウントは、だれでも使える共用アカウント)。

## 認証の 2 つのモード

### `dev`(既定。ローカルとテスト用)
- ログイン画面で表示名だけを入れる。名前から uid を作り(半角英数字はそのまま、日本語などは文字コードに置きかえて ASCII にする)、API には `Authorization: Bearer dev:<uid>` を送る
- ログインしたら `POST /auth/register {name}` を呼ぶ。ログイン情報は localStorage に保存する
- 同じ名前を入れると同じユーザーになる(パスワードなし。本番では使わない)

### `firebase`(本番)
- Firebase Authentication のメール+パスワード(新規登録・ログイン・ログアウト)
- API には `await user.getIdToken()` の ID トークンを送る。バックエンドがこのトークンを署名検証する
- 新規登録のときに表示名を聞き、`POST /auth/register {name}` を呼ぶ。2 回目からは `GET /me` で読み、未登録(404)なら登録する
- Firebase の SDK は、このモードのときだけ読み込む(別チャンク)
- お試し用アカウントのボタンは、このモードのときだけ出る

## フォルダ構成

```
src/
├── main.tsx            入口(Mantine・ルーター・認証の Provider)
├── App.tsx             ルートの一覧
├── config.ts           環境変数の読み取り
├── theme.ts            Mantine のテーマ(メインカラーは 1 色)
├── types.ts            API の型(docs/api.md に対応)
├── api/
│   ├── client.ts       fetch の薄いラッパー(トークン付与、エラーを ApiError に)
│   └── index.ts        エンドポイントごとの型つき関数
├── auth/
│   ├── context.ts      AuthContext と useAuth
│   ├── AuthProvider.tsx  2 つのモードをまとめる
│   ├── devAuth.ts      dev モード(uid の作り方、localStorage)
│   ├── firebaseAuth.ts firebase モード(動的に読み込む)
│   ├── authErrors.ts   Firebase のエラーを日本語に
│   └── RequireAuth.tsx ログインが必要なページの入口
├── pages/
│   ├── HomePage.tsx        /            検索・カテゴリ・AI ジャンル・商品の一覧
│   ├── ItemDetailPage.tsx  /items/:id   商品・適正価格の目安・購入・価格交渉・届いた交渉
│   ├── SellPage.tsx        /sell        出品フォーム(AI の説明文・価格、出品禁止の表示)
│   ├── MyPage.tsx          /me          出品した商品 / 購入した商品 / 出した価格交渉
│   ├── AboutAiPage.tsx     /about-ai    AI のしくみ
│   ├── LoginPage.tsx       /login
│   └── NotFoundPage.tsx
├── components/         ItemCard, ItemImage(写真なしのときの面), PriceEstimatePanel,
│                       AutoNegotiateModal(AI 同士の交渉), NegotiationTranscript(やりとりの吹き出し),
│                       SellerNegotiationPanel(最低価格と交渉の記録), ImagePicker(写真), NotificationBell(お知らせ),
│                       OnboardingCard(はじめての方へ), NegotiateModal, PurchaseModal, OffersPanel, AiSourceBadge, AppLayout など
├── lib/                format(金額・日付), labels(カテゴリ・状態の日本語名), errors(通知), useApi(読み込みフック),
│                       image(写真を小さくする), negotiation(上限の初期値), motion(動きを減らす設定)
└── test/               テストの共通準備
```

## 方針

- **ビジネスロジックはフロントに置かない。** ID・購入金額・交渉の成立はすべてバックエンドが決める。画面は API の値を出すだけ
- **AI の出どころを正直に出す。** 応答の `source` が `fallback` のときは「AI 未接続(定型文)」、価格モデルが `available=false` のときは「未接続」と表示する
- **写真が無い・読み込めないときは、カテゴリごとに決まった色とアイコンの面を出す**(`src/components/ItemImage.tsx`)。見本データの AI が作った画像(`image_ai_generated`)には、「AI 画像」「実物の写真ではありません」と表示する
- **写真は送る前にブラウザで小さくする。** 長い辺 1280px・JPEG にしてから送る(`src/lib/image.ts`)。サーバーの上限(2MB)に収まり、撮影場所などの情報も落ちる
- **あとから足した API の項目は「無いかもしれない」として扱う。** `auto_negotiation` などが無い古い応答でも、今までどおり表示する(テストで確かめている)
- **動きを減らす設定(prefers-reduced-motion)の人には、AI 同士のやりとりを最初から全部見せる。** 「すべて表示」でいつでも飛ばせる
- エラーは API の `detail.message` をそのまま通知に出す。読み込み中はスケルトン、0 件のときは次の行動つきの空状態を出す
- スマホ幅(390px)を先に作り、PC 幅に広げる
- **カテゴリと状態は表示だけ日本語にする。** 元データ(米国メルカリ)は英語なので、`src/lib/labels.ts` の対応表で `Women` →「レディース」、`Like new` →「未使用に近い」と見せる。API に送る値と URL の絞り込み条件は英語のまま。対応表に無い値はそのまま出す。AI ジャンルは API の `label_ja` があればそれを、無ければ `label` を出す。商品名・説明文・ブランドは出品データそのものなので訳さない
- **トークンは使い回さない。** Firebase の ID トークンは 1 時間で切れるので、API を呼ぶたびに SDK の `getIdToken()` から取り直す(期限が近ければ SDK が自動で更新する)。`src/auth/firebaseToken.test.ts` で確かめている
- **日付は日本時間で表示する。** サーバーの日時は UTC なので、画面で日本時間に直す(`src/lib/format.ts`)

## 最初に読み込む JS を減らした

- ホーム以外のページは、開いたときにはじめて読み込む(`src/App.tsx` の `React.lazy`)。Firebase の SDK も別のファイルに分けている
- 最初に読み込む JS は 672.55 kB → 約 469 kB(gzip 208.78 kB → 約 146 kB)
- ページの JS を読み込んでいるあいだは、ヘッダーを出したまま「ページを読み込んでいます」を表示する

## テストと CI

- Vitest + React Testing Library で 118 件(18 ファイル)。API クライアント、Firebase トークンの取り直し、金額と日付の表示、日本語ラベル、ホーム、ログイン画面(お試し用アカウントのボタンを含む)、出品(最低価格・写真・写真からの入力)、マイページ、購入の確認、価格交渉のモーダル、AI 同士の交渉(合意・不成立・エラーコード・購入への引き継ぎ)、商品ページ(買い手・出品者・古い応答)、お知らせのベル、はじめての方への案内
- 新しい API(AI 同士の交渉・写真・お知らせ)は、`docs/api-next.md` の取り決めどおりの応答を返す fetch の差しかえでテストしている
- GitHub Actions(`.github/workflows/ci.yml`)が、main への push とプルリクエストごとに `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` を実行する。結果はこのページの先頭のバッジ

## 正直な限界

- 元のデータセットに商品の写真は無い。見本の商品の画像は AI が作ったイメージで、画面にそう表示している。画像が無い商品にはカテゴリごとのアイコンを出している
- AI 同士の交渉の金額は、決まった幅で歩み寄る単純な規則で決まる(相手の出方を読むような交渉はしない)
- 価格の目安は米国メルカリのデータを 1 USD = 150 円の固定で換算したもので、日本の相場とは合わない
- 商品名とブランドは元データの英語のまま(日本語にしているのはカテゴリ・状態・AI ジャンルの表示だけ)
- 決済は無い。「購入を確定する」は注文の記録を作るだけ
- 機械学習の精度や交渉の規則の限界は、バックエンドの README の「正直な限界」に書いてある

## AI の使い方

- このリポジトリのコードの多くは、AI のコーディングアシスタント(Claude Code)を使って書いた。作るものと方針は作者が決めて指示した
- AI と書いたコミットには、コミットメッセージに `Co-Authored-By` を残している

## デプロイ(Vercel)

1. https://vercel.com/new で GitHub の `hackathon-frontend` を選ぶ(Framework: Vite)
2. Environment Variables に `VITE_API_URL`(Cloud Run の URL)、`VITE_AUTH_MODE=firebase`、`VITE_FIREBASE_*` を入れる
3. main に push すると自動デプロイ(`vercel.json` で全パスを `index.html` に書きかえ、SPA のルートを直接開けるようにしている)
