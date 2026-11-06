import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

/**
 * Cached per-request Supabase server client.
 * In Next.js App Router, wrapping with React cache() ensures that
 * all Server Components and Action calls within the same render pass
 * reuse the identical client and cookie store with 0ms re-creation overhead.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder-project.supabase.co";

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
});

/**
 * Deduplicated per-request helper to retrieve the authenticated user.
 * Calling this multiple times in the same request (e.g. Page + getEvents + getClients + getTasks)
 * will execute the remote Supabase Auth network call exactly ONCE, returning the cached
 * user in 0ms for all subsequent calls.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
});

/**
 * Deduplicated per-request profile fetcher.
 */
export const getAuthenticatedProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: rawProfile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, google_refresh_token, google_access_token")
    .eq("id", userId)
    .single();

  if (error || !rawProfile) return null;

  return {
    id: rawProfile.id,
    email: rawProfile.email,
    full_name: rawProfile.full_name,
    avatar_url: rawProfile.avatar_url,
    hasGoogleSync: Boolean(rawProfile.google_refresh_token || rawProfile.google_access_token),
  };
});
