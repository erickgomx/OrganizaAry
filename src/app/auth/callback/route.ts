import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session && data.user) {
      const { session, user } = data;
      const providerToken = session.provider_token;
      const providerRefreshToken = session.provider_refresh_token;
      const expiresAt = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null;

      // Persist Google OAuth tokens for background Calendar, Drive and Meet API calls
      const profileUpdates: {
        id: string;
        email: string;
        full_name?: string | null;
        avatar_url?: string | null;
        google_access_token?: string | null;
        google_refresh_token?: string | null;
        token_expires_at?: string | null;
      } = {
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      };

      if (providerToken) {
        profileUpdates.google_access_token = providerToken;
      }

      if (providerRefreshToken) {
        profileUpdates.google_refresh_token = providerRefreshToken;
      }

      if (expiresAt) {
        profileUpdates.token_expires_at = expiresAt;
      }

      await supabase.from("profiles").upsert(profileUpdates, { onConflict: "id" });

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return user to login with error indicator if exchange fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
