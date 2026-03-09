import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 今後3ヶ月のイベント
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: upcomingEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .gte("start_date", today)
    .lte("start_date", threeMonthsLater)
    .order("start_date", { ascending: true });

  // 先月分のイベント（振り返り）
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: pastEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .gte("start_date", oneMonthAgo)
    .lt("start_date", today)
    .order("start_date", { ascending: false });

  const eventTypeConfig: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
    holiday:  { label: "休校日",   bg: "bg-red-50",     text: "text-red-700",    emoji: "🔴" },
    lecture:  { label: "特別授業", bg: "bg-blue-50",    text: "text-blue-700",   emoji: "📚" },
    exam:     { label: "試験",     bg: "bg-orange-50",  text: "text-orange-700", emoji: "✏️" },
    other:    { label: "その他",   bg: "bg-gray-50",    text: "text-gray-600",   emoji: "📌" },
  };

  // ダッシュボードへのリンクをロール別に決定
  const dashboardHref =
    profile.role === "admin"   ? "/admin/dashboard" :
    profile.role === "parent"  ? "/parent/dashboard" :
    "/student/dashboard";

  // イベントを月ごとにグループ化
  const monthGroups: Record<string, typeof upcomingEvents> = {};
  upcomingEvents?.forEach((e) => {
    const ym = e.start_date.slice(0, 7); // "YYYY-MM"
    if (!monthGroups[ym]) monthGroups[ym] = [];
    monthGroups[ym]!.push(e);
  });

  function formatMonth(ym: string) {
    const [year, month] = ym.split("-");
    return year + "年" + parseInt(month) + "月";
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href={dashboardHref} className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📅 カレンダー</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 凡例 */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(eventTypeConfig).map(([key, cfg]) => (
            <span key={key} className={"text-xs px-3 py-1 rounded-full " + cfg.bg + " " + cfg.text}>
              {cfg.emoji} {cfg.label}
            </span>
          ))}
        </div>

        {/* 今後のイベント（月別） */}
        {Object.keys(monthGroups).length > 0 ? (
          Object.entries(monthGroups).map(([ym, events]) => (
            <section key={ym}>
              <h2 className="text-base font-extrabold text-gray-700 mb-3 px-1">
                {formatMonth(ym)}
              </h2>
              <div className="space-y-2">
                {events!.map((e) => {
                  const cfg = eventTypeConfig[e.type] ?? eventTypeConfig.other;
                  const isSingleDay = !e.end_date || e.end_date === e.start_date;
                  return (
                    <div key={e.id} className={"card flex items-start gap-4 " + cfg.bg}>
                      <div className="text-center shrink-0 w-12">
                        <p className="text-2xl">{cfg.emoji}</p>
                        <p className="text-xs font-bold text-gray-600">
                          {parseInt(e.start_date.slice(8))}日
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800">{e.title}</span>
                          <span className={"text-xs px-2 py-0.5 rounded-full " + cfg.bg + " " + cfg.text + " border border-current border-opacity-20"}>
                            {cfg.label}
                          </span>
                        </div>
                        {!isSingleDay && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {e.start_date} 〜 {e.end_date}
                          </p>
                        )}
                        {e.memo && <p className="text-xs text-gray-400 mt-1">{e.memo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="card text-center text-gray-400 py-16">
            <p className="text-4xl mb-4">📅</p>
            <p>今後3ヶ月の予定はありません</p>
          </div>
        )}

        {/* 過去のイベント */}
        {pastEvents && pastEvents.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 mb-3 px-1">📁 先月の記録</h2>
            <div className="space-y-2 opacity-60">
              {pastEvents.map((e) => {
                const cfg = eventTypeConfig[e.type] ?? eventTypeConfig.other;
                return (
                  <div key={e.id} className="card flex items-center gap-3">
                    <span className="text-lg">{cfg.emoji}</span>
                    <div>
                      <span className="text-sm font-bold text-gray-700">{e.title}</span>
                      <span className="ml-2 text-xs text-gray-400">{e.start_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
