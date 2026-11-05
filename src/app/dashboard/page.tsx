import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/layout/AppNavbar";
import {
  Users,
  Calendar,
  KanbanSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Dashboard | OrganizaAry",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isGoogleConnected = Boolean(profile?.google_refresh_token);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 md:pb-10">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Backoffice Operacional
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-300">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Online
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Olá, {profile?.full_name || user.email?.split("@")[0] || "Fotógrafo(a)"}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Painel central de captações, pós-produção e sincronização em tempo real.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isGoogleConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Google APIs Conectadas</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium">Google Offline pendente</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Integration Status Card */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Google Calendar
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isGoogleConnected ? "bg-emerald-400" : "bg-neutral-600"
                }`}
              />
            </div>
            <p className="text-sm font-semibold text-white">Sincronização de Captações</p>
            <p className="text-xs text-neutral-500">
              {isGoogleConnected
                ? "Eventos sincronizam automaticamente na agenda Google."
                : "Aguardando token offline para sincronização."}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Google Drive
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isGoogleConnected ? "bg-emerald-400" : "bg-neutral-600"
                }`}
              />
            </div>
            <p className="text-sm font-semibold text-white">Geração de Pastas RAW</p>
            <p className="text-xs text-neutral-500">
              {isGoogleConnected
                ? "Pastas estruturadas criadas via API ao confirmar evento."
                : "Aguardando permissão de Drive para automação."}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Google Meet
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isGoogleConnected ? "bg-emerald-400" : "bg-neutral-600"
                }`}
              />
            </div>
            <p className="text-sm font-semibold text-white">Reuniões de Briefing</p>
            <p className="text-xs text-neutral-500">
              {isGoogleConnected
                ? "Criação de link dinâmico em 1 clique."
                : "Pronto para gerar links assim que conectado."}
            </p>
          </div>
        </section>

        {/* Modules Navigation Cards */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-300 tracking-wide">
            Acesso Rápido aos Módulos
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/clients"
              className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-neutral-800 text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-base">Gestão de Clientes</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  CRM 360º, contatos e faturamento por cliente.
                </p>
              </div>
            </Link>

            <Link
              href="/events"
              className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-neutral-800 text-blue-400 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-base">Eventos & Captações</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Pipeline de status, datas, locais e valores.
                </p>
              </div>
            </Link>

            <Link
              href="/tasks"
              className="group p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-neutral-800 text-amber-400 group-hover:scale-110 transition-transform">
                  <KanbanSquare className="w-5 h-5" />
                </div>
                <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-base">Kanban de Tarefas</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  To Do, In Progress e Done com prioridades visuais.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Security & Token Info Footer */}
        <section className="rounded-xl border border-neutral-800/60 bg-neutral-900/20 p-4 text-xs text-neutral-500 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-neutral-400 shrink-0" />
          <p>
            Sessão autenticada via Supabase Auth & Google OAuth 2.0. Os tokens são armazenados com isolamento estrito via Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}
