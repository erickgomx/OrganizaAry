import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  });
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  // GET requests do not invalidate the session to prevent Logout CSRF attacks
  return NextResponse.redirect(`${origin}/login`, {
    status: 302,
  });
}
