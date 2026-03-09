import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 欠席連絡を送信するサーバーアクション
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
    student_user_id: studentId,
    submitted_by: user!.id,
    absence_date: absenceDate,
    type,
    reason: reason?.trim() || null,
    status: "pending",
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

  // 紐付いているお子様を取得
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_user_id, users!parent_student_links_student_user_id_fkey(full_name)")
    .eq("parent_user_id", user.id);

  // お子様の過去の欠席連絡（自分が提出したもの含む全件）
  const studentIds = links?.map((l) => l.student_user_id) ?? [];
  const { data: requests } = await supabase
    .from("absence_requests")
    .select("id, student_user_id, absence_date, type, reason, status, submitted_at, users!absence_requests_student_user_id_fkey(full_name)")
    .in("student_user_id", studentIds)
    .order("submitted_at", { ascending: false })
    .limit(20);

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/parent/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📝 欠席・遅刻連絡</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {links && links.length > 0 ? (
          <>
            {/* 欠席連絡フォーム */}
            <div className="card">
              <h2 className="font-bold text-gray-700 mb-4">📨 欠席・遅刻を連絡する</h2>
              <form action={submitAbsence} className="space-y-4">

                <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">お子様</label>
                  <select name="student_id" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">選択してください</option>
                    {links.map((l) => {
                      const name = (l.users as { full_name: string } | null)?.full_name ?? "—";
                      return (
                        <option key={l.student_user_id} value={l.student_user_id}>{name}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">日付</label>
                  <input type="date" name="absence_date" required
                    defaultValue={tomorrow}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold mb-2 block">種別</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-red-300 has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                      <input type="radio" name="type" value="absent" required className="accent-red-500" />
                      <div>
                        <p className="font-bold text-gray-800">欠席</p>
                        <p className="text-xs text-gray-400">当日お休みします</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-yellow-300 has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50">
                      <input type="radio" name="type" value="late" className="accent-yellow-500" />
                      <div>
                        <p className="font-bold text-gray-800">遅刻</p>
                        <p className="text-xs text-gray-400">遅れて行きます</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">理由（任意）</label>
                  <textarea name="reason" rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="例: 発熱のため、部活の試合のため" />
                </div>

                <button type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md">
                  連絡を送る
                </button>
              </form>
            </div>

            {/* 連絡履歴 */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
                📁 過去の欠席・遅刻連絡
              </h2>
              {requests && requests.length > 0 ? (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const studentName = (req.users as { full_name: string } | null)?.full_name ?? "—";
                    return (
                      <div key={req.id} className="card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800">{studentName}</span>
                              <span className={"text-xs px-2 py-0.5 rounded-full " + (req.type === "absent" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600")}>
                                {req.type === "absent" ? "欠席" : "遅刻"}
                              </span>
                              <span className="text-sm text-gray-600">{req.absence_date}</span>
                            </div>
                            {req.reason && <p className="text-xs text-gray-400 mt-1">理由: {req.reason}</p>}
                            <p className="text-xs text-gray-400 mt-1">
                              提出: {new Date(req.submitted_at).toLocaleString("ja-JP")}
                            </p>
                          </div>
                          <span className={"text-xs px-2 py-1 rounded-full shrink-0 " + (req.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600")}>
                            {req.status === "confirmed" ? "✓ 確認済み" : "⏳ 未確認"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center text-gray-400 py-8">欠席・遅刻連絡の履歴はありません</div>
              )}
            </section>
          </>
        ) : (
          <div className="card text-center text-gray-400 py-12">
            <p className="text-4xl mb-4">👶</p>
            <p>お子様のアカウントが紐付けられていません。</p>
            <p className="text-sm mt-1">塾の先生にお問い合わせください。</p>
          </div>
        )}

      </main>
    </div>
  );
}
