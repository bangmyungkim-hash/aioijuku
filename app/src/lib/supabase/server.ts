/**
 * サーバーサイド用の Supabase クライアント
 * Server Components / Route Handlers / Middleware で使用する
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Server Component からの呼び出し時は set できない（無視してOK）
          }
        },
      },
    }
  );
}
