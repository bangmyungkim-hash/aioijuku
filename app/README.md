# あいおい塾 会員サイト

Next.js 15 + Supabase + Tailwind CSS で構築した学習塾向け会員管理システムです。

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router) + TypeScript
- **スタイル**: Tailwind CSS（ライトグリーンテーマ）
- **バックエンド/DB**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **ホスティング**: Vercel

## セットアップ手順

### 1. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて Supabase の接続情報を入力してください。

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開くと確認できます。

## ユーザーロール

| ロール | 説明 | ダッシュボード |
|--------|------|---------------|
| student | 生徒 | /student/dashboard |
| parent | 保護者 | /parent/dashboard |
| admin | 管理者（塾長・講師） | /admin/dashboard |
