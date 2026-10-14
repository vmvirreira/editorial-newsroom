import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/admin?error=signin", origin));
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(error ? "/admin?error=signin" : "/admin", origin));
  }
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (token_hash && (type === "email" || type === "signup" || type === "magiclink")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    return NextResponse.redirect(new URL(error ? "/admin?error=signin" : "/admin", origin));
  }
  return NextResponse.redirect(new URL("/admin?error=signin", origin));
}
