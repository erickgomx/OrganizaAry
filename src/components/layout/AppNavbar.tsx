"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, BookOpen, Heart, Loader2, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "./SignOutButton";
import { UserGuideModal } from "@/components/onboarding/UserGuideModal";
import { PrincessWelcomeModal } from "@/components/onboarding/PrincessWelcomeModal";
import { GoogleDiagnosticModal } from "@/components/google/GoogleDiagnosticModal";

export interface SafeNavbarProfile {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  google_refresh_token?: string | null;
  hasGoogleSync?: boolean;
}

interface AppNavbarProps {
  profile: SafeNavbarProfile | null;
}

export function AppNavbar({ profile }: AppNavbarProps) {
  const pathname = usePathname();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoveNoteOpen, setIsLoveNoteOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const isGoogleConnected = profile?.hasGoogleSync ?? Boolean(profile?.google_refresh_token);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      setIsConnectingGoogle(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname || "/dashboard")}`,
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
        console.error("Erro Supabase OAuth:", error);
        alert(`Erro ao conectar com Google: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Erro ao conectar Google:", err);
      alert("Falha ao abrir autorização do Google. Tente novamente.");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Check on initial load if love note or tutorial has been seen, otherwise open smoothly
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isFirstLoginQuery =
        urlParams.get("first_login") === "1" || urlParams.get("first_login") === "true";
      const hasSeenLoveNote = localStorage.getItem("organizaary_princess_welcome_seen");

      if (!hasSeenLoveNote || isFirstLoginQuery) {
        const timer = setTimeout(() => {
          setIsLoveNoteOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        const hasCompletedGuide = localStorage.getItem("organizaary_tutorial_completed");
        if (!hasCompletedGuide) {
          const timer = setTimeout(() => {
            setIsGuideOpen(true);
          }, 600);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // Ignore localStorage access issues if cookies/storage blocked
    }
  }, []);

  const handleCloseLoveNote = () => {
    try {
      localStorage.setItem("organizaary_princess_welcome_seen", "true");
      if (typeof window !== "undefined" && window.location.search.includes("first_login")) {
        const url = new URL(window.location.href);
        url.searchParams.delete("first_login");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    } catch {
      // Storage access safety
    }
    setIsLoveNoteOpen(false);

    try {
      const hasCompletedGuide = localStorage.getItem("organizaary_tutorial_completed");
      if (!hasCompletedGuide) {
        setTimeout(() => {
          setIsGuideOpen(true);
        }, 400);
      }
    } catch {
      // Storage access safety
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Início", icon: LayoutDashboard },
    { href: "/events", label: "Trabalhos", icon: Calendar },
    { href: "/clients", label: "Clientes", icon: Users },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#33293c] bg-[#120e15]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="OrganizaAry"
              width={38}
              height={38}
              className="h-9 w-9 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
              priority
            />
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-[#f4eff5] group-hover:text-[#bba0c1] transition-colors">
              OrganizaAry
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#231c29] text-[#bba0c1] border border-[#33293c] shadow-sm"
                      : "text-[#968a9c] hover:bg-[#1a151f] hover:text-[#f4eff5]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#9873a1]" : "text-[#968a9c]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile, Guide, Love Note & actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Re-consultable Love Note Trigger */}
            <button
              onClick={() => setIsLoveNoteOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 bg-[#1a151f] hover:bg-[#231c29] border border-[#33293c] hover:border-rose-400/40 transition-all shadow-sm group"
              title="Recadinho do Príncipe ❤️"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Do seu Príncipe</span>
            </button>

            {/* Re-consultable Tutorial / User Guide Trigger */}
            <button
              onClick={() => setIsGuideOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#9873a1] bg-[#1a151f] hover:bg-[#231c29] border border-[#33293c] hover:border-[#9873a1]/40 transition-all shadow-sm"
              title="Abrir Guia e Instruções do Sistema"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#9873a1]" />
              <span className="hidden sm:inline">Guia & Instruções</span>
            </button>

            {isGoogleConnected ? (
              <button
                type="button"
                onClick={() => setIsDiagnosticOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium text-[#9fc193] bg-[#162017]/70 hover:bg-[#162017] border border-[#273829] hover:border-[#9fc193]/30 transition-all cursor-pointer"
                title="Google Agenda conectado (clique para status)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#82af74]" />
                <Calendar className="w-3 h-3 text-[#82af74]" />
                <span className="hidden lg:inline text-[10px]">Google Ativo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#211a14] hover:bg-[#2c221b] border border-[#ff9e3b]/30 text-[#ffb066] transition-all cursor-pointer shadow-sm group"
                title="Clique para autorizar e conectar com o seu Google Agenda"
              >
                {isConnectingGoogle ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffb066]" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-[#ff9e3b] group-hover:scale-105 transition-transform" />
                )}
                <span className="hidden sm:inline text-[10px]">Conectar Agenda</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDiagnosticOpen(true)}
              className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#bba0c1] hover:bg-[#1a151f] transition-all cursor-pointer"
              title="Status das Integrações"
            >
              <Activity className="w-3.5 h-3.5 text-[#9873a1]" />
            </button>

            <div className="flex items-center gap-2">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 rounded-full border border-[#33293c] object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[11px] text-[#bba0c1] font-medium">
                  {profile?.full_name ? profile.full_name[0] : "O"}
                </div>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar with direct Guide access */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#33293c] bg-[#120e15]/95 backdrop-blur-md px-2 pb-safe">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] transition-colors ${
                  isActive
                    ? "text-[#bba0c1] font-semibold"
                    : "text-[#968a9c] hover:text-[#f4eff5]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#9873a1]" : "text-[#968a9c]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsGuideOpen(true)}
            type="button"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] text-[#9873a1] hover:text-[#bba0c1] transition-colors"
          >
            <BookOpen className="h-4 w-4 text-[#9873a1]" />
            <span>Instruções</span>
          </button>
        </div>
      </nav>

      {/* Princess First Login Love Note Modal */}
      <PrincessWelcomeModal
        isOpen={isLoveNoteOpen}
        onClose={handleCloseLoveNote}
      />

      {/* Re-consultable User Guide Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
      {/* Google Diagnostic Modal */}
      <GoogleDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
    </>
  );
}
