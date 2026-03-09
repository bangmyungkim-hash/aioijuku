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

  // 保護者↔生徒の紐付き確認（自分のお子様かどうか）
  const { data: link } = await supabase
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", user.id)
    .eq("student_user_id", studentId)
    .single();

  if (!link) redirect("/parent/dashboard");

  // 生徒の基本情報
  const { data: student } = await supabase
    .from("users")
    .select("full_name, email, student_profiles(grade, school_name, enrollment_date)")
    .eq("id", studentId)
    .single();

  // ゲーミフィケーション
  const { data: stats } = await supabase
    .from("gamification_stats")
    .select("total_days, current_streak, revival_count, last_learning_date")
    .eq("student_user_id", studentId)
    .single();

  // 直近の出席ログ（30件）
  const { data: attendance } = await supabase
    .from("attendance_logs")
    .select("logged_date, check_in_at, check_out_at, method, location")
    .eq("student_user_id", studentId)
    .order("logged_date", { ascending: false })
    .limit(14);

  // 成績（試験情報付き）
  const { data: results } = await supabase
    .from("exam_results")
    .select("id, subject, score, max_score, exams(name, exam_date, type)")
    .eq("student_user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  // 欠席連絡の履歴
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
    <div className="min-h-screen bg-brand-50">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/parent/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">👧 お子様の状況</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 生徒プロフィール */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
              👧
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-gray-800">{student?.full_name}</h2>
              <p className="text-sm text-gray-500">
                {studentProfile?.grade ?? "—"} / {studentProfile?.school_name ?? "—"}
              </p>
              {studentProfile?.enrollment_date && (
                <p className="text-xs text-gray-400">
                  入塾: {studentProfile.enrollment_date}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 学習記録 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📊 学習記録</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="累積" value={stats?.total_days ?? 0} unit="日" color="green" />
            <StatCard label="連続" value={stats?.current_streak ?? 0} unit="日" color="orange" />
            <StatCard label="復活" value={stats?.revival_count ?? 0} unit="回" color="blue" />
          </div>
          {stats?.last_learning_date && (
            <p className="text-xs text-gray-400 text-center mt-2">
              最終学習日: {stats.last_learning_date}
            </p>
          )}
        </section>

        {/* 直近の出席 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📋 直近の出席記録（2週間）</h2>
          {attendance && attendance.length > 0 ? (
            <div className="space-y-2">
              {attendance.map((a) => (
                <div key={a.logged_date} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700">{a.logged_date}</span>
                    <span className="text-xs text-gray-400">
                      {locationLabel[a.location]}（{methodLabel[a.method]}）
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
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
            <div className="card text-center text-gray-400 py-6">出席記録がありません</div>
          )}
        </section>

        {/* 成績 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📈 成績</h2>
          {results && results.length > 0 ? (
            <div className="space-y-2">
              {results.slice(0, 10).map((r) => {
                const exam = r.exams as unknown as { name: string; exam_date: string; type: string } | null;
                const pct = r.max_score > 0 ? Math.round((r.score / r.max_score) * 100) : 0;
                return (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-gray-700">{exam?.name ?? "—"}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-sm text-gray-500">{r.subject}</span>
                      {exam?.exam_date && <span className="text-xs text-gray-400 ml-2">{exam.exam_date}</span>}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-800">{r.score}</span>
                      <span className="text-xs text-gray-400">/{r.max_score}</span>
                      <span className={"ml-1 text-sm font-bold " + (pct >= 80 ? "text-brand-600" : pct >= 60 ? "text-orange-500" : "text-red-500")}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-6">成績データがありません</div>
          )}
        </section>

        {/* 欠席連絡履歴 */}
        {absences && absences.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📝 欠席・遅刻の履歴</h2>
            <div className="space-y-2">
              {absences.map((a) => (
                <div key={a.absence_date + a.type} className="card flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-700">{a.absence_date}</span>
                    <span className={"ml-2 text-xs px-2 py-0.5 rounded-full " + (a.type === "absent" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600")}>
                      {a.type === "absent" ? "欠席" : "遅刻"}
                    </span>
                    {a.reason && <span className="ml-2 text-xs text-gray-400">{a.reason}</span>}
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (a.status === "confirmed" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
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
  label, value, unit, color,
}: {
  label: string; value: number; unit: string;
  color: "green" | "orange" | "blue";
}) {
  const colorMap = {
    green:  "bg-brand-100 text-brand-700",
    orange: "bg-orange-100 text-orange-700",
    blue:   "bg-blue-100 text-blue-700",
  };
  return (
    <div className={"rounded-2xl p-4 text-center " + colorMap[color]}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs font-bold mt-0.5">{unit}</div>
      <div className="text-xs opacity-70 mt-1">{label}</div>
    </div>
  );
}
