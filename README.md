# Nego — frontend(UTTC 10期 ハッカソン / AIコース)

「次世代フリマアプリ」のフロントエンド。Vite + React + TypeScript。本番は Vercel。
バックエンドは別リポジトリ [hackathon-backend](https://github.com/panda2345pand-design/hackathon-backend)(FastAPI / Cloud Run)。

## 動かし方

```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm run build    # dist/
```

## デプロイ(Vercel)
1. https://vercel.com/new で GitHub の `hackathon-frontend` を選ぶ(Framework: Vite)
2. Environment Variables に `VITE_API_URL` = Cloud Run の URL を入れる
3. main に push すると自動デプロイ

## 方針
- 画面は `src/pages/`、部品は `src/components/`、API 呼び出しは `src/api/` にまとめる(ビジネスロジックはフロントに置かない。ID・金額の確定はバックエンド)
