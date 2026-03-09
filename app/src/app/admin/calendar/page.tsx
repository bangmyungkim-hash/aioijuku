import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// イベントを追加するサーバーアクション
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
    title: title.trim(),
    start_date: startDate,
    end_date: endDate || startDate,
    type,
    memo: memo?.trim() || null,
  });
  revalidatePath("/admin/calendar");
  revalidatePath("/calendar");
}

// イベントを削除するサーバーアクション
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
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // 今後3ヶ月のイベント
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: upcomingEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .gte("start_date", today)
    .lte("start_date", threeMonthsLater)
    .order("start_date", { ascending: true });

  // 過去のイベント（直近10件）
  const { data: pastEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .lt("start_date", today)
    .order("start_date", { ascending: false })
    .limit(10);

  const eventTypeConfig: Record<string, { label: string; color: string; emoji: string }> = {
    holiday:  { label: "休校日",   color: "bg-red-100 text-red-700",    emoji: "🔴" },
    lecture:  { label: "特別授業", color: "bg-blue-100 text-blue-700",  emoji: "📚" },
    exam:     { label: "試験",     color: "bg-orange-100 text-orange-700", emoji: "✏️" },
    other:    { label: "その他",   color: "bg-gray-100 text-gray-600",  emoji: "📌" },
  };

  function EventCard({ event, showDelete = false }: { event: typeof upcomingEvents extends (infer T)[] | null ? T : never; showDelete?: boolean }) {
    const config = eventTypeConfig[event.type] ?? eventTypeConfig.other;
    const isSingleDay = !event.end_date || event.end_date === event.start_date;
    return (
      <div className="card flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{config.emoji}</span>
            <span className="font-bold text-gray-800">{event.title}</span>
            <span className={"text-xs px-2 py-0.5 rounded-full " + config.color}>{config.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isSingleDay ? event.start_date : event.start_date + " 〜 " + event.end_date}
          </p>
          {event.memo && <p className="text-xs text-gray-400 mt-1">{event.memo}</p>}
        </div>
        {showDelete && (
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <button type="submit"
              className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
              削除
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📅 カレンダー管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* イベント追加フォーム */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">➕ イベント・休校日を追加</h2>
          <form action={addEvent} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-bold mb-1 block">タイトル</label>
              <input type="text" name="title" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="例: 夏期講習、祝日（海の日）、中間テスト対策" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-bold mb-1 block">開始日</label>
                <input type="date" name="start_date" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold mb-1 block">終了日（複数日の場合）</label>
                <input type="date" name="end_date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold mb-1 block">種別</label>
                <select name="type" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="holiday">休校日 🔴</option>
                  <option value="lecture">特別授業 📚</option>
                  <option value="exam">試験 ✏️</option>
                  <option value="other">その他 📌</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold mb-1 block">メモ（任意）</label>
              <input type="text" name="memo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="補足情報があれば入力" />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-2">追加する</button>
            </div>
          </form>
        </div>

        {/* 今後のイベント */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            📅 今後のイベント（90日以内）
            <span className="ml-2 text-brand-600">{upcomingEvents?.length ?? 0}件</span>
          </h2>
          {upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <EventCard key={e.id} event={e} showDelete={true} />
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-8">
              予定されているイベントはありません
            </div>
          )}
        </section>

        {/* 過去のイベント */}
        {pastEvents && pastEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">📁 過去のイベント（直近10件）</h2>
            <div className="space-y-2 opacity-60">
              {pastEvents.map((e) => (
                <EventCard key={e.id} event={e} showDelete={false} />
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
