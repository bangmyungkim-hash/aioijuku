import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * /parent/notifications
 * 保護者の通知設定ページ
 * - 入室通知 / 退室通知 の ON/OFF
 * - 通知先メールアドレスの設定
 */

export default async function ParentNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ロール確認
  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "parent") redirect("/");

  // 通知設定を取得（なければ INSERT で初期化）
  let { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("parent_user_id", user.id)
    .single();

  if (!settings) {
    await supabase.from("notification_settings").insert({
      parent_user_id: user.id,
      notify_on_checkin: true,
      notify_on_checkout: true,
      notify_email: user.email ?? "",
    });
    const { data: fresh } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("parent_user_id", user.id)
      .single();
    settings = fresh;
  }

  // ── Server Action ──
  async function saveSettings(formData: FormData) {
    "use server";
    const supabase2 = await createClient();
    const { data: { user: u } } = await supabase2.auth.getUser();
    if (!u) return;

    const notify_on_checkin  = formData.get("notify_on_checkin")  === "on";
    const notify_on_checkout = formData.get("notify_on_checkout") === "on";
    const notify_email       = (formData.get("notify_email") as string)?.trim();

    await supabase2
      .from("notification_settings")
      .upsert({
        parent_user_id: u.id,
        notify_on_checkin,
        notify_on_checkout,
        notify_email: notify_email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "parent_user_id" });

    revalidatePath("/parent/notifications");
  }

  const navItems = [
    { label: "ホーム",     href: "/parent/dashboard" },
    { label: "欠席連絡",  href: "/parent/absence" },
    { label: "通知設定",  href: "/parent/notifications" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-200">あいおい塾</p>
            <h1 className="text-lg font-bold">通知設定</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-100">{profile?.full_name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-xs bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-full transition">
                ログアウト
              </button>
            </form>
          </div>
        </div>
        {/* ナビ */}
        <nav className="max-w-3xl mx-auto px-4 pb-2 flex gap-4">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm pb-1 border-b-2 transition ${
                item.href === "/parent/notifications"
                  ? "border-white text-white font-bold"
                  : "border-transparent text-blue-200 hover:text-white"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-bold mb-1">📬 通知について</p>
          <p>お子様がQRコードで入室・退室したとき、設定したメールアドレスに通知が届きます。（※ メール通知機能は今後のアップデートで追加予定です）</p>
        </div>

        {/* 設定フォーム */}
        <form action={saveSettings} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">🔔 通知の種類</h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* 入室通知 */}
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  name="notify_on_checkin"
                  defaultChecked={settings?.notify_on_checkin ?? true}
                  className="sr-only peer"
                />
                {/* トグル風チェックボックス */}
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
              </div>
              <div>
                <p className="font-medium text-gray-800">入室通知</p>
                <p className="text-sm text-gray-500">お子様が教室に入室したときに通知を受け取ります</p>
              </div>
            </label>

            <hr className="border-gray-100" />

            {/* 退室通知 */}
            <label className="flex items-start gap-4 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  name="notify_on_checkout"
                  defaultChecked={settings?.notify_on_checkout ?? true}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-500 rounded-full transition" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
              </div>
              <div>
                <p className="font-medium text-gray-800">退室通知</p>
                <p className="text-sm text-gray-500">お子様が教室から退室したときに通知を受け取ります</p>
              </div>
            </label>
          </div>

          {/* メールアドレス */}
          <div className="px-6 py-5 border-t border-gray-100">
            <h2 className="font-bold text-gray-800 mb-3">📧 通知先メールアドレス</h2>
            <input
              type="email"
              name="notify_email"
              defaultValue={settings?.notify_email ?? user.email ?? ""}
              placeholder="例: parent@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              空欄の場合はログインに使用しているメールアドレスに通知します。
            </p>
          </div>

          {/* 保存ボタン */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
            >
              設定を保存する
            </button>
          </div>
        </form>

        {/* 現在の設定サマリー */}
        {settings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-gray-700 mb-3 text-sm">📋 現在の設定</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">入室通知</span>
                <span className={`font-bold px-3 py-0.5 rounded-full text-xs ${settings.notify_on_checkin ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {settings.notify_on_checkin ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">退室通知</span>
                <span className={`font-bold px-3 py-0.5 rounded-full text-xs ${settings.notify_on_checkout ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {settings.notify_on_checkout ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">通知先メール</span>
                <span className="text-gray-800 text-xs truncate max-w-[200px]">
                  {settings.notify_email || user.email || "未設定"}
                </span>
              </div>
              {settings.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">最終更新</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(settings.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 戻るリンク */}
        <div className="text-center">
          <a href="/parent/dashboard" className="text-sm text-blue-600 hover:underline">
            ← 保護者ダッシュボードに戻る
          </a>
        </div>
      </main>
    </div>
  );
}
