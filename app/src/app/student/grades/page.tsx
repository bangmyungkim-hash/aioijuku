import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentGradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/");

  const { data: results } = await supabase
    .from("exam_results")
    .select("id, subject, score, max_score, exams(id, name, type, exam_date)")
    .eq("student_user_id", user.id)
    .order("created_at", { ascending: false });

  const examMap: Record<string, {
    exam: { id: string; name: string; type: string; exam_date: string };
    results: Array<{ subject: string; score: number; max_score: number }>;
  }> = {};

  results?.forEach((r) => {
    const exam = r.exams as unknown as { id: string; name: string; type: string; exam_date: string } | null;
    if (!exam) return;
    if (!examMap[exam.id]) examMap[exam.id] = { exam, results: [] };
    examMap[exam.id].results.push({ subject: r.subject, score: r.score, max_score: r.max_score });
  });

  const examTypeLabel: Record<string, string> = { school_test: "定期テスト", mock_exam: "模擬試験" };

  const subjectColor: Record<string, string> = {
    国語: "bg-rose-500/10 text-rose-400",
    数学: "bg-sky-500/10 text-sky-400",
    英語: "bg-emerald-500/10 text-emerald-400",
    理科: "bg-violet-500/10 text-violet-400",
    社会: "bg-amber-500/10 text-amber-400",
    その他: "bg-slate-700/50 text-slate-400",
  };

  const examGroups = Object.values(examMap).sort((a, b) =>
    b.exam.exam_date.localeCompare(a.exam.exam_date)
  );

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/student/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">成績管理</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {examGroups.length > 0 ? examGroups.map(({ exam, results: examResults }) => {
          const total     = examResults.reduce((sum, r) => sum + r.score, 0);
          const maxTotal  = examResults.reduce((sum, r) => sum + r.max_score, 0);
          const totalPct  = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

          return (
            <div key={exam.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-base">{exam.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                      {examTypeLabel[exam.type] ?? exam.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{exam.exam_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">合計</p>
                  <p className="font-bold text-2xl text-slate-100">{total}</p>
                  <p className="text-xs text-slate-600">/{maxTotal}点</p>
                  <p className={"text-sm font-semibold " + (totalPct >= 80 ? "text-emerald-400" : totalPct >= 60 ? "text-amber-400" : "text-rose-400")}>
                    {totalPct}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {examResults.map((r) => {
                  const pct = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
                  const subColor = subjectColor[r.subject] ?? subjectColor["その他"];
                  return (
                    <div key={r.subject} className="flex items-center gap-3">
                      <span className={"text-xs px-2 py-1 rounded-lg font-medium w-12 text-center shrink-0 " + subColor}>
                        {r.subject}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>{r.score}/{r.max_score}点</span>
                          <span className={"font-semibold " + (pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400")}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                          <div
                            className={"h-1.5 rounded-full " + (pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500")}
                            style={{ width: pct + "%" }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }) : (
          <div className="card text-center text-slate-600 py-16">
            <p className="text-sm">まだ成績データがありません。</p>
            <p className="text-xs mt-1 text-slate-700">テスト後に先生が入力します。</p>
          </div>
        )}

      </main>
    </div>
  );
}
