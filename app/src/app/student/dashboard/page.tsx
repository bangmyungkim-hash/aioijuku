import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "student") redirect("/");

  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count")
    .eq("student_user_id", user.id).single();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "linear-gradient(135deg, #c9963a, #a87825)" }}>A</div>
          <span className="font-semibold tracking-tight" style={{ color: "rgba(255,255,255,0.9)" }}>あいおい塾</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile?.full_name} さん</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}>
              ログアウト
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="card text-center py-10">
          <p className="text-sm mb-4 tracking-wide" style={{ color: "var(--text-muted)" }}>今日の学習を始めよう</p>
          <StartLearningButton />
        </div>
        <div>
          <h2 className="section-title">学習記録</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="累積" value={stats?.total_days ?? 0} unit="日" accent="amber" />
            <StatCard label="連続" value={stats?.current_streak ?? 0} unit="日" accent="emerald" />
            <StatCard label="復活" value={stats?.revival_count ?? 0} unit="回" accent="sky" />
          </div>
        </div>
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

async function startLearningAction() {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("record_learning_start", { p_student_id: user.id });
  revalidatePath("/student/dashboard");
}

function StartLearningButton() {
  return (
    <form action={startLearningAction}>
      <button type="submit" className="btn-primary text-lg px-12 py-4 rounded-xl">
        学習開始
      </button>
    </form>
  );
}

function StatCard({ label, value, unit, accent }: {
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
      <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{unit}</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function NavCard({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="card flex items-center gap-3 hover:border-amber-400 transition-all group">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(184,135,42,0.5)" }} />
      <span className="font-medium text-stone-800 group-hover:text-stone-900 transition-colors">{label}</span>
    </a>
  );
}
