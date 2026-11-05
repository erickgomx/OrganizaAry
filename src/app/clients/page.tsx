import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/actions/clients";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { ClientsList } from "@/components/clients/ClientsList";
import { Users, DollarSign, CalendarCheck } from "lucide-react";

export const metadata = {
  title: "Clientes (CRM) | OrganizaAry",
  description: "Gestão completa de clientes com visão 360º de faturamento e ensaios.",
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
    <div className="min-h-screen bg-[#0e0d0c] text-[#f6f4ef] pb-20 md:pb-12 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#c8a97e]" />
              Gestão de Clientes (CRM)
            </h1>
            <p className="text-xs sm:text-sm text-[#9d978d]">
              Base de relacionamentos, contatos rápidos e faturamento consolidado.
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <Users className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Total de Clientes
              </p>
              <p className="text-xl font-semibold text-[#f6f4ef] tabular-nums">
                {clients.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Faturamento Acumulado
              </p>
              <p className="text-xl font-semibold text-[#dfba88] tabular-nums">
                {formatBRL(totalRevenue)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#c8a97e]">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8e887f]">
                Captações Vinculadas
              </p>
              <p className="text-xl font-semibold text-[#f6f4ef] tabular-nums">
                {totalEvents}
              </p>
            </div>
          </div>
        </div>

        {/* Interactive List */}
        <ClientsList initialClients={clients} />
      </main>
    </div>
  );
}
