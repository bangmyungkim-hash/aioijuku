import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ParentStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") redirect("/");

  const { data: link } = await supabase
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", user.id)
    .eq("student_user_id", studentId)
    .single();

  if (!link) redirect("/parent/dashboard");

  const { data: student } = await supabase
    .from("users")
    .select("full_name, email, student_profiles(grade, school_name, enrollment_date)")
    .eq("id", studentId)
    .single();

  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count, last_learning_date")
    .eq("student_user_id", studentId)
    .single();

  const { data: attendance } = await supabase
    .from("attendance_logs")
    .select("logged_date, check_in_at, check_out_at, method, location")
    .eq("student_user_id", studentId)
    .order("logged_date", { ascending: false })
    .limit(14);

  const { data: results } = await supabase
    .from("exam_results")
    .select("id, subject, score, max_score, exams(name, exam_date, type)")
    .eq("student_user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: absences } = await supabase
    .from("absence_requests")
    .select("absence_date, type, reason, status")
    .eq("student_user_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(5);

  const studentProfile = (student?.student_profiles as unknown as { grade: string; school_name: string; enrollment_date: string } | null);
  const methodLabel: Record<string, string> = { qr: "QR", button: "ボタン", parent_button: "保護者" };
  const locationLabel: Record<string, string> = { classroom: "教室", home: "自宅" };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/parent/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">お子様の状況</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* 生徒プロフィール */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-amber-400"
                 style={{ background: "rgba(212, 168, 67, 0.1)", border: "1px solid rgba(212, 168, 67, 0.2)" }}>
              {student?.full_name?.charAt(0) ?? "?"}
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-100">{student?.full_name}</h2>
              <p className="text-sm text-slate-500">
                {studentProfile?.grade ?? "—"} / {studentProfile?.school_name ?? "—"}
              </p>
              {studentProfile?.enrollment_date && (
                <p className="text-xs text-slate-600">入塾: {studentProfile.enrollment_date}</p>
              )}
            </div>
          </div>
        </div>

        {/* 学習記録 */}
        <section>
          <h2 className="section-title">学習記録</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="累積" value={stats?.total_days ?? 0} unit="日" accent="amber" />
            <StatCard label="連続" value={stats?.current_streak ?? 0} unit="日" accent="emerald" />
            <StatCard label="復活" value={stats?.revival_count ?? 0} unit="回" accent="sky" />
          </div>
          {stats?.last_learning_date && (
            <p className="text-xs text-slate-600 text-center mt-2">最終学習日: {stats.last_learning_date}</p>
          )}
        </section>

        {/* 直近の出席 */}
        <section>
          <h2 className="section-title">直近の出席記録（2週間）</h2>
          {attendance && attendance.length > 0 ? (
            <div className="space-y-2">
              {attendance.map((a) => (
                <div key={a.logged_date} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-300">{a.logged_date}</span>
                    <span className="text-xs text-slate-600">
                      {locationLabel[a.location]}（{methodLabel[a.method]}）
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {a.check_in_at
                      ? new Date(a.check_in_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                    {a.check_out_at && (
                      <span className="ml-1">
                        〜 {new Date(a.check_out_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-6">出席記録がありません</div>
          )}
        </section>

        {/* 成績 */}
        <section>
          <h2 className="section-title">成績</h2>
          {results && results.length > 0 ? (
            <div className="space-y-2">
              {results.slice(0, 10).map((r) => {
                const exam = r.exams as unknown as { name: string; exam_date: string; type: string } | null;
                const pct = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
                return (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-300">{exam?.name ?? "—"}</span>
                      <span className="mx-2 text-slate-700">|</span>
                      <span className="text-sm text-slate-500">{r.subject}</span>
                      {exam?.exam_date && <span className="text-xs text-slate-600 ml-2">{exam.exam_date}</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-100">{r.score}</span>
                      <span className="text-xs text-slate-600">/{r.max_score}</span>
                      <span className={"ml-1 text-sm font-semibold " + (pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-rose-400")}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-6">成績データがありません</div>
          )}
        </section>

        {/* 欠席連絡履歴 */}
        {absences && absences.length > 0 && (
          <section>
            <h2 className="section-title">欠席・遅刻の履歴</h2>
            <div className="space-y-2">
              {absences.map((a) => (
                <div key={a.absence_date + a.type} className="card flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-300">{a.absence_date}</span>
                    <span className={"ml-2 text-xs px-2 py-0.5 rounded-full " + (a.type === "absent" ? "bg-rose-500/10 text-rose-400" : "bg-yellow-500/10 text-yellow-400")}>
                      {a.type === "absent" ? "欠席" : "遅刻"}
                    </span>
                    {a.reason && <span className="ml-2 text-xs text-slate-600">{a.reason}</span>}
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (a.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                    {a.status === "confirmed" ? "確認済み" : "未確認"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

function StatCard({
  label, value, unit, accent,
}: {
  label: string; value: number; unit: string;
  accent: "amber" | "emerald" | "sky";
}) {
  const accentMap = {
    amber:   { text: "text-amber-400",   border: "border-amber-500/20" },
    emerald: { text: "text-emerald-400", border: "border-emerald-500/20" },
    sky:     { text: "text-sky-400",     border: "border-sky-500/20" },
  };
  const a = accentMap[accent];
  return (
    <div className={`stat-card ${a.border} border`}>
      <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{unit}</div>
      <div className="text-xs text-slate-600 mt-1">{label}</div>
    </div>
  );
}
