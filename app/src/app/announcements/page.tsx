import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // ロールに応じたお知らせを取得（RLSが自動的に絞り込む）
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, target_roles, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  // ダッシュボードへのリンクをロール別に決定
  const dashboardHref =
    profile.role === "admin"   ? "/admin/dashboard" :
    profile.role === "parent"  ? "/parent/dashboard" :
    "/student/dashboard";

  const roleLabel: Record<string, string> = {
    admin: "管理者",
    parent: "保護者",
    student: "生徒",
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href={dashboardHref} className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📢 お知らせ</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {announcements && announcements.length > 0 ? (
          announcements.map((a) => {
            const targets = (a.target_roles as string[]).map((r) => roleLabel[r] ?? r).join("・");
            const publishedDate = a.published_at
              ? new Date(a.published_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
              : "—";

            return (
              <article key={a.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-extrabold text-gray-800 text-base leading-snug">{a.title}</h2>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{publishedDate}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">対象: {targets}</p>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-3">
                  {a.body}
                </div>
              </article>
            );
          })
        ) : (
          <div className="card text-center text-gray-400 py-20">
            <p className="text-4xl mb-4">📢</p>
            <p>現在、お知らせはありません</p>
          </div>
        )}

      </main>
    </div>
  );
}
