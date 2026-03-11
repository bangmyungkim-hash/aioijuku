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

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, target_roles, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const dashboardHref =
    profile.role === "admin"   ? "/admin/dashboard" :
    profile.role === "parent"  ? "/parent/dashboard" :
    "/student/dashboard";

  const roleLabel: Record<string, string> = { admin: "管理者", parent: "保護者", student: "生徒" };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href={dashboardHref} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">お知らせ</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {announcements && announcements.length > 0 ? (
          announcements.map((a) => {
            const targets = (a.target_roles as string[]).map((r) => roleLabel[r] ?? r).join("・");
            const publishedDate = a.published_at
              ? new Date(a.published_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
              : "—";

            return (
              <article key={a.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="font-semibold text-slate-100 text-base leading-snug">{a.title}</h2>
                  <span className="text-xs text-slate-600 whitespace-nowrap shrink-0 mt-0.5">{publishedDate}</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">対象: {targets}</p>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-800 pt-3">
                  {a.body}
                </div>
              </article>
            );
          })
        ) : (
          <div className="card text-center text-slate-600 py-20">
            <p className="text-sm">現在、お知らせはありません</p>
          </div>
        )}

      </main>
    </div>
  );
}
