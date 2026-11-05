"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, KanbanSquare, Camera } from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { Profile } from "@/types/database";

interface AppNavbarProps {
  profile: Profile | null;
}

export function AppNavbar({ profile }: AppNavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Início", icon: LayoutDashboard },
    { href: "/clients", label: "Clientes", icon: Users },
    { href: "/events", label: "Eventos", icon: Calendar },
    { href: "/tasks", label: "Kanban", icon: KanbanSquare },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-white">
              <Camera className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
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
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-neutral-800 text-white shadow-sm"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            {profile?.google_refresh_token ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Google Conectado
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/60 border border-amber-800/50 text-amber-400">
                Google Pendente
              </span>
            )}

            <div className="flex items-center gap-2">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-7 h-7 rounded-full border border-neutral-700 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs text-neutral-300 font-semibold">
                  {profile?.full_name ? profile.full_name[0] : "U"}
                </div>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly for on-location sets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800/90 bg-neutral-950/95 backdrop-blur-lg px-2 pb-safe">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-0.5 text-[10px] font-medium transition-all ${
                  isActive ? "text-white font-semibold" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? "bg-neutral-800 text-white" : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
