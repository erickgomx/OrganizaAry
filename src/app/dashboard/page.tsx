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
  Clock,
  ArrowRight,
  MapPin,
  AlertTriangle,
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

  // Fetch profile, clients, events, and tasks concurrently via SSR
  const [profileRes, clientsRes, eventsRes, tasksRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("clients").select("id", { count: "exact" }).eq("user_id", user.id),
    supabase
      .from("events")
      .select("*, client:clients(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase.from("tasks").select("*").eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const isGoogleConnected = Boolean(profile?.google_refresh_token);

  const clientsCount = clientsRes.count || 0;
  const allEvents = eventsRes.data || [];
  const allTasks = tasksRes.data || [];

  // Filter events in the next 7 days
  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);

  const upcomingWeekEvents = allEvents.filter((ev) => {
    const evDate = new Date(ev.date);
    return evDate >= now && evDate <= next7Days;
  });

  // Urgent or Overdue tasks
  const urgentOrOverdueTasks = allTasks.filter((t) => {
    if (t.is_done) return false;
    if (t.priority === "urgent") return true;
    if (t.due_date && new Date(t.due_date) < now) return true;
    return false;
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

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
                  Command Center
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
                Visão consolidada de clientes, captações agendadas e pós-produção.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isGoogleConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Google Conectado</span>
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

        {/* Real-time SSR Metrics Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Próximos 7 Dias</p>
              <p className="text-2xl font-bold text-blue-400 mt-0.5">{upcomingWeekEvents.length}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Captações agendadas</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-800/40 text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Tarefas Urgentes / Atrasadas</p>
              <p className="text-2xl font-bold text-red-400 mt-0.5">{urgentOrOverdueTasks.length}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Atenção requerida</p>
            </div>
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/40 text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Clientes Ativos</p>
              <p className="text-2xl font-bold text-purple-400 mt-0.5">{clientsCount}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Cadastrados no CRM</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/40 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Next Events on Schedule */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300 tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Próximas Captações da Agenda
            </h3>
            <Link
              href="/events"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingWeekEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/20 p-6 text-center text-xs text-neutral-500">
              Nenhuma captação agendada para os próximos 7 dias.{" "}
              <Link href="/events" className="text-blue-400 hover:underline">
                Criar novo evento
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingWeekEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">{ev.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span className="flex items-center gap-1 text-blue-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-white">
                    {formatBRL(Number(ev.price))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modules Navigation Cards */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-300 tracking-wide">
            Módulos Operacionais
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
                  Pipeline com máquina de 5 estados e faturamento.
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
