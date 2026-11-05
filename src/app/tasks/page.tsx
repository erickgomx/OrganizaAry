import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { KanbanSquare, Plus } from "lucide-react";

export const metadata = {
  title: "Kanban de Tarefas | OrganizaAry",
};

export default async function TasksPage() {
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
              <KanbanSquare className="w-6 h-6 text-amber-400" />
              Kanban de Pós-Produção
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              To Do, In Progress e Done com arrasto fluido (Framer Motion).
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-neutral-300" />
            <span>Nova Tarefa</span>
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
            <KanbanSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Quadro Kanban pronto para ativação</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            O motor de tarefas e drag-and-drop interativo será ativado na Fase 4.
          </p>
        </div>
      </main>
    </div>
  );
}
