import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function addEvent(formData: FormData) {
  "use server";
  const title     = formData.get("title") as string;
  const startDate = formData.get("start_date") as string;
  const endDate   = formData.get("end_date") as string || null;
  const type      = formData.get("type") as string;
  const memo      = formData.get("memo") as string || null;
  if (!title?.trim() || !startDate || !type) return;
  const supabase = await createClient();
  await supabase.from("calendar_events").insert({
    title: title.trim(), start_date: startDate, end_date: endDate || startDate, type, memo: memo?.trim() || null,
  });
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}

async function deleteEvent(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}

export default async function AdminCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const today = new Date().toISOString().split("T")[0];
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: upcomingEvents } = await supabase
    .from("calendar_events").select("id, title, start_date, end_date, type, memo")
    .gte("start_date", today).lte("start_date", threeMonthsLater).order("start_date", { ascending: true });
  const { data: pastEvents } = await supabase
    .from("calendar_events").select("id, title, start_date, end_date, type, memo")
    .lt("start_date", today).order("start_date", { ascending: false }).limit(10);

  const eventTypeConfig: Record<string, { label: string; color: string }> = {
    holiday:  { label: "休校日",   color: "bg-rose-100 text-rose-700" },
    lecture:  { label: "特別授業", color: "bg-sky-100 text-sky-700" },
    exam:     { label: "試験",     color: "bg-amber-100 text-amber-700" },
    other:    { label: "その他",   color: "bg-stone-100 text-stone-600" },
  };

  function EventCard({ event, showDelete = false }: { event: typeof upcomingEvents extends (infer T)[] | null ? T : never; showDelete?: boolean }) {
    const config = eventTypeConfig[event.type] ?? eventTypeConfig.other;
    const isSingleDay = !event.end_date || event.end_date === event.start_date;
    return (
      <div className="card flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-800">{event.title}</span>
            <span className={"text-xs px-2 py-0.5 rounded-full " + config.color}>{config.label}</span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            {isSingleDay ? event.start_date : event.start_date + " 〜 " + event.end_date}
          </p>
          {event.memo && <p className="text-xs text-stone-400 mt-1">{event.memo}</p>}
        </div>
        {showDelete && (
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button type="submit"
              className="text-xs text-rose-600 hover:text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition">
              削除
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>カレンダー管理</span>
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
          <h2 className="font-semibold text-stone-800 mb-4">イベント・休校日を追加</h2>
          <form action={addEvent} className="space-y-3">
            <div>
              <label className="text-xs text-stone-500 font-medium mb-1 block">タイトル</label>
              <input type="text" name="title" required className="form-dark"
                     placeholder="例: 夏期講習、祝日（海の日）、中間テスト対策" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">開始日</label>
                <input type="date" name="start_date" required className="form-dark" />
              </div>
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">終了日（複数日の場合）</label>
                <input type="date" name="end_date" className="form-dark" />
              </div>
              <div>
                <label className="text-xs text-stone-500 font-medium mb-1 block">種別</label>
                <select name="type" required className="form-dark">
                  <option value="holiday">休校日</option>
                  <option value="lecture">特別授業</option>
                  <option value="exam">試験</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium mb-1 block">メモ（任意）</label>
              <input type="text" name="memo" className="form-dark" placeholder="補足情報があれば入力" />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-2">追加する</button>
            </div>
          </form>
        </div>

        <section>
          <h2 className="section-title">
            今後のイベント（90日以内）
            <span className="ml-2 text-amber-700 normal-case">{upcomingEvents?.length ?? 0}件</span>
          </h2>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((e) => <EventCard key={e.id} event={e} showDelete={true} />)}
            </div>
          ) : (
            <div className="card text-center text-stone-400 py-8">予定されているイベントはありません</div>
          )}
        </section>

        {pastEvents && pastEvents.length > 0 && (
          <section>
            <h2 className="section-title">過去のイベント（直近10件）</h2>
            <div className="space-y-2 opacity-50">
              {pastEvents.map((e) => <EventCard key={e.id} event={e} showDelete={false} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
