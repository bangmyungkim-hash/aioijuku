import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const today = new Date().toISOString().split("T")[0];
  const { count: todayAttendance } = await supabase
    .from("attendance_logs").select("*", { count: "exact", head: true }).eq("logged_date", today);
  const { count: pendingAbsences } = await supabase
    .from("absence_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: studentCount } = await supabase
    .from("users").select("*", { count: "exact", head: true }).eq("role", "student").eq("is_active", true);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "linear-gradient(135deg, #c9963a, #a87825)" }}>A</div>
          <span className="font-semibold tracking-tight" style={{ color: "rgba(255,255,255,0.9)" }}>あいおい塾</span>
          <span className="text-xs px-2 py-0.5 rounded"
                style={{ color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.12)" }}>管理</span>
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
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="本日の出席" value={todayAttendance ?? 0} unit="名" accent="emerald" />
          <SummaryCard label="未確認欠席連絡" value={pendingAbsences ?? 0} unit="件" accent="amber" />
          <SummaryCard label="在籍生徒数" value={studentCount ?? 0} unit="名" accent="violet" />
        </div>
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

function SummaryCard({ label, value, unit, accent }: {
  label: string; value: number; unit: string;
  accent: "emerald" | "amber" | "violet";
}) {
  const accentMap = {
    emerald: { text: "text-emerald-700", border: "border-emerald-200" },
    amber:   { text: "text-amber-700",   border: "border-amber-200" },
    violet:  { text: "text-violet-700",  border: "border-violet-200" },
  };
  const a = accentMap[accent];
  return (
    <div className={`stat-card ${a.border} border`}>
      <div className={`text-3xl font-bold ${a.text}`}>{value}</div>
      <div className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{unit}</div>
      <div className="text-xs mt-1 leading-tight" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function AdminNavCard({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a href={href} className="card flex items-start gap-3 hover:border-amber-400 transition-all group">
      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
            style={{ background: "rgba(184,135,42,0.5)" }} />
      <div>
        <p className="font-medium text-stone-800 group-hover:text-stone-900 transition-colors">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}
