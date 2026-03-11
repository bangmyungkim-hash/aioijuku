import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLearningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/");

  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count, last_learning_date")
    .eq("student_user_id", user.id).single();

  const { data: logs } = await supabase
    .from("learning_logs")
    .select("id, logged_date, units_done, duration_min, memo, materials(name, subject)")
    .eq("student_user_id", user.id)
    .order("logged_date", { ascending: false }).limit(30);

  const { data: progress } = await supabase
    .from("material_progress")
    .select("material_id, current_unit, completion_pct, last_updated, materials(name, subject, total_units)")
    .eq("student_user_id", user.id)
    .order("last_updated", { ascending: false });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/student/dashboard" className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>学習管理</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile?.full_name}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="card text-center py-6">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>最終学習日</p>
          <p className="text-sm font-medium text-stone-600 mb-4">
            {stats?.last_learning_date ?? "まだ学習記録がありません"}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <StatBadge label="累積" value={stats?.total_days ?? 0} unit="日" accent="amber" />
            <StatBadge label="連続" value={stats?.current_streak ?? 0} unit="日" accent="emerald" />
            <StatBadge label="復活" value={stats?.revival_count ?? 0} unit="回" accent="sky" />
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            ダッシュボードの「学習開始」ボタンを押すと記録が更新されます
          </p>
        </div>

        {progress && progress.length > 0 && (
          <section>
            <h2 className="section-title">教材の進捗</h2>
            <div className="space-y-3">
              {progress.map((p) => {
                const mat = p.materials as unknown as { name: string; subject: string; total_units: number | null } | null;
                const pct = Number(p.completion_pct);
                return (
                  <div key={p.material_id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-stone-800">{mat?.name ?? "—"}</span>
                        <span className="ml-2 text-xs text-stone-500">{mat?.subject}</span>
                      </div>
                      <span className="font-semibold text-amber-700">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: pct + "%" }} />
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      {p.current_unit}ユニット完了
                      {mat?.total_units ? " / " + mat.total_units + "ユニット" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="section-title">学習履歴（直近30件）</h2>
          {logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => {
                const mat = log.materials as unknown as { name: string; subject: string } | null;
                return (
                  <div key={log.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-stone-700 text-sm">{log.logged_date}</span>
                        {mat && (
                          <span className="ml-2 text-xs text-stone-500">
                            {mat.subject} — {mat.name}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-xs text-stone-500">
                        {log.units_done != null && <span>{log.units_done}ユニット</span>}
                        {log.duration_min != null && <span className="ml-2">{log.duration_min}分</span>}
                      </div>
                    </div>
                    {log.memo && <p className="text-xs text-stone-400 mt-1">{log.memo}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-stone-400 py-10">
              学習履歴がありません。<br />
              ダッシュボードの「学習開始」ボタンを押して記録を始めましょう。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatBadge({ label, value, unit, accent }: {
  label: string; value: number; unit: string;
  accent: "amber" | "emerald" | "sky";
}) {
  const accentMap = {
    amber:   { text: "text-amber-700",   border: "border-amber-200" },
    emerald: { text: "text-emerald-700", border: "border-emerald-200" },
    sky:     { text: "text-sky-700",     border: "border-sky-200" },
  };
  const a = accentMap[accent];
  return (
    <div className={`stat-card ${a.border} border`}>
      <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
      <div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{unit}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}
