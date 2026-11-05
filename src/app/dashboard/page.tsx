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
  Clock,
  ArrowRight,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Dashboard | OrganizaAry",
  description: "Visão consolidada de clientes, captações agendadas e fluxo operacional.",
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
    <div className="min-h-screen bg-[#0e0d0c] text-[#f6f4ef] pb-20 md:pb-12 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Welcome Header */}
        <section className="rounded-2xl border border-[#26231f] bg-[#151412] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                  Painel Operacional
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1c1a18] text-[#c8a97e] border border-[#332e27]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Ativo
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight">
                Olá, {profile?.full_name || user.email?.split("@")[0] || "Fotógrafo(a)"}
              </h2>
              <p className="text-xs sm:text-sm text-[#9d978d]">
                Visão consolidada de clientes, captações agendadas e pós-produção.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isGoogleConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#162017] border border-[#273829] text-[#9fc193] text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#82af74] shrink-0" />
                  <span className="font-medium">Google Sincronizado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#211a14] border border-[#382b21] text-[#c9a77e] text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-[#c8a97e] shrink-0" />
                  <span className="font-medium">Google Pendente</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Real-time SSR Metrics Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Próximos 7 Dias
              </p>
              <p className="text-2xl font-semibold text-[#dfba88] tabular-nums">
                {upcomingWeekEvents.length}
              </p>
              <p className="text-[11px] text-[#736e65]">Captações agendadas</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Tarefas com Atenção
              </p>
              <p className="text-2xl font-semibold text-[#d48970] tabular-nums">
                {urgentOrOverdueTasks.length}
              </p>
              <p className="text-[11px] text-[#736e65]">Tarefas urgentes ou em atraso</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1c1a18] border border-[#2d2822] text-[#d48970]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Clientes no CRM
              </p>
              <p className="text-2xl font-semibold text-[#f6f4ef] tabular-nums">
                {clientsCount}
              </p>
              <p className="text-[11px] text-[#736e65]">Cadastrados na base</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#1c1a18] border border-[#2d2822] text-[#8e887f]">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </section>

        {/* Next Events on Schedule */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#8e887f] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#c8a97e]" />
              Próximas Captações da Agenda
            </h3>
            <Link
              href="/events"
              className="text-xs text-[#c8a97e] hover:text-[#dfba88] font-medium flex items-center gap-1 transition-colors"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingWeekEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#26231f] bg-[#151412]/50 p-6 text-center text-xs text-[#8e887f]">
              Nenhuma captação agendada para os próximos 7 dias.{" "}
              <Link href="/events" className="text-[#c8a97e] hover:underline font-medium">
                Criar novo evento
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingWeekEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center justify-between gap-3 shadow-sm hover:border-[#38332c] transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-[#f6f4ef] text-xs sm:text-sm">
                      {ev.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8e887f]">
                      <span className="flex items-center gap-1 text-[#dfba88] tabular-nums">
                        <Clock className="w-3 h-3" />
                        {formatDate(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-[#dfba88] tabular-nums">
                    {formatBRL(Number(ev.price))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Operational Modules Navigation Cards */}
        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#8e887f]">
            Módulos Operacionais
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/clients"
              className="group p-5 rounded-xl border border-[#26231f] bg-[#151412] hover:bg-[#191816] hover:border-[#3a352e] transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e] transition-colors group-hover:border-[#c8a97e]/40">
                  <Users className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-[#736e65] group-hover:text-[#dfba88] transition-colors" />
              </div>
              <div>
                <h4 className="font-medium text-[#f6f4ef] text-sm group-hover:text-white transition-colors">
                  Gestão de Clientes
                </h4>
                <p className="text-[11px] text-[#8e887f] mt-0.5 leading-relaxed">
                  CRM 360º, histórico de ensaios e faturamento por cliente.
                </p>
              </div>
            </Link>

            <Link
              href="/events"
              className="group p-5 rounded-xl border border-[#26231f] bg-[#151412] hover:bg-[#191816] hover:border-[#3a352e] transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e] transition-colors group-hover:border-[#c8a97e]/40">
                  <Calendar className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-[#736e65] group-hover:text-[#dfba88] transition-colors" />
              </div>
              <div>
                <h4 className="font-medium text-[#f6f4ef] text-sm group-hover:text-white transition-colors">
                  Eventos & Captações
                </h4>
                <p className="text-[11px] text-[#8e887f] mt-0.5 leading-relaxed">
                  Pipeline em 5 etapas, Meet, Drive e sincronização de agenda.
                </p>
              </div>
            </Link>

            <Link
              href="/tasks"
              className="group p-5 rounded-xl border border-[#26231f] bg-[#151412] hover:bg-[#191816] hover:border-[#3a352e] transition-all flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e] transition-colors group-hover:border-[#c8a97e]/40">
                  <KanbanSquare className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-[#736e65] group-hover:text-[#dfba88] transition-colors" />
              </div>
              <div>
                <h4 className="font-medium text-[#f6f4ef] text-sm group-hover:text-white transition-colors">
                  Tarefas & Pós-Produção
                </h4>
                <p className="text-[11px] text-[#8e887f] mt-0.5 leading-relaxed">
                  Fluxo de edição e entregas com prioridades e prazos.
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Security & System Info Footer */}
        <section className="rounded-xl border border-[#22201d] bg-[#131210] p-4 text-xs text-[#736e65] flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#8e887f] shrink-0" />
          <p className="leading-relaxed">
            Sessão autenticada via Supabase Auth & Google OAuth 2.0. Dados protegidos com isolamento estrito via Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}
