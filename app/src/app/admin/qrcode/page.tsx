import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 新しいQRコードを生成するサーバーアクション
async function createQrCode(formData: FormData) {
  "use server";
  const label = formData.get("label") as string;
  if (!label?.trim()) return;
  const supabase = await createClient();
  await supabase.from("qr_codes").insert({ classroom_label: label.trim() });
  revalidatePath("/admin/qrcode");
}

// QRコードを無効化するサーバーアクション
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

  // Vercel本番URLのベース
  const baseUrl = "https://aioijuku.vercel.app";

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-purple-700 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-white opacity-70 hover:opacity-100 text-sm">← ダッシュボード</a>
          <span className="opacity-40">|</span>
          <span className="font-extrabold">📷 QRコード管理</span>
        </div>
        <span className="text-sm opacity-80">{profile?.full_name}</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 新規作成フォーム */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-3">➕ 新しいQRコードを作成</h2>
          <form action={createQrCode} className="flex gap-3">
            <input
              type="text"
              name="label"
              placeholder="例: 教室A、玄関"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              required
            />
            <button type="submit" className="btn-primary px-5 py-2">
              作成
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            作成すると教室設置用のQRコードが生成されます。生徒はこのQRをスキャンして入退室を記録します。
          </p>
        </div>

        {/* QRコード一覧 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">
            📋 QRコード一覧 ({qrCodes?.length ?? 0}件)
          </h2>
          {qrCodes && qrCodes.length > 0 ? (
            <div className="space-y-4">
              {qrCodes.map((qr) => {
                const checkinUrl = baseUrl + "/checkin?token=" + qr.token;
                const qrImageUrl =
                  "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
                  encodeURIComponent(checkinUrl);
                return (
                  <div
                    key={qr.id}
                    className={"card " + (qr.is_active ? "" : "opacity-50")}
                  >
                    <div className="flex gap-4 items-start">
                      {/* QRコード画像 */}
                      <div className="shrink-0">
                        {qr.is_active ? (
                          <img
                            src={qrImageUrl}
                            alt={"QR: " + qr.classroom_label}
                            width={120}
                            height={120}
                            className="border border-gray-200 rounded-lg"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                            無効
                          </div>
                        )}
                      </div>

                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800 text-lg">{qr.classroom_label}</span>
                          {qr.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">有効</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">無効</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          作成: {new Date(qr.created_at).toLocaleDateString("ja-JP")}
                        </p>
                        <p className="text-xs text-gray-500 break-all mb-3">
                          URL: {checkinUrl}
                        </p>

                        <div className="flex gap-2">
                          {qr.is_active && (
                            <>
                              <a
                                href={checkinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs border border-brand-400 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50"
                              >
                                URLを開く
                              </a>
                              <a
                                href={qrImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                              >
                                画像を印刷用に開く
                              </a>
                              <form action={deactivateQrCode}>
                                <input type="hidden" name="id" value={qr.id} />
                                <button
                                  type="submit"
                                  className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
                                >
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
            <div className="card text-center text-gray-400 py-10">
              QRコードがまだ作成されていません。<br />
              上のフォームから作成してください。
            </div>
          )}
        </section>

        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-800 font-bold">💡 使い方</p>
          <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
            <li>QRコード画像を印刷して教室に貼り付けます</li>
            <li>生徒がスマホでスキャンすると入室・退室が自動記録されます</li>
            <li>QRが不要になったら「無効化」してください</li>
          </ol>
        </div>

      </main>
    </div>
  );
}
