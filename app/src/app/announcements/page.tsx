import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, target_roles, published_at, created_at")
    .eq("is_published", true).order("published_at", { ascending: false });

  const dashboardHref =
    profile.role === "admin"  ? "/admin/dashboard" :
    profile.role === "parent" ? "/parent/dashboard" :
    "/student/dashboard";

  const roleLabel: Record<string, string> = { admin: "管理者", parent: "保護者", student: "生徒" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href={dashboardHref} className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>お知らせ</span>
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
                  <h2 className="font-semibold text-stone-800 text-base leading-snug">{a.title}</h2>
                  <span className="text-xs text-stone-400 whitespace-nowrap shrink-0 mt-0.5">{publishedDate}</span>
                </div>
                <p className="text-xs text-stone-400 mb-3">対象: {targets}</p>
                <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line border-t border-stone-200 pt-3">
                  {a.body}
                </div>
              </article>
            );
          })
        ) : (
          <div className="card text-center text-stone-400 py-20">
            <p className="text-sm">現在、お知らせはありません</p>
          </div>
        )}
      </main>
    </div>
  );
}
