import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/actions/events";
import { getClients } from "@/actions/clients";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EventsView } from "@/components/events/EventsView";
import { Calendar, DollarSign, Clock, Film } from "lucide-react";

export const metadata = {
  title: "Eventos & Captações | OrganizaAry",
  description: "Pipeline completo de captações, máquina de status e faturamento.",
};

export default async function EventsPage() {
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

  const [events, clients] = await Promise.all([getEvents(), getClients()]);

  const totalPipelineRevenue = events.reduce((sum, ev) => sum + (Number(ev.price) || 0), 0);
  const activeEventsCount = events.filter((ev) => ev.status !== "finished").length;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 md:pb-10">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            Captações & Pipeline de Eventos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Máquina de estados operacional: Orçamento/Lead → Agendado → Captação → Pós-Produção → Finalizado.
          </p>
        </div>

        {/* Pipeline Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Captações Ativas</p>
              <p className="text-xl font-bold text-white">{activeEventsCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Valor em Pipeline</p>
              <p className="text-xl font-bold text-emerald-400">{formatBRL(totalPipelineRevenue)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Total de Eventos</p>
              <p className="text-xl font-bold text-white">{events.length}</p>
            </div>
          </div>
        </div>

        {/* Events View with Tabs & Status Machine */}
        <EventsView
          initialEvents={events}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        />
      </main>
    </div>
  );
}
