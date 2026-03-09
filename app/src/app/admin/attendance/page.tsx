import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 欠席連絡を確認済みにするサーバーアクション
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

  // 本日の出席ログ
  const { data: todayLogs } = await supabase
    .from("attendance_logs")
    .select("id, student_user_id, check_in_at, check_out_at, method, location, users!attendance_logs_student_user_id_fkey(full_name)")
    .eq("logged_date", today)
    .order("check_in_at", { ascending: true });

  // 未確認の欠席連絡（新しい順）
  const { data: pendingAbsences } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  // 確認済みの欠席連絡（直近7件）
  const { data: confirmedAbsences } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .eq("status", "confirmed")
    .order("submitted_at", { ascending: false })
    .limit(7);

  const methodLabel: Record<string, string> = {
    qr: "QRコード",
    button: "ボタン",
    parent_button: "保護者ボタン",
  };
  const locationLabel: Record<string, string> = {
    classroom: "教室",
    home: "自宅",
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📋 出欠管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* 本日の出席 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            📅 本日の出席 ({today})
            <span className="ml-2 text-brand-600">{todayLogs?.length ?? 0}名</span>
          </h2>
          {todayLogs && todayLogs.length > 0 ? (
            <div className="space-y-2">
              {todayLogs.map((log) => {
                const name = (log.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={log.id} className="card flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-800">{name}</span>
                      <span className="ml-3 text-xs text-gray-400">
                        {methodLabel[log.method]} / {locationLabel[log.location]}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-500">
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
            <div className="card text-center text-gray-400 py-8">本日の出席記録はありません</div>
          )}
        </section>

        {/* 未確認の欠席連絡 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            ⚠️ 未確認の欠席連絡
            {pendingAbsences && pendingAbsences.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                {pendingAbsences.length}件
              </span>
            )}
          </h2>
          {pendingAbsences && pendingAbsences.length > 0 ? (
            <div className="space-y-3">
              {pendingAbsences.map((req) => {
                const name = (req.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={req.id} className="card border-orange-200 bg-orange-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${req.type === "absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {req.type === "absent" ? "欠席" : "遅刻"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          📅 {req.absence_date}
                        </p>
                        {req.reason && (
                          <p className="text-sm text-gray-500 mt-1">理由: {req.reason}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          提出: {new Date(req.submitted_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <form action={confirmAbsence}>
                        <input type="hidden" name="id" value={req.id} />
                        <button
                          type="submit"
                          className="btn-primary text-sm py-2 px-4 bg-brand-600 hover:bg-brand-700"
                        >
                          確認済み ✓
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-6">未確認の欠席連絡はありません ✅</div>
          )}
        </section>

        {/* 確認済みの欠席連絡（直近） */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📁 確認済み欠席連絡（直近7件）</h2>
          {confirmedAbsences && confirmedAbsences.length > 0 ? (
            <div className="space-y-2">
              {confirmedAbsences.map((req) => {
                const name = (req.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={req.id} className="card opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-700">{name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${req.type === "absent" ? "bg-red-50 text-red-500" : "bg-yellow-50 text-yellow-600"}`}>
                          {req.type === "absent" ? "欠席" : "遅刻"}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{req.absence_date}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">確認済み ✓</span>
                    </div>
                    {req.reason && <p className="text-xs text-gray-400 mt-1 ml-0.5">理由: {req.reason}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-6">確認済みの欠席連絡はありません</div>
          )}
        </section>

      </main>
    </div>
  );
}
