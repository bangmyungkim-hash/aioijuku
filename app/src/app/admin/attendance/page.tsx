import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function confirmAbsence(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase
    .from("absence_requests")
    .update({ status: "confirmed" })
    .eq("id", id);
  revalidatePath("/admin/attendance");
}

export default async function AdminAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1).toISOString().split("T")[0];
  const monthEnd   = new Date(year, month + 1, 0).toISOString().split("T")[0];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const { data: todayLogs } = await supabase
    .from("attendance_logs")
    .select("id, student_user_id, check_in_at, check_out_at, method, location, users!attendance_logs_student_user_id_fkey(full_name)")
    .eq("logged_date", today)
    .order("check_in_at", { ascending: true });

  const { data: monthLogs } = await supabase
    .from("attendance_logs")
    .select("logged_date, student_user_id")
    .gte("logged_date", monthStart)
    .lte("logged_date", monthEnd);

  const { data: monthAbsences } = await supabase
    .from("absence_requests")
    .select("absence_date, type")
    .gte("absence_date", monthStart)
    .lte("absence_date", monthEnd);

  const { data: pendingAbsences } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  const { data: confirmedAbsences } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .eq("status", "confirmed")
    .order("submitted_at", { ascending: false })
    .limit(7);

  const attendanceByDate: Record<string, number> = {};
  for (const log of monthLogs ?? []) {
    attendanceByDate[log.logged_date] = (attendanceByDate[log.logged_date] ?? 0) + 1;
  }

  const absenceByDate: Record<string, number> = {};
  for (const ab of monthAbsences ?? []) {
    absenceByDate[ab.absence_date] = (absenceByDate[ab.absence_date] ?? 0) + 1;
  }

  const methodLabel: Record<string, string> = { qr: "QRコード", button: "ボタン", parent_button: "保護者ボタン" };
  const locationLabel: Record<string, string> = { classroom: "教室", home: "自宅" };
  const monthLabel = now.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">出欠管理</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* カレンダー */}
        <section>
          <h2 className="section-title">月間カレンダー（{monthLabel}）</h2>
          <div className="card p-0 overflow-hidden">
            <div className="flex gap-4 px-4 py-2.5 border-b border-slate-800 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" /> 出席あり</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" /> 欠席連絡</span>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-800">
              {weekDays.map((d, i) => (
                <div key={d} className={`text-center text-xs font-medium py-2 ${i === 0 ? "text-rose-400/70" : i === 6 ? "text-sky-400/70" : "text-slate-500"}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={"empty-" + i} className="h-16 border-b border-r border-slate-800/50" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === today;
                const attendCount = attendanceByDate[dateStr] ?? 0;
                const absenceCount = absenceByDate[dateStr] ?? 0;
                const dayOfWeek = (firstDayOfWeek + i) % 7;

                return (
                  <div
                    key={day}
                    className={`h-16 border-b border-r border-slate-800/50 p-1 flex flex-col ${isToday ? "bg-amber-500/5" : ""}`}
                  >
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-amber-500 text-white" :
                      dayOfWeek === 0 ? "text-rose-400/70" :
                      dayOfWeek === 6 ? "text-sky-400/70" : "text-slate-400"
                    }`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {attendCount > 0 && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 rounded px-1 leading-4 font-medium">
                          出席 {attendCount}名
                        </span>
                      )}
                      {absenceCount > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 rounded px-1 leading-4 font-medium">
                          欠席 {absenceCount}件
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 本日の出席 */}
        <section>
          <h2 className="section-title">
            本日の出席 ({today})
            <span className="ml-2 text-amber-400">{todayLogs?.length ?? 0}名</span>
          </h2>
          {todayLogs && todayLogs.length > 0 ? (
            <div className="space-y-2">
              {todayLogs.map((log) => {
                const name = (log.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={log.id} className="card flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-100">{name}</span>
                      <span className="ml-3 text-xs text-slate-500">
                        {methodLabel[log.method]} / {locationLabel[log.location]}
                      </span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {log.check_in_at
                        ? new Date(log.check_in_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) + " 入室"
                        : "—"}
                      {log.check_out_at && (
                        <span className="ml-2">
                          {new Date(log.check_out_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 退室
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-8">本日の出席記録はありません</div>
          )}
        </section>

        {/* 未確認の欠席連絡 */}
        <section>
          <h2 className="section-title">
            未確認の欠席連絡
            {pendingAbsences && pendingAbsences.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs normal-case">
                {pendingAbsences.length}件
              </span>
            )}
          </h2>
          {pendingAbsences && pendingAbsences.length > 0 ? (
            <div className="space-y-3">
              {pendingAbsences.map((req) => {
                const name = (req.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={req.id} className="card" style={{ borderColor: "rgba(245, 158, 11, 0.2)" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-100">{name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${req.type === "absent" ? "bg-rose-500/10 text-rose-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                            {req.type === "absent" ? "欠席" : "遅刻"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{req.absence_date}</p>
                        {req.reason && <p className="text-sm text-slate-500 mt-1">理由: {req.reason}</p>}
                        <p className="text-xs text-slate-600 mt-1">
                          提出: {new Date(req.submitted_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <form action={confirmAbsence}>
                        <input type="hidden" name="id" value={req.id} />
                        <button type="submit" className="btn-primary text-sm py-2 px-4">
                          確認済み
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-6">未確認の欠席連絡はありません</div>
          )}
        </section>

        {/* 確認済みの欠席連絡 */}
        <section>
          <h2 className="section-title">確認済み欠席連絡（直近7件）</h2>
          {confirmedAbsences && confirmedAbsences.length > 0 ? (
            <div className="space-y-2">
              {confirmedAbsences.map((req) => {
                const name = (req.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={req.id} className="card opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-300">{name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${req.type === "absent" ? "bg-rose-500/5 text-rose-400/60" : "bg-yellow-500/5 text-yellow-400/60"}`}>
                          {req.type === "absent" ? "欠席" : "遅刻"}
                        </span>
                        <span className="ml-2 text-xs text-slate-600">{req.absence_date}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">確認済み</span>
                    </div>
                    {req.reason && <p className="text-xs text-slate-600 mt-1 ml-0.5">理由: {req.reason}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-6">確認済みの欠席連絡はありません</div>
          )}
        </section>

      </main>
    </div>
  );
}
