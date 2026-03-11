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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: "linear-gradient(145deg, #060b18 0%, #0c1425 50%, #0a1020 100%)" }}>
      {/* 背景装飾 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
           style={{ background: "radial-gradient(circle, #d4a843 0%, transparent 70%)" }} />

      <div className="w-full max-w-sm relative z-10">

        {/* ロゴ・タイトル */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
               style={{ background: "linear-gradient(135deg, #d4a843, #b8912e)", boxShadow: "0 4px 24px rgba(212, 168, 67, 0.3)" }}>
            <span className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">あいおい塾</h1>
          <p className="text-sm text-slate-500 mt-1.5 tracking-wide">会員サイトへようこそ</p>
        </div>

        {/* ログインフォーム */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
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
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
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
              <div className="rounded-lg px-4 py-3 text-sm text-rose-400"
                   style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.15)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2 py-3"
              disabled={loading}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          アカウントをお持ちでない方は<br />
          塾の先生にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
