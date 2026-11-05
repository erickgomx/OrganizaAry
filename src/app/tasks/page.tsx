import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/actions/tasks";
import { getEvents } from "@/actions/events";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { KanbanSquare, CheckSquare, Clock, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Kanban de Tarefas | OrganizaAry",
  description: "Quadro interativo de pós-produção com colunas To Do, In Progress e Done.",
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

  const [tasks, events] = await Promise.all([getTasks(), getEvents()]);

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const urgentCount = tasks.filter((t) => t.priority === "urgent" && !t.is_done).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 md:pb-10">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <KanbanSquare className="w-6 h-6 text-amber-400" />
              Kanban de Pós-Produção
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Gestão de fluxo de edição, curadoria, color grading e entregas de vídeo/foto.
            </p>
          </div>
        </div>

        {/* Kanban Metric Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-neutral-400">A Fazer (To Do)</p>
              <p className="text-lg font-bold text-white">{todoCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-neutral-400">Em Andamento</p>
              <p className="text-lg font-bold text-blue-400">{inProgressCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-neutral-400">Concluídas (Done)</p>
              <p className="text-lg font-bold text-emerald-400">{doneCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-950/60 border border-red-800/40 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-neutral-400">Urgentes Ativas</p>
              <p className="text-lg font-bold text-red-400">{urgentCount}</p>
            </div>
          </div>
        </div>

        {/* Interactive Kanban Board */}
        <KanbanBoard
          initialTasks={tasks}
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            clientName: e.client?.name,
          }))}
        />
      </main>
    </div>
  );
}
