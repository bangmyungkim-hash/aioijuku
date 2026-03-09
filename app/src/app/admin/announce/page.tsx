import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// お知らせを投稿するサーバーアクション
async function postAnnouncement(formData: FormData) {
  "use server";
  const title       = formData.get("title") as string;
  const body        = formData.get("body") as string;
  const targets     = formData.getAll("targets") as string[];
  const isPublished = formData.get("is_published") === "on";

  if (!title?.trim() || !body?.trim() || targets.length === 0) return;

  const supabase = await createClient();
  await supabase.from("announcements").insert({
    title: title.trim(),
    body: body.trim(),
    target_roles: targets,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
  });
  revalidatePath("/admin/announce");
  revalidatePath("/announcements");
}

// お知らせの公開状態を切り替えるサーバーアクション
async function togglePublish(formData: FormData) {
  "use server";
  const id        = formData.get("id") as string;
  const current   = formData.get("current") === "true";
  const supabase  = await createClient();
  await supabase.from("announcements").update({
    is_published: !current,
    published_at: !current ? new Date().toISOString() : null,
  }).eq("id", id);
  revalidatePath("/admin/announce");
  revalidatePath("/announcements");
}

// お知らせを削除するサーバーアクション
async function deleteAnnouncement(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/admin/announce");
  revalidatePath("/announcements");
}

export default async function AdminAnnouncePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // すべてのお知らせ（管理者は全件閲覧可）
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, target_roles, is_published, published_at, created_at")
    .order("created_at", { ascending: false });

  const roleLabel: Record<string, string> = {
    admin: "管理者",
    parent: "保護者",
    student: "生徒",
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📢 お知らせ管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 投稿フォーム */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">📝 新しいお知らせを作成</h2>
          <form action={postAnnouncement} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-bold mb-1 block">タイトル</label>
              <input type="text" name="title" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="例: 夏期講習のご案内、休校のお知らせ" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold mb-1 block">本文</label>
              <textarea name="body" required rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="お知らせの内容を入力してください" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold mb-2 block">対象ロール（複数選択可）</label>
              <div className="flex gap-4">
                {[
                  { value: "student", label: "生徒" },
                  { value: "parent",  label: "保護者" },
                  { value: "admin",   label: "管理者" },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="targets" value={value} defaultChecked={value !== "admin"} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_published" id="pub" defaultChecked className="rounded" />
              <label htmlFor="pub" className="text-sm text-gray-600">すぐに公開する</label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-2">投稿する</button>
            </div>
          </form>
        </div>

        {/* お知らせ一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            📋 お知らせ一覧 ({announcements?.length ?? 0}件)
          </h2>
          {announcements && announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((a) => {
                const targets = (a.target_roles as string[]).map((r) => roleLabel[r] ?? r).join("・");
                return (
                  <div key={a.id} className={"card " + (a.is_published ? "" : "opacity-60 border-dashed")}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-800">{a.title}</span>
                          {a.is_published ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">公開中</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">下書き</span>
                          )}
                          <span className="text-xs text-gray-400">対象: {targets}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{a.body}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          作成: {new Date(a.created_at).toLocaleString("ja-JP")}
                          {a.published_at && " / 公開: " + new Date(a.published_at).toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <form action={togglePublish}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="current" value={String(a.is_published)} />
                          <button type="submit"
                            className={"text-xs px-3 py-1.5 rounded-lg border " + (a.is_published
                              ? "border-gray-300 text-gray-500 hover:bg-gray-50"
                              : "border-green-300 text-green-600 hover:bg-green-50")}>
                            {a.is_published ? "非公開にする" : "公開する"}
                          </button>
                        </form>
                        <form action={deleteAnnouncement}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit"
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 w-full">
                            削除
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-10">
              お知らせがありません。<br />上のフォームから作成してください。
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
