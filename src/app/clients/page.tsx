import { redirect } from "next/navigation";
import { getAuthenticatedUser, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getClients } from "@/actions/clients";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { ClientsList } from "@/components/clients/ClientsList";
import { Users } from "lucide-react";

export const metadata = {
  title: "Clientes | OrganizaAry",
  description: "Lista de clientes, histórico de ensaios e contato direto via WhatsApp.",
};

export default async function ClientsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // Profile and clients fetched concurrently
  const [profile, clients] = await Promise.all([
    getAuthenticatedProfile(user.id),
    getClients(),
  ]);

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-20 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <AppNavbar profile={profile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33293c] pb-4">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#f4eff5] tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[#9873a1]" />
              Clientes ({clients.length})
            </h1>
            <p className="text-xs sm:text-sm text-[#968a9c]">
              Seus contatos, histórico de ensaios e WhatsApp direto.
            </p>
          </div>
        </div>

        {/* Clean Interactive List */}
        <ClientsList initialClients={clients} />
      </main>
    </div>
  );
}
