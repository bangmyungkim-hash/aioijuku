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
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: qrCodes } = await supabase
    .from("qr_codes")
    .select("id, token, classroom_label, is_active, created_at")
    .order("created_at", { ascending: false });

  const baseUrl = "https://aioijuku.vercel.app";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060b18 0%, #0c1425 100%)" }}>
      <header className="header-dark">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</a>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-slate-100">QRコード管理</span>
        </div>
        <span className="text-sm text-slate-400">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-3">新しいQRコードを作成</h2>
          <form action={createQrCode} className="flex gap-3">
            <input type="text" name="label" placeholder="例: 教室A、玄関" className="form-dark flex-1" required />
            <button type="submit" className="btn-primary px-5 py-2">作成</button>
          </form>
          <p className="text-xs text-slate-600 mt-2">
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
                  <div key={qr.id} className={"card " + (qr.is_active ? "" : "opacity-40")}>
                    <div className="flex gap-4 items-start">
                      <div className="shrink-0">
                        {qr.is_active ? (
                          <img src={qrImageUrl} alt={"QR: " + qr.classroom_label} width={120} height={120}
                            className="border border-slate-700 rounded-lg" />
                        ) : (
                          <div className="w-[120px] h-[120px] bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">無効</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-100 text-lg">{qr.classroom_label}</span>
                          {qr.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">有効</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">無効</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          作成: {new Date(qr.created_at).toLocaleDateString("ja-JP")}
                        </p>
                        <p className="text-xs text-slate-500 break-all mb-3">URL: {checkinUrl}</p>
                        <div className="flex gap-2">
                          {qr.is_active && (
                            <>
                              <a href={checkinUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/5 transition">
                                URLを開く
                              </a>
                              <a href={qrImageUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs border border-slate-700 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
                                画像を印刷用に開く
                              </a>
                              <form action={deactivateQrCode}>
                                <input type="hidden" name="id" value={qr.id} />
                                <button type="submit"
                                  className="text-xs border border-rose-500/20 text-rose-400/70 px-3 py-1.5 rounded-lg hover:bg-rose-500/5 transition">
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
            <div className="card text-center text-slate-600 py-10">
              QRコードがまだ作成されていません。<br />上のフォームから作成してください。
            </div>
          )}
        </section>

        <div className="card" style={{ borderColor: "rgba(56, 189, 248, 0.1)" }}>
          <p className="text-sm text-sky-400 font-semibold">使い方</p>
          <ol className="text-sm text-slate-400 mt-2 space-y-1 list-decimal list-inside">
            <li>QRコード画像を印刷して教室に貼り付けます</li>
            <li>生徒がスマホでスキャンすると入室・退室が自動記録されます</li>
            <li>QRが不要になったら「無効化」してください</li>
          </ol>
        </div>

      </main>
    </div>
  );
}
