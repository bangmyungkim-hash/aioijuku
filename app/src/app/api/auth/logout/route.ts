import { createClient } from "@/lib/supabase/server";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // アプリ自身の /login にリダイレクト
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", origin));
}
