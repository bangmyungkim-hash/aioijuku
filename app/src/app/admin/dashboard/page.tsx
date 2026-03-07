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
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="font-extrabold text-lg">あいおい塾 管理画面</span>
        </div>
         <div className="flex items-center gap-3">
          <span className="text-sm opacity-90">{profile?.full_name}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit"
              className="text-xs bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1.5 rounded-lg transition-colors">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="本日の出席" value={todayAttendance ?? 0} unit="名" color="green" />
          <SummaryCard label="未確認欠席連絡" value={pendingAbsences ?? 0} unit="件" color="orange" />
          <SummaryCard label="在籍生徒数" value={studentCount ?? 0} unit="名" color="purple" />
        </div>

        {/* 管理メニュー */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">🛠 管理メニュー</h2>
          <div className="grid grid-cols-2 gap-3">
            <AdminNavCard href="/admin/members"    icon="👥" label="会員管理"       desc="生徒・保護者の登録・編集" />
            <AdminNavCard href="/admin/attendance" icon="📋" label="出欠管理"       desc="出欠状況・欠席連絡の確認" />
            <AdminNavCard href="/admin/qrcode"     icon="📷" label="QRコード生成"  desc="教室用QRコードの発行" />
            <AdminNavCard href="/admin/grades"     icon="📊" label="成績管理"       desc="テスト・模試データ" />
            <AdminNavCard href="/admin/meetings"   icon="🗒️" label="面談記録"       desc="面談メモの記録・管理" />
            <AdminNavCard href="/admin/calendar"   icon="📅" label="カレンダー管理" desc="休校日・イベントの設定" />
            <AdminNavCard href="/admin/announce"   icon="📢" label="お知らせ管理"   desc="お知らせの投稿・編集" />
          </div>
        </div>

      </main>
    </div>
  );
}

function SummaryCard({
  label, value, unit, color,
}: {
  label: string; value: number; unit: string;
  color: "green" | "orange" | "purple";
}) {
  const colorMap = {
    green:  "bg-brand-100 text-brand-700",
    orange: "bg-orange-100 text-orange-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <div className={`rounded-2xl p-4 text-center ${colorMap[color]}`}>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs font-bold mt-0.5">{unit}</div>
      <div className="text-xs opacity-70 mt-1 leading-tight">{label}</div>
    </div>
  );
}

function AdminNavCard({
  href, icon, label, desc,
}: {
  href: string; icon: string; label: string; desc: string;
}) {
  return (
    <a href={href} className="card flex items-start gap-3 hover:bg-purple-50 transition-colors">
      <span className="text-2xl mt-0.5">{icon}</span>
      <div>
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </a>
  );
}
