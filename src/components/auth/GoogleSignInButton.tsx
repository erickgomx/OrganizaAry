"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          scopes: [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "openid",
          ].join(" "),
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao inicializar login com Google.";
      setErrorMsg(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        type="button"
        className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] hover:border-[#9873a1]/40 px-5 py-3 text-xs sm:text-sm font-medium text-[#f4eff5] shadow-sm transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#9873a1]" />
            <span className="text-[#968a9c]">Conectando ao Google...</span>
          </>
        ) : (
          <>
            {/* Google SVG Logo with restrained sizing */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 6.9 9.2 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.8c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.9 14.1c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.8c-1.1.7-2.5 1.2-4.3 1.2-2.8 0-5.2-1.9-6.1-4.5L2.2 16.7C4 20.3 7.7 23 12 23z"
              />
            </svg>
            <span className="font-medium tracking-normal text-[#f4eff5] group-hover:text-white transition-colors">
              Continuar com Google Workspace
            </span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="rounded-lg bg-red-950/20 p-3 text-center text-xs text-red-300 border border-red-900/30">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
