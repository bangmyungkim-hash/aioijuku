"use client";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login?returnUrl=" + encodeURIComponent("/checkin?token=" + token));
      return;
    }
    const { data: profile } = await supabase
      .from("users").select("full_name, role").eq("id", user.id).single();
    if (profile?.role !== "student") {
      setErrorMessage("このページは生徒専用です。");
      setStatus("error");
      return;
    }
    setStudentName(profile?.full_name ?? "");
    const { data, error } = await supabase.rpc("checkin_by_qr", {
      p_token: token, p_student_id: user.id,
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600 text-lg">処理中...</p>
        </div>
      </div>
    );
  }

  if (status === "no_token") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
        <div className="card p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-stone-800 mb-2">QRコードが認識できません</h1>
          <p className="text-stone-500 text-sm">教室に設置されたQRコードをスキャンしてください。</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
        <div className="card p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-semibold text-rose-700 mb-2">エラー</h1>
          <p className="text-stone-600 text-sm mb-6">{errorMessage}</p>
          <button onClick={() => router.push("/student/dashboard")} className="btn-primary w-full py-3">
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  const isCheckIn = status === "check_in";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="card p-8 max-w-sm w-full text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6`}
             style={{
               background: isCheckIn ? "rgba(184,135,42,0.1)" : "rgba(14,165,233,0.1)",
               border: `2px solid ${isCheckIn ? "rgba(184,135,42,0.3)" : "rgba(14,165,233,0.3)"}`,
             }}>
          <span className={`text-4xl font-bold ${isCheckIn ? "text-amber-700" : "text-sky-700"}`}>
            {isCheckIn ? "IN" : "OUT"}
          </span>
        </div>

        <h1 className={`text-2xl font-bold mb-2 ${isCheckIn ? "text-amber-700" : "text-sky-700"}`}>
          {isCheckIn ? "入室しました" : "退室しました"}
        </h1>

        {studentName && (
          <p className="text-stone-700 font-medium text-lg mb-1">{studentName} さん</p>
        )}
        <p className="text-stone-500 text-sm mb-6">
          {isCheckIn ? "今日もがんばろう" : "お疲れさまでした"}
        </p>

        <div className="rounded-xl py-4 mb-6"
             style={{
               background: isCheckIn ? "rgba(184,135,42,0.06)" : "rgba(14,165,233,0.06)",
               border: `1.5px solid ${isCheckIn ? "rgba(184,135,42,0.2)" : "rgba(14,165,233,0.2)"}`,
             }}>
          <p className="text-xs text-stone-400 mb-1">記録時刻</p>
          <p className={`text-3xl font-bold ${isCheckIn ? "text-amber-700" : "text-sky-700"}`}>{time}</p>
        </div>

        <button onClick={() => router.push("/student/dashboard")} className="btn-primary w-full py-3">
          ダッシュボードへ
        </button>
        <button onClick={() => router.push("/student/learning")}
          className="w-full mt-3 py-3 rounded-xl font-medium text-stone-600 border-2 border-stone-200 hover:border-stone-300 hover:text-stone-700 transition-all">
          学習を記録する
        </button>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
