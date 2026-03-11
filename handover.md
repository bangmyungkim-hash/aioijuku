# あいおい塾 会員サイト — 引き継ぎプロンプト

## あなたの役割
あなたはあいおい塾（学習塾）の会員サイト開発をサポートするアシスタントです。
ユーザー（Kuniakiさん）はプログラミング初心者です。専門用語はわかりやすく説明し、1ステップずつ丁寧に進めてください。

---

## プロジェクト概要
- **サービス名**: あいおい塾 会員サイト
- **目的**: 生徒の学習習慣をゲーミフィケーションで促進、保護者との情報共有、管理業務の効率化
- **デザイン**: ライトグリーン（brand-green）を基調とした温かみのあるUI

---

## 技術スタック（確定済み）
| 役割 | サービス |
|------|---------|
| フロントエンド・バックエンド | Next.js 15（App Router、TypeScript、Tailwind CSS） |
| データベース | Supabase（PostgreSQL、RLS、Auth） |
| ホスティング | Vercel（GitHub連携、自動デプロイ） |
| ドメイン・DNS | Xserver（共有レンタルサーバー、Node.js不可のためDNSのみ使用） |
| バージョン管理 | GitHub（リポジトリ: bangmyungkim-hash/aioijuku） |

---

## インフラ構成
```
ユーザー → Xserver（DNS） → Vercel（Next.jsアプリ） ↔ Supabase（DB）
```
- Xserverは**ドメイン管理のみ**。アプリはVercel、DBはSupabaseで動作。

---

## Coworkフォルダ構成（直接編集可能）
- `C:\Users\Owner\Documents\GitHub\aioijuku\` — GitHubリポジトリ（**直接編集・コミット可**）
- `C:\Users\Owner\Documents\（aioijuku作業フォルダ）\` — 提案書・スキーマなどの補助ファイル

**GitHub Desktop で変更をコミット → Push すれば Vercel が自動デプロイ（約1〜3分）。**

---

## 現在の状態（✅ すべて完了・デプロイ済み）

### データベース（Supabase）
- プロジェクト名: `aioijuku`（東京リージョン）
- schema.sql 実行済み（18テーブル、RLS、RPC関数、トリガーすべて設定済み）
- テストユーザー作成済み:
  - `admin@test.com` / `TestPass123!` → role: admin
  - `parent@test.com` / `TestPass123!` → role: parent（山田 花子）
  - `student@test.com` / `TestPass123!` → role: student（山田 一郎）
- 保護者↔生徒リンク: `parent_student_links` テーブルに登録済み
- **RLSポリシー追加済み**（後述）

### GitHub
- リポジトリ: `https://github.com/bangmyungkim-hash/aioijuku`
- ブランチ: main（最新コミット済み）

### Vercel
- プロジェクト: `aioijuku`
- URL: **https://aioijuku.vercel.app** ← 現在公開中・動作確認済み
- Root Directory: `app`
- 環境変数設定済み:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

### 動作確認済みページ
| ページ | URL | 状態 |
|--------|-----|------|
| ログイン | /login | ✅ |
| 管理者ダッシュボード | /admin/dashboard | ✅ |
| 会員管理 | /admin/members | ✅ |
| 出欠管理（カレンダー表示あり） | /admin/attendance | ✅ |
| QRコード管理 | /admin/qrcode | ✅ |
| 成績管理 | /admin/grades | ✅ |
| 面談記録 | /admin/meetings | ✅ |
| カレンダー管理 | /admin/calendar | ✅ |
| お知らせ管理 | /admin/announce | ✅ |
| 保護者ダッシュボード（生徒名表示）| /parent/dashboard | ✅ |
| 欠席・遅刻連絡 | /parent/absence | ✅ |
| 通知設定 | /parent/notifications | ✅ |
| 生徒ダッシュボード | /student/dashboard | ✅ |
| 学習管理 | /student/learning | ✅ |
| 成績管理（グラフ） | /student/grades | ✅ |
| QRチェックイン | /checkin | ✅ |
| カレンダー（共通） | /calendar | ✅ |
| お知らせ（共通） | /announcements | ✅ |
| ログアウト | /api/auth/logout | ✅ |

---

## 実装済みファイル（app/src/ 以下）
```
app/src/
├── middleware.ts                              ✅ 認証ミドルウェア
├── lib/supabase/
│   ├── client.ts                             ✅ ブラウザ用クライアント
│   └── server.ts                             ✅ サーバー用クライアント
└── app/
    ├── layout.tsx                            ✅ ルートレイアウト
    ├── page.tsx                              ✅ ルートページ（ロール別リダイレクト）
    ├── globals.css                           ✅ グローバルCSS・共通クラス
    ├── (auth)/login/page.tsx                 ✅ ログイン画面
    ├── checkin/page.tsx                      ✅ QRスキャン入退室処理
    ├── admin/
    │   ├── dashboard/page.tsx                ✅ 管理者ダッシュボード
    │   ├── members/page.tsx                  ✅ 会員管理
    │   ├── attendance/page.tsx               ✅ 出欠管理（月次カレンダービュー付き）
    │   ├── qrcode/page.tsx                   ✅ QRコード管理
    │   ├── grades/page.tsx                   ✅ 成績管理
    │   ├── meetings/page.tsx                 ✅ 面談記録
    │   ├── calendar/page.tsx                 ✅ カレンダー管理
    │   └── announce/page.tsx                 ✅ お知らせ管理
    ├── parent/
    │   ├── dashboard/page.tsx                ✅ 保護者ダッシュボード（生徒名・統計表示）
    │   ├── student/[id]/page.tsx             ✅ お子様の学習状況詳細
    │   ├── absence/page.tsx                  ✅ 欠席・遅刻連絡フォーム
    │   └── notifications/page.tsx            ✅ 通知設定
    ├── student/
    │   ├── dashboard/page.tsx                ✅ 生徒ダッシュボード（Server Action）
    │   ├── learning/page.tsx                 ✅ 学習管理
    │   └── grades/page.tsx                   ✅ 成績管理（グラフ）
    ├── calendar/page.tsx                     ✅ カレンダー（全ロール共通）
    ├── announcements/page.tsx                ✅ お知らせ一覧（全ロール共通）
    └── api/
        ├── auth/logout/route.ts              ✅ ログアウト（303リダイレクト）
        └── learning/start/route.ts           ✅ 学習開始API
```

---

## これまでに解決したバグ（参考）

| バグ | 原因 | 解決策 |
|------|------|--------|
| VercelビルドエラーTypeScript型エラー | `as { full_name: string }` の型変換エラー | `as unknown as { full_name: string }` に変更 |
| VercelビルドエラーimplicitAny | `cookiesToSet` に型なし | `type CookieToSet = {...}` を定義して明示的に型付け |
| ログアウトでHTTP 405エラー | POSTリクエストが307リダイレクト（POSTのまま）でログインに送られる | `status: 303` でSee Otherリダイレクトに変更 |
| 学習開始ボタンでJSONが表示 | `<form action="/api/...">` でブラウザがAPIレスポンスを表示 | `"use server"` Server Actionに変更 |
| 保護者ダッシュボードで生徒名が「—」 | `users` テーブルのRLSでJOIN結果がnullになる | 別クエリで生徒名を取得 + RLSポリシー追加 |

---

## 重要な実装メモ

### Supabase RPC関数
- `record_learning_start(p_student_id)` — 学習開始時に呼び出し。累積日数・連続日数・復活回数を自動更新
- `checkin_by_qr(p_token, p_student_id)` — QRコードでの入退室処理
  - 1回目スキャン → `check_in`（入室記録）
  - 2回目スキャン → `check_out`（退室記録）
  - 3回目以降 → エラー `already_checked_out`
- `my_role()` — 現在のユーザーのロールを返すヘルパー関数

### Supabase RLSポリシー（追加済み）
以下のポリシーを手動でSupabase SQL Editorから追加済み：

```sql
-- parent_student_links: 本人・管理者のみ参照
CREATE POLICY "本人・管理者が参照可" ON public.parent_student_links
  FOR SELECT USING (
    parent_user_id = auth.uid()
    OR student_user_id = auth.uid()
    OR public.my_role() = 'admin'
  );

-- users: 自分 + 紐づいた保護者・生徒 + 管理者が参照可
CREATE POLICY "users_select_policy" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_user_id = auth.uid() AND student_user_id = public.users.id
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE student_user_id = auth.uid() AND parent_user_id = public.users.id
    )
  );
```

### /checkin ページの仕様
- URL: `/checkin?token={QRコードのtoken}`
- クライアントサイドコンポーネント（"use client"）
- 未ログインの場合 → `/login?returnUrl=/checkin?token=xxx` にリダイレクト
- 入室成功 → 緑系UI / 退室成功 → 青系UI

### /parent/notifications ページの仕様
- `notification_settings` テーブルを upsert（初回は自動作成）
- 設定項目: 入室通知ON/OFF、退室通知ON/OFF、通知先メールアドレス
- ※ 実際のメール送信は未実装（将来のアップデートで追加予定）

### Server Actions（フォーム送信）
各画面では `"use server"` アノテーションの Server Actions を使用しています。
- `revalidatePath()` でキャッシュを更新しページを自動リフレッシュ

### ロール管理
- users テーブルの `role` カラム: `'admin'` / `'parent'` / `'student'`
- RLSでロールごとにデータアクセス制限

### ブランドカラー（Tailwind）
```
brand-50:  #f0fdf4
brand-600: #16a34a  ← メインカラー
brand-700: #15803d
```
- 管理者画面: `bg-purple-700`（ヘッダー）
- 保護者画面: `bg-blue-600`（ヘッダー）
- 生徒画面: `bg-brand-600`（ヘッダー）

### QRコード表示
外部サービス `api.qrserver.com` を使ってQR画像を生成（追加パッケージ不要）。
```
https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=[URL]
```
QRコードのURLは `https://aioijuku.vercel.app/checkin?token={token}` 形式。

---

## 進捗状況

| ステップ | 内容 | 状態 |
|---------|------|------|
| Step 1 | Supabase設定・スキーマ投入 | ✅ 完了 |
| Step 2 | テストユーザー作成 | ✅ 完了 |
| Step 3 | GitHubにコードをアップロード | ✅ 完了 |
| Step 4 | 動作確認（https://aioijuku.vercel.app） | ✅ 完了（全ページ動作確認済み） |
| Step 5 | XserverのDNS設定でドメインをVercelに接続 | 🔲 未着手 |

---

## 次にやること

### 優先度 高
1. **Xserverのドメイン → Vercel に接続**（DNSのAレコード設定）
   - Vercelの「Domains」設定から対象ドメインを追加
   - XserverのDNS設定でAレコードをVercelのIPに向ける

### 優先度 中（追加機能）
2. **Push通知機能** — 入退室時に保護者へブラウザプッシュ通知を送信
3. **教材PDFアップロード機能** — Supabase Storageを使って教材を管理
4. **月次レポート機能** — 月ごとの学習状況をPDFまたはメールで送付

### 優先度 低（改善）
5. **管理者画面**: 会員の追加・編集・削除機能
6. **パスワードリセット機能** — Supabase Authのパスワードリセットメール
7. **本番用メール通知** — 欠席連絡時のメール送信（SendGrid等）

---

## 作業ファイル（参考用）
- `proposal.html` — 提案書
- `schema.sql` — DBスキーマ定義
- `step1-supabase-setup.html` — Supabaseセットアップ手順
- `step2-test-users.html` — テストユーザー作成ガイド
- `step3-github-upload.html` — GitHubアップロード手順ガイド
- `step4-link-parent-student.html` — 保護者↔生徒リンクSQL
- `step5-fix-users-rls.html` — usersテーブルRLSポリシー追加SQL
- `supabase.com.txt` — Supabase接続情報メモ
