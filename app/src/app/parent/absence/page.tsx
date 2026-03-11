import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function submitAbsence(formData: FormData) {
  "use server";
  const studentId   = formData.get("student_id") as string;
  const absenceDate = formData.get("absence_date") as string;
  const type        = formData.get("type") as string;
  const reason      = formData.get("reason") as string || null;

  if (!studentId || !absenceDate || !type) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("absence_requests").insert({
    student_user_id: studentId, submitted_by: user!.id,
    absence_date: absenceDate, type, reason: reason?.trim() || null, status: "pending",
  });
  revalidatePath("/parent/absence");
}

export default async function ParentAbsencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") redirect("/");

  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_user_id, users!parent_student_links_student_user_id_fkey(full_name)")
    .eq("parent_user_id", user.id);

  const studentIds = links?.map((l) => l.student_user_id) ?? [];
  const { data: requests } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, status, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .in("student_user_id", studentIds)
    .order("submitted_at", { ascending: false })
    .limit(20);

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/parent/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">欠席・遅刻連絡</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {links && links.length > 0 ? (
          <>
            <div className="card">
              <h2 className="font-semibold text-slate-200 mb-4">欠席・遅刻を連絡する</h2>
              <form action={submitAbsence} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">お子様</label>
                  <select name="student_id" required className="form-dark">
                    <option value="">選択してください</option>
                    {links.map((l) => {
                      const name = (l.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                      return <option key={l.student_user_id} value={l.student_user_id}>{name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">日付</label>
                  <input type="date" name="absence_date" required defaultValue={tomorrow}
                    min={new Date().toISOString().split("T")[0]} className="form-dark" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-2 block">種別</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-rose-500/30 has-[:checked]:border-rose-500/40 has-[:checked]:bg-rose-500/5 transition-all">
                      <input type="radio" name="type" value="absent" required className="accent-rose-500" />
                      <div>
                        <p className="font-medium text-slate-200">欠席</p>
                        <p className="text-xs text-slate-500">当日お休みします</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-yellow-500/30 has-[:checked]:border-yellow-500/40 has-[:checked]:bg-yellow-500/5 transition-all">
                      <input type="radio" name="type" value="late" className="accent-yellow-500" />
                      <div>
                        <p className="font-medium text-slate-200">遅刻</p>
                        <p className="text-xs text-slate-500">遅れて行きます</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">理由（任意）</label>
                  <textarea name="reason" rows={3} className="form-dark" placeholder="例: 発熱のため、部活の試合のため" />
                </div>
                <button type="submit" className="btn-primary w-full py-3">連絡を送る</button>
              </form>
            </div>

            <section>
              <h2 className="section-title">過去の欠席・遅刻連絡</h2>
              {requests && requests.length > 0 ? (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const studentName = (req.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                    return (
                      <div key={req.id} className="card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-100">{studentName}</span>
                              <span className={"text-xs px-2 py-0.5 rounded-full " + (req.type === "absent" ? "bg-rose-500/10 text-rose-400" : "bg-yellow-500/10 text-yellow-400")}>
                                {req.type === "absent" ? "欠席" : "遅刻"}
                              </span>
                              <span className="text-sm text-slate-500">{req.absence_date}</span>
                            </div>
                            {req.reason && <p className="text-xs text-slate-600 mt-1">理由: {req.reason}</p>}
                            <p className="text-xs text-slate-600 mt-1">
                              提出: {new Date(req.submitted_at).toLocaleString("ja-JP")}
                            </p>
                          </div>
                          <span className={"text-xs px-2 py-1 rounded-full shrink-0 " + (req.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                            {req.status === "confirmed" ? "確認済み" : "未確認"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center text-slate-600 py-8">欠席・遅刻連絡の履歴はありません</div>
              )}
            </section>
          </>
        ) : (
          <div className="card text-center text-slate-600 py-12">
            <p className="text-sm">お子様のアカウントが紐付けられていません。</p>
            <p className="text-xs mt-1 text-slate-700">塾の先生にお問い合わせください。</p>
          </div>
        )}

      </main>
    </div>
  );
}
