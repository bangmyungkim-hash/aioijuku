import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function addExamResult(formData: FormData) {
  "use server";
  const studentId = formData.get("student_id") as string;
  const examId    = formData.get("exam_id") as string;
  const subject   = formData.get("subject") as string;
  const score     = Number(formData.get("score"));
  const maxScore  = Number(formData.get("max_score") ?? 100);
  if (!studentId || !examId || !subject || isNaN(score)) return;
  const supabase = await createClient();
  await supabase.from("exam_results").upsert(
    { student_user_id: studentId, exam_id: examId, subject, score, max_score: maxScore },
    { onConflict: "student_user_id,exam_id,subject" }
  );
  revalidatePath("/admin/grades");
}

export default async function AdminGradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: exams } = await supabase
    .from("exams").select("id, name, type, exam_date").order("exam_date", { ascending: false });
  const { data: students } = await supabase
    .from("users").select("id, full_name").eq("role", "student").eq("is_active", true).order("full_name");
  const { data: results } = await supabase
    .from("exam_results")
    .select("id, student_user_id, exam_id, subject, score, max_score, users!exam_results_student_user_id_fkey(full_name), exams!exam_results_exam_id_fkey(name, exam_date, type)")
    .order("created_at", { ascending: false }).limit(50);

  const examTypeLabel: Record<string, string> = { school_test: "定期テスト", mock_exam: "模擬試験" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>成績管理</span>
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="card">
          <h2 className="font-semibold text-stone-800 mb-4">成績を入力</h2>
          <form action={addExamResult} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">生徒</label>
                <select name="student_id" required className="form-dark">
                  <option value="">選択してください</option>
                  {students?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">試験</label>
                <select name="exam_id" required className="form-dark">
                  <option value="">選択してください</option>
                  {exams?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.exam_date} {e.name} ({examTypeLabel[e.type] ?? e.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">科目</label>
                <select name="subject" required className="form-dark">
                  <option value="">選択</option>
                  {["国語", "数学", "英語", "理科", "社会", "その他"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">得点</label>
                <input type="number" name="score" min={0} max={1000} required className="form-dark" placeholder="例: 78" />
              </div>
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">満点</label>
                <input type="number" name="max_score" min={1} defaultValue={100} className="form-dark" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-2">登録</button>
            </div>
          </form>
          {!exams || exams.length === 0 ? (
            <div className="mt-3 p-3 rounded-lg text-sm text-amber-700"
                 style={{ background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.25)" }}>
              試験マスタが登録されていません。Supabase の SQL Editor で exams テーブルに試験を追加してください。
            </div>
          ) : null}
        </div>

        <section>
          <h2 className="section-title">成績一覧（直近50件）</h2>
          {results && results.length > 0 ? (
            <div className="space-y-2">
              {results.map((r) => {
                const studentName = (r.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                const exam = r.exams as unknown as { name: string; exam_date: string; type: string } | null;
                const pct = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
                return (
                  <div key={r.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-stone-800">{studentName}</span>
                        <span className="mx-2 text-stone-300">|</span>
                        <span className="text-sm text-stone-600">{exam?.name ?? "—"}</span>
                        <span className="mx-2 text-stone-300">|</span>
                        <span className="text-sm text-stone-600">{r.subject}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-stone-800">{r.score}</span>
                        <span className="text-xs text-stone-400">/{r.max_score}</span>
                        <span className={`ml-2 text-sm font-semibold ${pct >= 80 ? "text-emerald-700" : pct >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                    {exam?.exam_date && (
                      <p className="text-xs text-stone-400 mt-0.5">{exam.exam_date} — {examTypeLabel[exam.type] ?? exam.type}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-stone-400 py-10">
              成績データがありません。<br />上のフォームから入力してください。
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
