import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function createGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || undefined;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || undefined;
  const redirectUri = `${getBaseUrl()}/auth/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Checks whether the user has valid Google OAuth tokens stored.
 */
export async function isUserGoogleConnected(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, google_access_token")
      .eq("id", userId)
      .single();

    return Boolean(profile?.google_refresh_token || profile?.google_access_token);
  } catch {
    return false;
  }
}

/**
 * Returns an authenticated Google OAuth2 client for the specified user ID,
 * automatically handling token refresh if the access token has expired.
 */
export async function getAuthenticatedGoogleClient(userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("google_refresh_token, google_access_token, token_expires_at")
    .eq("id", userId)
    .single();

  if (error || (!profile?.google_refresh_token && !profile?.google_access_token)) {
    throw new Error(
      "Autorização do Google Agenda não encontrada. Conecte sua conta Google para sincronizar automaticamente."
    );
  }

  const oauth2Client = createGoogleOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: profile.google_refresh_token || undefined,
    access_token: profile.google_access_token || undefined,
  });

  // Listen for automatic token refresh event to keep database updated
  oauth2Client.on("tokens", async (tokens) => {
    const updateData: {
      google_access_token?: string;
      google_refresh_token?: string;
      token_expires_at?: string;
    } = {};

    if (tokens.access_token) {
      updateData.google_access_token = tokens.access_token;
    }
    if (tokens.refresh_token) {
      updateData.google_refresh_token = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      updateData.token_expires_at = new Date(tokens.expiry_date).toISOString();
    }

    if (Object.keys(updateData).length > 0) {
      await supabase.from("profiles").update(updateData).eq("id", userId);
    }
  });

  return oauth2Client;
}
