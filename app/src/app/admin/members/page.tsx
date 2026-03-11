import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: students } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at, student_profiles(grade, school_name)")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const { data: parents } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("parent_user_id, student_user_id");

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
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">会員管理</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        <div className="card" style={{ borderColor: "rgba(212, 168, 67, 0.15)" }}>
          <p className="text-sm text-amber-400 font-semibold">新しい会員を追加するには</p>
          <p className="text-sm text-slate-400 mt-1">
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
                        <span className="font-medium text-slate-100">{s.full_name}</span>
                        {s.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">在籍</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">退塾</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{s.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-slate-600">
                        {sprof?.grade && <span>{sprof.grade}</span>}
                        {sprof?.school_name && <span>{sprof.school_name}</span>}
                      </div>
                      {parentIds.length > 0 && (
                        <p className="text-xs text-sky-400/80 mt-1">
                          保護者: {parentIds.map((pid) => parentMap[pid] ?? pid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-slate-600 py-8">生徒が登録されていません</div>
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
                        <span className="font-medium text-slate-100">{p.full_name}</span>
                        {p.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">有効</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">無効</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{p.email}</p>
                      {sIds.length > 0 && (
                        <p className="text-xs text-emerald-400/80 mt-1">
                          お子様: {sIds.map((sid) => studentMap[sid] ?? sid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-slate-600 py-8">保護者が登録されていません</div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
