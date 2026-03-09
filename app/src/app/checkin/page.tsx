"use client";

/**
 * /checkin?token=xxxx
 * QRコードスキャン後の入退室処理ページ
 * 1回目スキャン → 入室記録
 * 2回目スキャン → 退室記録
 */
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

type Status = "loading" | "check_in" | "check_out" | "error" | "no_token" | "not_logged_in";

function CheckinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no_token");
      return;
    }
    processCheckin();
  }, [token]);

  async function processCheckin() {
    const supabase = createClient();

    // ログイン確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // ログインページへ（チェックイン後に戻れるようreturnUrlを付与）
      router.push("/login?returnUrl=" + encodeURIComponent("/checkin?token=" + token));
      return;
    }

    // ロール確認（生徒のみ）
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      setErrorMessage("このページは生徒専用です。");
      setStatus("error");
      return;
    }

    setStudentName(profile?.full_name ?? "");

    // チェックイン RPC 呼び出し
    const { data, error } = await supabase.rpc("checkin_by_qr", {
      p_token: token,
      p_student_id: user.id,
    });

    setTime(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));

    if (error || !data) {
      setErrorMessage("通信エラーが発生しました。もう一度お試しください。");
      setStatus("error");
      return;
    }

    if (!data.ok) {
      switch (data.error) {
        case "invalid_or_inactive_qr":
          setErrorMessage("QRコードが無効です。塾のスタッフにお知らせください。");
          break;
        case "already_checked_out":
          setErrorMessage("本日はすでに入退室の記録が完了しています。");
          break;
        default:
          setErrorMessage(data.error ?? "不明なエラーが発生しました。");
      }
      setStatus("error");
      return;
    }

    setStatus(data.action === "check_in" ? "check_in" : "check_out");
  }

  // ── 描画 ──

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">処理中...</p>
        </div>
      </div>
    );
  }

  if (status === "no_token") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">❓</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">QRコードが認識できません</h1>
          <p className="text-gray-500 text-sm">教室に設置されたQRコードをスキャンしてください。</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-700 mb-2">エラー</h1>
          <p className="text-gray-600 text-sm mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold hover:bg-brand-700 transition"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  const isCheckIn = status === "check_in";

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isCheckIn ? "bg-brand-50" : "bg-blue-50"}`}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {/* アイコン */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isCheckIn ? "bg-brand-100" : "bg-blue-100"}`}>
          <span className="text-5xl">{isCheckIn ? "🏫" : "🏠"}</span>
        </div>

        {/* メッセージ */}
        <h1 className={`text-3xl font-bold mb-2 ${isCheckIn ? "text-brand-700" : "text-blue-700"}`}>
          {isCheckIn ? "入室しました" : "退室しました"}
        </h1>

        {studentName && (
          <p className="text-gray-700 font-medium text-lg mb-1">{studentName} さん</p>
        )}

        <p className="text-gray-500 text-sm mb-6">
          {isCheckIn ? "今日もがんばろう！" : "お疲れさまでした！"}
        </p>

        {/* 時刻 */}
        <div className={`rounded-xl py-4 mb-6 ${isCheckIn ? "bg-brand-50" : "bg-blue-50"}`}>
          <p className="text-xs text-gray-500 mb-1">記録時刻</p>
          <p className={`text-3xl font-bold ${isCheckIn ? "text-brand-600" : "text-blue-600"}`}>{time}</p>
        </div>

        {/* ボタン */}
        <button
          onClick={() => router.push("/student/dashboard")}
          className={`w-full py-3 rounded-xl font-bold text-white transition ${isCheckIn ? "bg-brand-600 hover:bg-brand-700" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          ダッシュボードへ
        </button>

        <button
          onClick={() => router.push("/student/learning")}
          className="w-full mt-3 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
        >
          学習を記録する
        </button>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
