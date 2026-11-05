import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/actions/clients";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { ClientsList } from "@/components/clients/ClientsList";
import { Users, DollarSign, CalendarCheck } from "lucide-react";

export const metadata = {
  title: "Clientes (CRM) | OrganizaAry",
  description: "Gestão completa de clientes com visão 360º de faturamento e eventos.",
};

export default async function ClientsPage() {
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

  const clients = await getClients();

  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalEvents = clients.reduce((sum, c) => sum + c.eventsCount, 0);

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
        {/* Header & KPI Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Gestão de Clientes (CRM)
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Base de relacionamentos, contatos rápidos e faturamento consolidado.
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Total de Clientes</p>
              <p className="text-xl font-bold text-white">{clients.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Faturamento Acumulado</p>
              <p className="text-xl font-bold text-emerald-400">{formatBRL(totalRevenue)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-neutral-400">Captações Vinculadas</p>
              <p className="text-xl font-bold text-white">{totalEvents}</p>
            </div>
          </div>
        </div>

        {/* Interactive List */}
        <ClientsList initialClients={clients} />
      </main>
    </div>
  );
}
