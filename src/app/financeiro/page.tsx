import { redirect } from "next/navigation";
import {
  createClient,
  getAuthenticatedUser,
  getAuthenticatedProfile,
} from "@/lib/supabase/server";
import { getFinancialDataAction } from "@/actions/finance";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { FinanceOverview } from "@/components/finance/FinanceOverview";

export const metadata = {
  title: "Financeiro | OrganizaAry",
  description: "Fluxo de caixa, cálculo de lucro e divisão dos pilares.",
};

export default async function FinanceiroPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [profile, financeData, eventsRes] = await Promise.all([
    getAuthenticatedProfile(user.id),
    getFinancialDataAction(),
    supabase
      .from("events")
      .select("id, title, client:clients(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  const events = ((eventsRes.data || []) as unknown as {
    id: string;
    title: string;
    client?: { name?: string | null } | null;
  }[]).map((ev) => ({
    id: ev.id,
    title: ev.title,
    clientName: ev.client?.name || null,
  }));

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-24 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <FinanceOverview
          initialTransactions={financeData.transactions}
          initialPillars={financeData.pillars}
          events={events}
          schemaMissing={financeData.schemaMissing}
        />
      </main>
    </div>
  );
}
