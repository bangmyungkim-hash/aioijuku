import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // 本日の出欠数を取得
  const today = new Date().toISOString().split("T")[0];
  const { count: todayAttendance } = await supabase
    .from("attendance_logs")
    .select("*", { count: "exact", head: true })
    .eq("logged_date", today);

  // 未確認の欠席連絡数
  const { count: pendingAbsences } = await supabase
    .from("absence_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // 生徒数
  const { count: studentCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .eq("is_active", true);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "linear-gradient(135deg, #d4a843, #b8912e)" }}>A</div>
          <span className="font-semibold text-slate-100 tracking-tight">あいおい塾</span>
          <span className="text-xs text-slate-600 border border-slate-700 px-2 py-0.5 rounded">管理</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{profile?.full_name}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit"
              className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="本日の出席" value={todayAttendance ?? 0} unit="名" accent="emerald" />
          <SummaryCard label="未確認欠席連絡" value={pendingAbsences ?? 0} unit="件" accent="amber" />
          <SummaryCard label="在籍生徒数" value={studentCount ?? 0} unit="名" accent="violet" />
        </div>

        {/* 管理メニュー */}
        <div>
          <h2 className="section-title">管理メニュー</h2>
          <div className="grid grid-cols-2 gap-3">
            <AdminNavCard href="/admin/members"    label="会員管理"       desc="生徒・保護者の登録・編集" />
            <AdminNavCard href="/admin/attendance" label="出欠管理"       desc="出欠状況・欠席連絡の確認" />
            <AdminNavCard href="/admin/qrcode"     label="QRコード生成"  desc="教室用QRコードの発行" />
            <AdminNavCard href="/admin/grades"     label="成績管理"       desc="テスト・模試データ" />
            <AdminNavCard href="/admin/meetings"   label="面談記録"       desc="面談メモの記録・管理" />
            <AdminNavCard href="/admin/calendar"   label="カレンダー管理" desc="休校日・イベントの設定" />
            <AdminNavCard href="/admin/announce"   label="お知らせ管理"   desc="お知らせの投稿・編集" />
          </div>
        </div>

      </main>
    </div>
  );
}

function SummaryCard({
  label, value, unit, accent,
}: {
  label: string; value: number; unit: string;
  accent: "emerald" | "amber" | "violet";
}) {
  const accentMap = {
    emerald: { text: "text-emerald-400", border: "border-emerald-500/20" },
    amber:   { text: "text-amber-400",   border: "border-amber-500/20" },
    violet:  { text: "text-violet-400",  border: "border-violet-500/20" },
  };
  const a = accentMap[accent];
  return (
    <div className={`stat-card ${a.border} border`}>
      <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{unit}</div>
      <div className="text-xs text-slate-600 mt-1 leading-tight">{label}</div>
    </div>
  );
}

function AdminNavCard({
  href, label, desc,
}: {
  href: string; label: string; desc: string;
}) {
  return (
    <a href={href} className="card flex items-start gap-3 hover:border-amber-500/20 transition-all group">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-500 transition-colors mt-2" />
      <div>
        <p className="font-medium text-slate-200 group-hover:text-slate-100 transition-colors">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}
