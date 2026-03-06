import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", user.id);

  const studentIds = links?.map((l) => l.student_user_id) ?? [];
  const { data: students } = studentIds.length > 0
    ? await supabase
        .from("users")
        .select("id, full_name")
        .in("id", studentIds)
    : { data: [] };

  const studentMap = Object.fromEntries(
    (students ?? []).map((s) => [s.id, s.full_name])
  );

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-extrabold text-lg">あいおい塾</span>
        </div>
        <span className="text-sm opacity-90">{profile?.full_name} さん</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <h2 className="text-lg font-extrabold text-gray-800">保護者ダッシュボード</h2>

        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3">👶 お子様の状況</h3>
          {links && links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => (
                <div key={link.student_user_id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">
                      {studentMap[link.student_user_id] ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">学習状況を確認する</p>
                  </div>
                  
                    href={"/parent/student/" + link.student_user_id}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    詳細
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-8">
              お子様のアカウントが紐付けられていません。
              塾の先生にお問い合わせください。
            </div>
          )}
        </div>

        <nav className="grid grid-cols-2 gap-3">
          <NavCard href="/parent/absence" icon="📝" label="欠席・遅刻連絡" />
          <NavCard href="/parent/notifications" icon="🔔" label="通知設定" />
          <NavCard href="/calendar" icon="📅" label="カレンダー" />
          <NavCard href="/announcements" icon="📢" label="お知らせ" />
        </nav>

      </main>
    </div>
  );
}

function NavCard({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a href={href} className="card flex items-center gap-3 hover:bg-blue-50 transition-colors">
      <span className="text-2xl">{icon}</span>
      <span className="font-bold text-gray-700">{label}</span>
    </a>
  );
}
