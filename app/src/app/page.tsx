import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * ルートページ（/）
 * ログイン状態に応じて適切なダッシュボードへリダイレクト
 */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ユーザーのロールを取得してダッシュボードを振り分け
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin")   redirect("/admin/dashboard");
  if (profile?.role === "parent")  redirect("/parent/dashboard");
  redirect("/student/dashboard");
}
