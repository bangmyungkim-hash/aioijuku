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

  // 自分の成績（試験情報付き）
  const { data: results } = await supabase
    .from("exam_results")
    .select("id, subject, score, max_score, exams(id, name, type, exam_date)")
    .eq("student_user_id", user.id)
    .order("created_at", { ascending: false });

  // 試験ごとにグループ化
  const examMap: Record<string, {
    exam: { id: string; name: string; type: string; exam_date: string };
    results: Array<{ subject: string; score: number; max_score: number }>;
  }> = {};

  results?.forEach((r) => {
    const exam = r.exams as unknown as { id: string; name: string; type: string; exam_date: string } | null;
    if (!exam) return;
    if (!examMap[exam.id]) {
      examMap[exam.id] = { exam, results: [] };
    }
    examMap[exam.id].results.push({
      subject: r.subject,
      score: r.score,
      max_score: r.max_score,
    });
  });

  const examTypeLabel: Record<string, string> = {
    school_test: "定期テスト",
    mock_exam: "模擬試験",
  };

  const subjectColor: Record<string, string> = {
    国語: "bg-red-50 text-red-700",
    数学: "bg-blue-50 text-blue-700",
    英語: "bg-green-50 text-green-700",
    理科: "bg-purple-50 text-purple-700",
    社会: "bg-orange-50 text-orange-700",
    その他: "bg-gray-50 text-gray-600",
  };

  const examGroups = Object.values(examMap).sort((a, b) =>
    b.exam.exam_date.localeCompare(a.exam.exam_date)
  );

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/student/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📈 成績管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {examGroups.length > 0 ? examGroups.map(({ exam, results: examResults }) => {
          const total     = examResults.reduce((sum, r) => sum + r.score, 0);
          const maxTotal  = examResults.reduce((sum, r) => sum + r.max_score, 0);
          const totalPct  = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

          return (
            <div key={exam.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-gray-800 text-base">{exam.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                      {examTypeLabel[exam.type] ?? exam.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{exam.exam_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">合計</p>
                  <p className="font-extrabold text-2xl text-gray-800">{total}</p>
                  <p className="text-xs text-gray-400">/{maxTotal}点</p>
                  <p className={"text-sm font-bold " + (totalPct >= 80 ? "text-brand-600" : totalPct >= 60 ? "text-orange-500" : "text-red-500")}>
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
                      <span className={"text-xs px-2 py-1 rounded-lg font-bold w-12 text-center shrink-0 " + subColor}>
                        {r.subject}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{r.score}/{r.max_score}点</span>
                          <span className={"font-bold " + (pct >= 80 ? "text-brand-600" : pct >= 60 ? "text-orange-500" : "text-red-500")}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={"h-1.5 rounded-full " + (pct >= 80 ? "bg-brand-500" : pct >= 60 ? "bg-orange-400" : "bg-red-400")}
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
          <div className="card text-center text-gray-400 py-16">
            <p className="text-4xl mb-4">📊</p>
            <p>まだ成績データがありません。</p>
            <p className="text-sm mt-1">テスト後に先生が入力します。</p>
          </div>
        )}

      </main>
    </div>
  );
}
