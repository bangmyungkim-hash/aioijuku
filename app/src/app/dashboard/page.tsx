/**
 * /dashboard へのアクセスをロールに応じて振り分けるページ
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin")  redirect("/admin/dashboard");
  if (profile?.role === "parent") redirect("/parent/dashboard");
  redirect("/student/dashboard");
}
