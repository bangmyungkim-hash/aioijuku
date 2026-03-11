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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
               style={{ background: "linear-gradient(135deg, #c9963a, #a87825)", boxShadow: "0 4px 24px rgba(184,135,42,0.35)" }}>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: "Inter, sans-serif" }}>A</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>あいおい塾</h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>会員サイトへようこそ</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                     style={{ color: "var(--text-muted)" }}>
                メールアドレス
              </label>
              <input type="email" className="input" placeholder="example@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                     style={{ color: "var(--text-muted)" }}>
                パスワード
              </label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password" />
            </div>
            {error && (
              <div className="rounded-lg px-4 py-3 text-sm text-rose-700"
                   style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full mt-2 py-3" disabled={loading}>
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "var(--text-muted)" }}>
          アカウントをお持ちでない方は<br />
          塾の先生にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
