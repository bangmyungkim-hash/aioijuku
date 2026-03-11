import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/");

  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count")
    .eq("student_user_id", user.id)
    .single();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      {/* ヘッダー */}
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "linear-gradient(135deg, #d4a843, #b8912e)" }}>A</div>
          <span className="font-semibold text-slate-100 tracking-tight">あいおい塾</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{profile?.full_name} さん</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit"
              className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* 学習開始ボタン */}
        <div className="card text-center py-10">
          <p className="text-sm text-slate-500 mb-4 tracking-wide">今日の学習を始めよう</p>
          <StartLearningButton />
        </div>

        {/* ゲーミフィケーション */}
        <div>
          <h2 className="section-title">学習記録</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="累積" value={stats?.total_days ?? 0} unit="日" accent="amber" />
            <StatCard label="連続" value={stats?.current_streak ?? 0} unit="日" accent="emerald" />
            <StatCard label="復活" value={stats?.revival_count ?? 0} unit="回" accent="sky" />
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="grid grid-cols-2 gap-3">
          <NavCard href="/student/learning" label="学習管理" />
          <NavCard href="/student/grades"   label="成績管理" />
          <NavCard href="/calendar"         label="カレンダー" />
          <NavCard href="/announcements"    label="お知らせ" />
        </nav>

      </main>
    </div>
  );
}

// ── 学習開始 Server Action ──
async function startLearningAction() {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("record_learning_start", { p_student_id: user.id });
  revalidatePath("/student/dashboard");
}

// ── 学習開始ボタン ──
function StartLearningButton() {
  return (
    <form action={startLearningAction}>
      <button
        type="submit"
        className="btn-primary text-lg px-12 py-4 rounded-xl"
      >
        学習開始
      </button>
    </form>
  );
}

// ── 統計カード ──
function StatCard({
  label, value, unit, accent,
}: {
  label: string; value: number; unit: string;
  accent: "amber" | "emerald" | "sky";
}) {
  const accentMap = {
    amber:   { text: "text-amber-400",   border: "border-amber-500/20" },
    emerald: { text: "text-emerald-400", border: "border-emerald-500/20" },
    sky:     { text: "text-sky-400",     border: "border-sky-500/20" },
  };
  const a = accentMap[accent];
  return (
    <div className={`stat-card ${a.border} border`}>
      <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{unit}</div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}

// ── ナビカード ──
function NavCard({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="card flex items-center gap-3 hover:border-amber-500/20 transition-all group">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500 transition-colors" />
      <span className="font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{label}</span>
    </a>
  );
}
