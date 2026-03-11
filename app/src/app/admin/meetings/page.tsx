import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function addMeeting(formData: FormData) {
  "use server";
  const studentId    = formData.get("student_id") as string;
  const meetingDate  = formData.get("meeting_date") as string;
  const meetingType  = formData.get("meeting_type") as string;
  const content      = formData.get("content") as string;
  const isVisible    = formData.get("is_visible") === "on";

  if (!studentId || !meetingDate || !meetingType || !content?.trim()) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("meeting_records").insert({
    student_user_id: studentId, admin_user_id: user!.id, meeting_date: meetingDate,
    type: meetingType, content: content.trim(), is_visible_to_parent: isVisible,
  });
  revalidatePath("/admin/meetings");
}

export default async function AdminMeetingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: students } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "student")
    .eq("is_active", true)
    .order("full_name");

  const { data: meetings } = await supabase
    .from("meeting_records")
    .select("id, meeting_date, type, content, is_visible_to_parent, created_at, users!meeting_records_student_user_id_fkey(full_name)")
    .order("meeting_date", { ascending: false })
    .limit(30);

  const meetingTypeLabel: Record<string, string> = {
    parent_teacher: "保護者面談", student_teacher: "生徒面談", online: "オンライン面談", other: "その他",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">面談記録</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">新しい面談記録</h2>
          <form action={addMeeting} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">生徒</label>
                <select name="student_id" required className="form-dark">
                  <option value="">選択してください</option>
                  {students?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">面談日</label>
                <input type="date" name="meeting_date" required
                  defaultValue={new Date().toISOString().split("T")[0]} className="form-dark" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">面談種別</label>
              <select name="meeting_type" required className="form-dark">
                <option value="parent_teacher">保護者面談</option>
                <option value="student_teacher">生徒面談</option>
                <option value="online">オンライン面談</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1 block">面談内容・メモ</label>
              <textarea name="content" required rows={4} className="form-dark"
                placeholder="面談の内容・次回へのアクション・気になった点などを記録してください" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_visible" id="is_visible" className="rounded accent-amber-500" />
              <label htmlFor="is_visible" className="text-sm text-slate-400">保護者・生徒にも公開する</label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-2">記録する</button>
            </div>
          </form>
        </div>

        <section>
          <h2 className="section-title">面談記録一覧（直近30件）</h2>
          {meetings && meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map((m) => {
                const studentName = (m.users as unknown as { full_name: string } | null)?.full_name ?? "—";
                return (
                  <div key={m.id} className="card">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-100">{studentName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                          {meetingTypeLabel[m.type] ?? m.type}
                        </span>
                        {m.is_visible_to_parent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">公開中</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-slate-500 whitespace-nowrap">{m.meeting_date}</span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{m.content}</p>
                    <p className="text-xs text-slate-600 mt-2">記録: {new Date(m.created_at).toLocaleString("ja-JP")}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-slate-600 py-10">
              面談記録がありません。<br />上のフォームから記録してください。
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
