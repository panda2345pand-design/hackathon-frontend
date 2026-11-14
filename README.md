# Nego — frontend(UTTC 10期 ハッカソン / AIコース)

「次世代フリマアプリ」のフロントエンド。コンセプトは **「AI が出品者と購入者のあいだに立つ」**。

- 出品するとき:AI が説明文を書き、機械学習モデルが適正価格の目安を出し、出品できない物は止める
- 買うとき:AI が価格交渉(通りやすさの目安と、丁寧な文面)を手伝う
- 商品ページ:適正価格の目安とその理由、AI がまとめた「似ている商品」を出す

Vite + React 19 + TypeScript + React Router + Mantine。本番は Vercel。
バックエンドは別リポジトリ [hackathon-backend](https://github.com/panda2345pand-design/hackathon-backend)(FastAPI / Cloud Run)。API の仕様はバックエンド側の `docs/api.md` が正。

## 動かし方

```bash
npm install
cp .env.example .env   # 必要なら中身を直す
npm run dev            # http://localhost:5173
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック(`tsc -b`)+ 本番ビルド(`dist/`) |
| `npm run lint` | oxlint |
| `npm test` | Vitest + React Testing Library(1 回だけ実行) |
| `npm run preview` | ビルド結果の確認 |

## 環境変数

| 名前 | 既定 | 内容 |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | バックエンドの URL。Vercel では Cloud Run の URL |
| `VITE_AUTH_MODE` | `dev` | 認証モード。`dev` か `firebase`。バックエンドの `AUTH_MODE` とそろえる |
| `VITE_FIREBASE_API_KEY` ほか 5 つ | (空) | `firebase` モードのときだけ必要。`AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID` |

`.env` は git に入れない(`.gitignore` 済み)。項目の一覧は `.env.example`。

## 認証の 2 つのモード

### `dev`(既定。ローカルとテスト用)
- ログイン画面で表示名だけを入れる。名前から uid を作り(半角英数字はそのまま、日本語などは文字コードに置きかえて ASCII にする)、API には `Authorization: Bearer dev:<uid>` を送る
- ログインしたら `POST /auth/register {name}` を呼ぶ。ログイン情報は localStorage に保存する
- 同じ名前を入れると同じユーザーになる(パスワードなし。本番では使わない)

### `firebase`(本番)
- Firebase Authentication のメール+パスワード(新規登録・ログイン・ログアウト)
- API には `await user.getIdToken()` の ID トークンを送る
- 新規登録のときに表示名を聞き、`POST /auth/register {name}` を呼ぶ。2 回目からは `GET /me` で読み、未登録(404)なら登録する
- Firebase の SDK は、このモードのときだけ読み込む(別チャンク)

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
│                       NegotiateModal, PurchaseModal, OffersPanel, AiSourceBadge, AppLayout など
├── lib/                format(金額・日付), labels(カテゴリ・状態の日本語名), errors(通知), useApi(読み込みフック)
└── test/               テストの共通準備
```

## 方針

- **ビジネスロジックはフロントに置かない。** ID・購入金額・交渉の成立はすべてバックエンドが決める。画面は API の値を出すだけ
- **AI の出どころを正直に出す。** 応答の `source` が `fallback` のときは「AI 未接続(定型文)」、価格モデルが `available=false` のときは「未接続」と表示する
- **商品写真は外から借りない。** `image_url` が空のときは、カテゴリごとに決まった色とアイコンの面を出す
- エラーは API の `detail.message` をそのまま通知に出す。読み込み中はスケルトン、0 件のときは次の行動つきの空状態を出す
- スマホ幅(390px)を先に作り、PC 幅に広げる
- **カテゴリと状態は表示だけ日本語にする。** 元データ(米国メルカリ)は英語なので、`src/lib/labels.ts` の対応表で `Women` →「レディース」、`Like new` →「未使用に近い」と見せる。API に送る値と URL の絞り込み条件は英語のまま。対応表に無い値はそのまま出す。AI ジャンルは API の `label_ja` があればそれを、無ければ `label` を出す。商品名・説明文・ブランドは出品データそのものなので訳さない
- **ホーム以外のページは開いたときに読み込む**(`App.tsx` の `React.lazy`)。最初に読み込む JS は 672.55 kB → 461.04 kB(gzip 208.78 kB → 143.83 kB)
- **トークンは使い回さない。** Firebase の ID トークンは 1 時間で切れるので、API を呼ぶたびに SDK の `getIdToken()` から取り直す(期限が近ければ SDK が自動で更新する)。`src/auth/firebaseToken.test.ts` で確かめている

## デプロイ(Vercel)

1. https://vercel.com/new で GitHub の `hackathon-frontend` を選ぶ(Framework: Vite)
2. Environment Variables に `VITE_API_URL`(Cloud Run の URL)、`VITE_AUTH_MODE=firebase`、`VITE_FIREBASE_*` を入れる
3. main に push すると自動デプロイ(`vercel.json` で全パスを `index.html` に書きかえ、SPA のルートを直接開けるようにしている)
