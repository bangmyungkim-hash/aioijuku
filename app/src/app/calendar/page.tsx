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

  const today = new Date().toISOString().split("T")[0];
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: upcomingEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .gte("start_date", today)
    .lte("start_date", threeMonthsLater)
    .order("start_date", { ascending: true });

  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: pastEvents } = await supabase
    .from("calendar_events")
    .select("id, title, start_date, end_date, type, memo")
    .gte("start_date", oneMonthAgo)
    .lt("start_date", today)
    .order("start_date", { ascending: false });

  const eventTypeConfig: Record<string, { label: string; color: string }> = {
    holiday:  { label: "休校日",   color: "bg-rose-500/10 text-rose-400" },
    lecture:  { label: "特別授業", color: "bg-sky-500/10 text-sky-400" },
    exam:     { label: "試験",     color: "bg-amber-500/10 text-amber-400" },
    other:    { label: "その他",   color: "bg-slate-700/50 text-slate-400" },
  };

  const dashboardHref =
    profile.role === "admin"   ? "/admin/dashboard" :
    profile.role === "parent"  ? "/parent/dashboard" :
    "/student/dashboard";

  const monthGroups: Record<string, typeof upcomingEvents> = {};
  upcomingEvents?.forEach((e) => {
    const ym = e.start_date.slice(0, 7);
    if (!monthGroups[ym]) monthGroups[ym] = [];
    monthGroups[ym]!.push(e);
  });

  function formatMonth(ym: string) {
    const [year, month] = ym.split("-");
    return year + "年" + parseInt(month) + "月";
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href={dashboardHref} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">カレンダー</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* 凡例 */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(eventTypeConfig).map(([key, cfg]) => (
            <span key={key} className={"text-xs px-3 py-1 rounded-full " + cfg.color}>{cfg.label}</span>
          ))}
        </div>

        {/* 今後のイベント（月別） */}
        {Object.keys(monthGroups).length > 0 ? (
          Object.entries(monthGroups).map(([ym, events]) => (
            <section key={ym}>
              <h2 className="text-base font-semibold text-slate-200 mb-3 px-1">{formatMonth(ym)}</h2>
              <div className="space-y-2">
                {events!.map((e) => {
                  const cfg = eventTypeConfig[e.type] ?? eventTypeConfig.other;
                  const isSingleDay = !e.end_date || e.end_date === e.start_date;
                  return (
                    <div key={e.id} className="card flex items-start gap-4">
                      <div className="text-center shrink-0 w-12">
                        <p className="text-sm font-bold text-slate-400">{parseInt(e.start_date.slice(8))}日</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-100">{e.title}</span>
                          <span className={"text-xs px-2 py-0.5 rounded-full " + cfg.color}>{cfg.label}</span>
                        </div>
                        {!isSingleDay && (
                          <p className="text-xs text-slate-500 mt-0.5">{e.start_date} 〜 {e.end_date}</p>
                        )}
                        {e.memo && <p className="text-xs text-slate-600 mt-1">{e.memo}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="card text-center text-slate-600 py-16">
            <p className="text-sm">今後3ヶ月の予定はありません</p>
          </div>
        )}

        {/* 過去のイベント */}
        {pastEvents && pastEvents.length > 0 && (
          <section>
            <h2 className="section-title">先月の記録</h2>
            <div className="space-y-2 opacity-50">
              {pastEvents.map((e) => {
                const cfg = eventTypeConfig[e.type] ?? eventTypeConfig.other;
                return (
                  <div key={e.id} className="card flex items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-slate-300">{e.title}</span>
                      <span className="ml-2 text-xs text-slate-600">{e.start_date}</span>
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
