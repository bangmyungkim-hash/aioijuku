import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: students } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at, student_profiles(grade, school_name)")
    .eq("role", "student").order("created_at", { ascending: false });

  const { data: parents } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("role", "parent").order("created_at", { ascending: false });

  const { data: links } = await supabase
    .from("parent_student_links").select("parent_user_id, student_user_id");

  const studentParentMap: Record<string, string[]> = {};
  const parentStudentMap: Record<string, string[]> = {};
  links?.forEach((l) => {
    if (!studentParentMap[l.student_user_id]) studentParentMap[l.student_user_id] = [];
    studentParentMap[l.student_user_id].push(l.parent_user_id);
    if (!parentStudentMap[l.parent_user_id]) parentStudentMap[l.parent_user_id] = [];
    parentStudentMap[l.parent_user_id].push(l.student_user_id);
  });

  const parentMap: Record<string, string> = {};
  parents?.forEach((p) => { parentMap[p.id] = p.full_name; });
  const studentMap: Record<string, string> = {};
  students?.forEach((s) => { studentMap[s.id] = s.full_name; });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>会員管理</span>
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        <div className="card" style={{ borderColor: "rgba(184,135,42,0.4)" }}>
          <p className="text-sm font-semibold text-amber-700">新しい会員を追加するには</p>
          <p className="text-sm text-stone-600 mt-1">
            Supabase ダッシュボード → Authentication → Users → 「Add user」から作成してください。
            作成後、SQL Editor で role・full_name を設定します。
          </p>
        </div>

        <section>
          <h2 className="section-title">生徒 ({students?.length ?? 0}名)</h2>
          <div className="space-y-3">
            {students && students.length > 0 ? students.map((s) => {
              const sprof = s.student_profiles as unknown as { grade: string; school_name: string } | null;
              const parentIds = studentParentMap[s.id] ?? [];
              return (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{s.full_name}</span>
                        {s.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">在籍</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">退塾</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mt-0.5">{s.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-stone-400">
                        {sprof?.grade && <span>{sprof.grade}</span>}
                        {sprof?.school_name && <span>{sprof.school_name}</span>}
                      </div>
                      {parentIds.length > 0 && (
                        <p className="text-xs text-sky-700 mt-1">
                          保護者: {parentIds.map((pid) => parentMap[pid] ?? pid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-stone-400 py-8">生徒が登録されていません</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="section-title">保護者 ({parents?.length ?? 0}名)</h2>
          <div className="space-y-3">
            {parents && parents.length > 0 ? parents.map((p) => {
              const sIds = parentStudentMap[p.id] ?? [];
              return (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800">{p.full_name}</span>
                        {p.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">有効</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">無効</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mt-0.5">{p.email}</p>
                      {sIds.length > 0 && (
                        <p className="text-xs text-emerald-700 mt-1">
                          お子様: {sIds.map((sid) => studentMap[sid] ?? sid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-stone-400 py-8">保護者が登録されていません</div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
