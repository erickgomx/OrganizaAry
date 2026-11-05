import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Calendar, Plus } from "lucide-react";

export const metadata = {
  title: "Eventos & Captações | OrganizaAry",
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 md:pb-10">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-400" />
              Eventos & Captações
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Pipeline de status: Orçamento/Lead → Agendado → Captação → Pós-Produção → Finalizado.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-neutral-300" />
            <span>Novo Evento</span>
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Pipeline de Eventos pronto para ativação</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Gatilhos de sincronização com Google Calendar e Google Drive configurados para a Fase 3.
          </p>
        </div>
      </main>
    </div>
  );
}
