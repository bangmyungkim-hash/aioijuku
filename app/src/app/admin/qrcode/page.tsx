import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createQrCode(formData: FormData) {
  "use server";
  const label = formData.get("label") as string;
  if (!label?.trim()) return;
  const supabase = await createClient();
  await supabase.from("qr_codes").insert({ classroom_label: label.trim() });
  revalidatePath("/admin/qrcode");
}

async function deactivateQrCode(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("qr_codes").update({ is_active: false }).eq("id", id);
  revalidatePath("/admin/qrcode");
}

export default async function AdminQrCodePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: qrCodes } = await supabase
    .from("qr_codes").select("id, token, classroom_label, is_active, created_at")
    .order("created_at", { ascending: false });

  const baseUrl = "https://aioijuku.vercel.app";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-sm transition-colors"
             style={{ color: "rgba(255,255,255,0.4)" }}>← ダッシュボード</a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>QRコード管理</span>
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
          <h2 className="font-semibold text-stone-800 mb-3">新しいQRコードを作成</h2>
          <form action={createQrCode} className="flex gap-3">
            <input type="text" name="label" placeholder="例: 教室A、玄関" className="form-dark flex-1" required />
            <button type="submit" className="btn-primary px-5 py-2">作成</button>
          </form>
          <p className="text-xs text-stone-400 mt-2">
            作成すると教室設置用のQRコードが生成されます。生徒はこのQRをスキャンして入退室を記録します。
          </p>
        </div>

        <section>
          <h2 className="section-title">QRコード一覧 ({qrCodes?.length ?? 0}件)</h2>
          {qrCodes && qrCodes.length > 0 ? (
            <div className="space-y-4">
              {qrCodes.map((qr) => {
                const checkinUrl = baseUrl + "/checkin?token=" + qr.token;
                const qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(checkinUrl);
                return (
                  <div key={qr.id} className={"card " + (qr.is_active ? "" : "opacity-50")}>
                    <div className="flex gap-4 items-start">
                      <div className="shrink-0">
                        {qr.is_active ? (
                          <img src={qrImageUrl} alt={"QR: " + qr.classroom_label} width={120} height={120}
                            className="border border-stone-200 rounded-lg" />
                        ) : (
                          <div className="w-[120px] h-[120px] bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs">無効</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-stone-800 text-lg">{qr.classroom_label}</span>
                          {qr.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">有効</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">無効</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mb-2">
                          作成: {new Date(qr.created_at).toLocaleDateString("ja-JP")}
                        </p>
                        <p className="text-xs text-stone-500 break-all mb-3">URL: {checkinUrl}</p>
                        <div className="flex gap-2 flex-wrap">
                          {qr.is_active && (
                            <>
                              <a href={checkinUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition">
                                URLを開く
                              </a>
                              <a href={qrImageUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs border border-stone-300 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition">
                                画像を印刷用に開く
                              </a>
                              <form action={deactivateQrCode}>
                                <input type="hidden" name="id" value={qr.id} />
                                <button type="submit"
                                  className="text-xs border border-rose-200 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition">
                                  無効化
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-stone-400 py-10">
              QRコードがまだ作成されていません。<br />上のフォームから作成してください。
            </div>
          )}
        </section>

        <div className="card" style={{ borderColor: "rgba(14,165,233,0.3)" }}>
          <p className="text-sm text-sky-700 font-semibold">使い方</p>
          <ol className="text-sm text-stone-600 mt-2 space-y-1 list-decimal list-inside">
            <li>QRコード画像を印刷して教室に貼り付けます</li>
            <li>生徒がスマホでスキャンすると入室・退室が自動記録されます</li>
            <li>QRが不要になったら「無効化」してください</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
