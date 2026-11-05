"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, KanbanSquare, BookOpen } from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { Profile } from "@/types/database";
import { UserGuideModal } from "@/components/onboarding/UserGuideModal";

interface AppNavbarProps {
  profile: Profile | null;
}

export function AppNavbar({ profile }: AppNavbarProps) {
  const pathname = usePathname();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Check on initial load if the tutorial has been seen, otherwise open smoothly
  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem("organizaary_tutorial_completed");
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsGuideOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage access issues if cookies/storage blocked
    }
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Início", icon: LayoutDashboard },
    { href: "/events", label: "Trabalhos", icon: Calendar },
    { href: "/clients", label: "Clientes", icon: Users },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#23201c] bg-[#121110]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#181715] border border-[#c8a97e]/30 overflow-hidden p-1 shadow-sm transition-all group-hover:border-[#c8a97e]/60">
              <Image
                src="/logo.png"
                alt="OrganizaAry"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-semibold text-xs sm:text-sm tracking-tight text-[#f6f4ef] group-hover:text-white transition-colors">
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
                      ? "bg-[#1d1b19] text-[#dfba88] border border-[#332e27] shadow-sm"
                      : "text-[#9d978d] hover:bg-[#171614] hover:text-[#f6f4ef]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#c8a97e]" : "text-[#807a71]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile, Guide & actions */}
          <div className="flex items-center gap-2.5">
            {/* Re-consultable Tutorial / User Guide Trigger */}
            <button
              onClick={() => setIsGuideOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#c8a97e] bg-[#1a1917] hover:bg-[#221f1c] border border-[#2d2822] hover:border-[#c8a97e]/40 transition-all shadow-sm"
              title="Abrir Tutorial e Guia do Usuário"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#c8a97e]" />
              <span className="hidden sm:inline">Guia de Uso</span>
            </button>

            {profile?.google_refresh_token ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#162017] border border-[#273829] text-[#9fc193]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#82af74]" />
                Google Sincronizado
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#211a14] border border-[#382b21] text-[#c9a77e]">
                Google Pendente
              </span>
            )}

            <div className="flex items-center gap-2">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-7 h-7 rounded-full border border-[#332e27] object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#1b1917] border border-[#332e27] flex items-center justify-center text-[11px] text-[#dfba88] font-medium">
                  {profile?.full_name ? profile.full_name[0] : "O"}
                </div>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar with direct Guide access */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#23201c] bg-[#121110]/95 backdrop-blur-md px-2 pb-safe">
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
                    ? "text-[#dfba88] font-semibold"
                    : "text-[#807a71] hover:text-[#f6f4ef]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#c8a97e]" : "text-[#807a71]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsGuideOpen(true)}
            type="button"
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] text-[#c8a97e] hover:text-[#dfba88] transition-colors"
          >
            <BookOpen className="h-4 w-4 text-[#c8a97e]" />
            <span>Guia</span>
          </button>
        </div>
      </nav>

      {/* Re-consultable User Guide Modal */}
      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </>
  );
}
