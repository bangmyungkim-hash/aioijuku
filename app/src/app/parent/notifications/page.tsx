import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export default async function ParentNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "parent") redirect("/");

  let { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("parent_user_id", user.id)
    .single();

  if (!settings) {
    await supabase.from("notification_settings").insert({
      parent_user_id: user.id, notify_on_checkin: true, notify_on_checkout: true, notify_email: user.email ?? "",
    });
    const { data: fresh } = await supabase
      .from("notification_settings").select("*").eq("parent_user_id", user.id).single();
    settings = fresh;
  }

  async function saveSettings(formData: FormData) {
    "use server";
    const supabase2 = await createClient();
    const { data: { user: u } } = await supabase2.auth.getUser();
    if (!u) return;
    const notify_on_checkin  = formData.get("notify_on_checkin")  === "on";
    const notify_on_checkout = formData.get("notify_on_checkout") === "on";
    const notify_email       = (formData.get("notify_email") as string)?.trim();
    await supabase2.from("notification_settings").upsert({
      parent_user_id: u.id, notify_on_checkin, notify_on_checkout,
      notify_email: notify_email || null, updated_at: new Date().toISOString(),
    }, { onConflict: "parent_user_id" });
    revalidatePath("/parent/notifications");
  }

  const navItems = [
    { label: "ホーム",     href: "/parent/dashboard" },
    { label: "欠席連絡",  href: "/parent/absence" },
    { label: "通知設定",  href: "/parent/notifications" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header style={{ background: "#0c1425", borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-600">あいおい塾</p>
            <h1 className="text-lg font-semibold text-slate-100">通知設定</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{profile?.full_name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-1 rounded-full transition">
                ログアウト
              </button>
            </form>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-4 pb-2 flex gap-4">
          {navItems.map(item => (
            <a key={item.href} href={item.href}
              className={`text-sm pb-1 border-b-2 transition ${
                item.href === "/parent/notifications"
                  ? "border-amber-500 text-slate-100 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <div className="card" style={{ borderColor: "rgba(56, 189, 248, 0.1)" }}>
          <p className="text-sm text-sky-400 font-semibold mb-1">通知について</p>
          <p className="text-sm text-slate-400">お子様がQRコードで入室・退室したとき、設定したメールアドレスに通知が届きます。（※ メール通知機能は今後のアップデートで追加予定です）</p>
        </div>

        <form action={saveSettings} className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-slate-200">通知の種類</h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative mt-0.5">
                <input type="checkbox" name="notify_on_checkin" defaultChecked={settings?.notify_on_checkin ?? true} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-checked:bg-amber-500 rounded-full transition" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
              </div>
              <div>
                <p className="font-medium text-slate-200">入室通知</p>
                <p className="text-sm text-slate-500">お子様が教室に入室したときに通知を受け取ります</p>
              </div>
            </label>
            <hr className="border-slate-800" />
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative mt-0.5">
                <input type="checkbox" name="notify_on_checkout" defaultChecked={settings?.notify_on_checkout ?? true} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-checked:bg-amber-500 rounded-full transition" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
              </div>
              <div>
                <p className="font-medium text-slate-200">退室通知</p>
                <p className="text-sm text-slate-500">お子様が教室から退室したときに通知を受け取ります</p>
              </div>
            </label>
          </div>

          <div className="px-6 py-5 border-t border-slate-800">
            <h2 className="font-semibold text-slate-200 mb-3">通知先メールアドレス</h2>
            <input type="email" name="notify_email" defaultValue={settings?.notify_email ?? user.email ?? ""}
              placeholder="例: parent@example.com" className="input" />
            <p className="text-xs text-slate-600 mt-1.5">
              空欄の場合はログインに使用しているメールアドレスに通知します。
            </p>
          </div>

          <div className="px-6 py-4 border-t border-slate-800" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
            <button type="submit" className="btn-primary w-full py-3">設定を保存する</button>
          </div>
        </form>

        {settings && (
          <div className="card">
            <h2 className="font-medium text-slate-400 mb-3 text-sm">現在の設定</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">入室通知</span>
                <span className={`font-medium px-3 py-0.5 rounded-full text-xs ${settings.notify_on_checkin ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"}`}>
                  {settings.notify_on_checkin ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">退室通知</span>
                <span className={`font-medium px-3 py-0.5 rounded-full text-xs ${settings.notify_on_checkout ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-500"}`}>
                  {settings.notify_on_checkout ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">通知先メール</span>
                <span className="text-slate-300 text-xs truncate max-w-[200px]">
                  {settings.notify_email || user.email || "未設定"}
                </span>
              </div>
              {settings.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">最終更新</span>
                  <span className="text-slate-600 text-xs">{new Date(settings.updated_at).toLocaleDateString("ja-JP")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <a href="/parent/dashboard" className="text-sm text-amber-400/80 hover:text-amber-400 transition">
            ← 保護者ダッシュボードに戻る
          </a>
        </div>
      </main>
    </div>
  );
}
