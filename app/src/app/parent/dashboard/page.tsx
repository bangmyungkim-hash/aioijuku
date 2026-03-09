import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * 保護者ダッシュボード
 * 紐づいた生徒の学習状況サマリーを表示
 */
export default async function ParentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") redirect("/");

  // 紐づいた生徒を取得（ユーザー名付き）
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_user_id, users!parent_student_links_student_user_id_fkey(id, full_name)")
    .eq("parent_user_id", user.id);

  // 各生徒のゲーミフィケーション統計を取得
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

  // ヘルパー：Supabase JOIN は配列で返ることがあるので両対応
  function getName(usersField: unknown): string {
    if (Array.isArray(usersField)) {
      return (usersField[0] as { full_name?: string })?.full_name ?? "—";
    }
    return (usersField as { full_name?: string } | null)?.full_name ?? "—";
  }

  const navItems = [
    { href: "/parent/absence",       icon: "📝", label: "欠席・遅刻連絡" },
    { href: "/parent/notifications", icon: "🔔", label: "通知設定" },
    { href: "/calendar",             icon: "📅", label: "カレンダー" },
    { href: "/announcements",        icon: "📢", label: "お知らせ" },
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-extrabold text-lg">あいおい塾</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-90">{profile?.full_name} さん</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit"
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg transition">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* お子様の状況 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">👶 お子様の状況</h2>
          {links && links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => {
                const name = getName(link.users);
                const stats = statsMap[link.student_user_id];
                return (
                  <div key={link.student_user_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        <span>📚 累積 <strong className="text-brand-600">{stats?.total_days ?? 0}</strong> 日</span>
                        <span>🔥 連続 <strong className="text-orange-500">{stats?.current_streak ?? 0}</strong> 日</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">学習状況を確認する</p>
                    </div>
                    <a
                      href={"/parent/student/" + link.student_user_id}
                      className="text-sm font-bold text-blue-600 border border-blue-300 px-4 py-2 rounded-lg hover:bg-blue-50 transition whitespace-nowrap"
                    >
                      詳細 →
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">👶</p>
              <p>お子様のアカウントが紐付けられていません。</p>
              <p className="text-sm mt-1">塾の先生にお問い合わせください。</p>
            </div>
          )}
        </section>

        {/* ナビゲーション */}
        <nav className="grid grid-cols-2 gap-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:bg-blue-50 transition"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="font-bold text-gray-700">{item.label}</span>
            </a>
          ))}
        </nav>

      </main>
    </div>
  );
}
