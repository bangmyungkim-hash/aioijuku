"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-md">
            <span className="text-3xl">🌱</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">あいおい塾</h1>
          <p className="text-sm text-gray-500 mt-1">会員サイトへようこそ</p>
        </div>

        {/* ログインフォーム */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                className="input"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                パスワード
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          アカウントをお持ちでない方は<br />
          塾の先生にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
