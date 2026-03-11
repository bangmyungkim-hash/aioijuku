import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "parent") redirect("/");

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_user_id, users!parent_student_links_student_user_id_fkey(id, full_name)")
    .eq("parent_user_id", user.id);

  const studentIds = (links ?? []).map((l) => l.student_user_id);
  const { data: statsRows } = studentIds.length > 0
    ? await supabase
        .from("gamification_stats")
        .select("student_user_id, total_days, current_streak")
        .in("student_user_id", studentIds)
    : { data: [] };

  const statsMap: Record<string, { total_days: number; current_streak: number }> = {};
  for (const s of statsRows ?? []) {
    statsMap[s.student_user_id] = s;
  }

  function getName(usersField: unknown): string {
    if (Array.isArray(usersField)) {
      return (usersField[0] as { full_name?: string })?.full_name ?? "—";
    }
    return (usersField as { full_name?: string } | null)?.full_name ?? "—";
  }

  const navItems = [
    { href: "/parent/absence",       label: "欠席・遅刻連絡" },
    { href: "/parent/notifications", label: "通知設定" },
    { href: "/calendar",             label: "カレンダー" },
    { href: "/announcements",        label: "お知らせ" },
  ];

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
        <section>
          <h2 className="section-title">お子様の状況</h2>
          {links && links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => {
                const name = getName(link.users);
                const stats = statsMap[link.student_user_id];
                return (
                  <div key={link.student_user_id} className="card flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-stone-800 text-lg">{name}</p>
                      <div className="flex gap-4 mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
                        <span>累積 <strong className="text-amber-700">{stats?.total_days ?? 0}</strong> 日</span>
                        <span>連続 <strong className="text-emerald-700">{stats?.current_streak ?? 0}</strong> 日</span>
                      </div>
                    </div>
                    <a href={"/parent/student/" + link.student_user_id}
                       className="text-sm font-medium text-amber-700 border border-amber-300 px-4 py-2 rounded-lg hover:bg-amber-50 transition whitespace-nowrap">
                      詳細 →
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-10" style={{ color: "var(--text-muted)" }}>
              <p className="text-sm">お子様のアカウントが紐付けられていません。</p>
              <p className="text-xs mt-1">塾の先生にお問い合わせください。</p>
            </div>
          )}
        </section>
        <nav className="grid grid-cols-2 gap-3">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}
               className="card flex items-center gap-3 hover:border-amber-400 transition-all group">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(184,135,42,0.5)" }} />
              <span className="font-medium text-stone-800 group-hover:text-stone-900 transition-colors">{item.label}</span>
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
