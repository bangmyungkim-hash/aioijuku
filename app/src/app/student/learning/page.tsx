import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLearningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/");

  // ゲーミフィケーション統計
  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count, last_learning_date")
    .eq("student_user_id", user.id)
    .single();

  // 学習ログ（直近30件）
  const { data: logs } = await supabase
    .from("learning_logs")
    .select("id, logged_date, units_done, duration_min, memo, materials(name, subject)")
    .eq("student_user_id", user.id)
    .order("logged_date", { ascending: false })
    .limit(30);

  // 教材進捗
  const { data: progress } = await supabase
    .from("material_progress")
    .select("material_id, current_unit, completion_pct, last_updated, materials(name, subject, total_units)")
    .eq("student_user_id", user.id)
    .order("last_updated", { ascending: false });

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/student/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📚 学習管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 学習記録ストリーク */}
        <div className="card text-center py-6">
          <p className="text-xs text-gray-400 mb-1">最終学習日</p>
          <p className="text-sm font-bold text-gray-600 mb-4">
            {stats?.last_learning_date ?? "まだ学習記録がありません"}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <StatBadge label="累積" value={stats?.total_days ?? 0} unit="日" color="green" />
            <StatBadge label="連続" value={stats?.current_streak ?? 0} unit="日" color="orange" />
            <StatBadge label="復活" value={stats?.revival_count ?? 0} unit="回" color="blue" />
          </div>
          <p className="text-xs text-gray-400 mt-4">
            ダッシュボードの「学習開始！」ボタンを押すと記録が更新されます
          </p>
        </div>

        {/* 教材進捗 */}
        {progress && progress.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📖 教材の進捗</h2>
            <div className="space-y-3">
              {progress.map((p) => {
                const mat = p.materials as { name: string; subject: string; total_units: number | null } | null;
                const pct = Number(p.completion_pct);
                return (
                  <div key={p.material_id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gray-800">{mat?.name ?? "—"}</span>
                        <span className="ml-2 text-xs text-gray-400">{mat?.subject}</span>
                      </div>
                      <span className="font-bold text-brand-600">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-brand-500 h-2 rounded-full transition-all"
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {p.current_unit}ユニット完了
                      {mat?.total_units ? " / " + mat.total_units + "ユニット" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 学習ログ一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            🗓️ 学習履歴（直近30件）
          </h2>
          {logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => {
                const mat = log.materials as { name: string; subject: string } | null;
                return (
                  <div key={log.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-700 text-sm">{log.logged_date}</span>
                        {mat && (
                          <span className="ml-2 text-xs text-gray-500">
                            {mat.subject} — {mat.name}
                          </span>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {log.units_done != null && <span>{log.units_done}ユニット</span>}
                        {log.duration_min != null && (
                          <span className="ml-2">{log.duration_min}分</span>
                        )}
                      </div>
                    </div>
                    {log.memo && <p className="text-xs text-gray-400 mt-1">{log.memo}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-10">
              学習履歴がありません。<br />
              ダッシュボードの「学習開始！」ボタンを押して記録を始めましょう！
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function StatBadge({
  label, value, unit, color,
}: {
  label: string; value: number; unit: string;
  color: "green" | "orange" | "blue";
}) {
  const colorMap = {
    green:  "bg-brand-100 text-brand-700",
    orange: "bg-orange-100 text-orange-700",
    blue:   "bg-blue-100 text-blue-700",
  };
  return (
    <div className={"rounded-2xl p-4 " + colorMap[color]}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs font-bold">{unit}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
