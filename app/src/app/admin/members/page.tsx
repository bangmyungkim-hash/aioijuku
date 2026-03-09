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

  // 生徒一覧（プロフィール付き）
  const { data: students } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at, student_profiles(grade, school_name)")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  // 保護者一覧
  const { data: parents } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("role", "parent")
    .order("created_at", { ascending: false });

  // 保護者↔生徒 紐付け
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("parent_user_id, student_user_id");

  // 紐付けマップ: studentId → parentIds[]
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
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">👥 会員管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* 新規登録案内 */}
        <div className="card bg-purple-50 border-purple-200">
          <p className="text-sm text-purple-800 font-bold">➕ 新しい会員を追加するには</p>
          <p className="text-sm text-purple-700 mt-1">
            Supabase ダッシュボード → Authentication → Users → 「Add user」から作成してください。
            作成後、SQL Editor で role・full_name を設定します。
          </p>
        </div>

        {/* 生徒一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            🎒 生徒 ({students?.length ?? 0}名)
          </h2>
          <div className="space-y-3">
            {students && students.length > 0 ? students.map((s) => {
              const profile = s.student_profiles as { grade: string; school_name: string } | null;
              const parentIds = studentParentMap[s.id] ?? [];
              return (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{s.full_name}</span>
                        {s.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">在籍</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">退塾</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{s.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {profile?.grade && <span>📚 {profile.grade}</span>}
                        {profile?.school_name && <span>🏫 {profile.school_name}</span>}
                      </div>
                      {parentIds.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          👪 保護者: {parentIds.map((pid) => parentMap[pid] ?? pid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-gray-400 py-8">生徒が登録されていません</div>
            )}
          </div>
        </section>

        {/* 保護者一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            👪 保護者 ({parents?.length ?? 0}名)
          </h2>
          <div className="space-y-3">
            {parents && parents.length > 0 ? parents.map((p) => {
              const studentIds = parentStudentMap[p.id] ?? [];
              return (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{p.full_name}</span>
                        {p.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">有効</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">無効</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{p.email}</p>
                      {studentIds.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          🎒 お子様: {studentIds.map((sid) => studentMap[sid] ?? sid).join("、")}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")} 登録
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="card text-center text-gray-400 py-8">保護者が登録されていません</div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
