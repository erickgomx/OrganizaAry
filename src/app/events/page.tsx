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
    <div className="min-h-screen bg-[#0e0d0c] text-[#f6f4ef] pb-20 md:pb-12 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#c8a97e]" />
            Captações & Pipeline de Eventos
          </h1>
          <p className="text-xs sm:text-sm text-[#9d978d]">
            Fluxo em 5 etapas: Orçamento/Proposta &rarr; Agendado &rarr; Captação &rarr; Pós-Produção &rarr; Finalizado.
          </p>
        </div>

        {/* Pipeline Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <Film className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">Captações Ativas</p>
              <p className="text-xl font-semibold text-[#f6f4ef] tabular-nums">{activeEventsCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">Valor em Pipeline</p>
              <p className="text-xl font-semibold text-[#dfba88] tabular-nums">{formatBRL(totalPipelineRevenue)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">Total de Eventos</p>
              <p className="text-xl font-semibold text-[#f6f4ef] tabular-nums">{events.length}</p>
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
