import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen bg-brand-50">
      {/* ヘッダー */}
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-extrabold text-lg">あいおい塾</span>
        </div>
        <span className="text-sm opacity-90">{profile?.full_name} さん</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 学習開始ボタン */}
        <div className="card text-center py-8">
          <p className="text-sm text-gray-500 mb-3">今日の学習を始めよう！</p>
          <StartLearningButton studentId={user.id} />
        </div>

        {/* ゲーミフィケーション */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📊 学習記録</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="累積" value={stats?.total_days ?? 0} unit="日" color="green" />
            <StatCard label="連続" value={stats?.current_streak ?? 0} unit="日" color="orange" />
            <StatCard label="復活" value={stats?.revival_count ?? 0} unit="回" color="blue" />
          </div>
        </div>

        {/* ナビゲーション */}
        <nav className="grid grid-cols-2 gap-3">
          <NavCard href="/student/learning" icon="📚" label="学習管理" />
          <NavCard href="/student/grades"   icon="📈" label="成績管理" />
          <NavCard href="/calendar"         icon="📅" label="カレンダー" />
          <NavCard href="/announcements"    icon="📢" label="お知らせ" />
        </nav>

      </main>
    </div>
  );
}

// ── 学習開始ボタン（Client Component に切り出し予定）──
function StartLearningButton({ studentId }: { studentId: string }) {
  return (
    <form action={`/api/learning/start`} method="POST">
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        className="btn-primary text-xl px-10 py-4 rounded-2xl shadow-lg"
      >
        🟢 学習開始！
      </button>
    </form>
  );
}

// ── 統計カード ──
function StatCard({
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
    <div className={`rounded-2xl p-4 text-center ${colorMap[color]}`}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs font-bold mt-0.5">{unit}</div>
      <div className="text-xs opacity-70 mt-1">{label}</div>
    </div>
  );
}

// ── ナビカード ──
function NavCard({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="card flex items-center gap-3 hover:bg-brand-50 transition-colors">
      <span className="text-2xl">{icon}</span>
      <span className="font-bold text-gray-700">{label}</span>
    </a>
  );
}
