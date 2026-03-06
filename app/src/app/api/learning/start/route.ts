import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 学習開始ボタンを押したときの API
 * Supabase の record_learning_start() RPC を呼び出す
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未ログイン" }, { status: 401 });
  }

  const { error } = await supabase.rpc("record_learning_start", {
    p_student_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
