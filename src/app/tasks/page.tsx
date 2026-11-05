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
    <div className="min-h-screen bg-[#0e0d0c] text-[#f6f4ef] pb-20 md:pb-12 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight flex items-center gap-2">
              <KanbanSquare className="w-5 h-5 text-[#c8a97e]" />
              Kanban de Pós-Produção
            </h1>
            <p className="text-xs sm:text-sm text-[#9d978d]">
              Fluxo de curadoria, edição, color grading e entrega final de vídeo e foto.
            </p>
          </div>
        </div>

        {/* Kanban Metric Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1c1a18] border border-[#2d2822] text-[#8e887f]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f]">A Fazer (To Do)</p>
              <p className="text-lg font-semibold text-[#f6f4ef] tabular-nums">{todoCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#161a20] border border-[#252c38] text-[#94a3b8]">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f]">Em Andamento</p>
              <p className="text-lg font-semibold text-[#94a3b8] tabular-nums">{inProgressCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#162017] border border-[#273829] text-[#9fc193]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f]">Concluídas (Done)</p>
              <p className="text-lg font-semibold text-[#9fc193] tabular-nums">{doneCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#26231f] bg-[#151412] p-3.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#211714] border border-[#3b2520] text-[#d48970]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f]">Urgentes Ativas</p>
              <p className="text-lg font-semibold text-[#d48970] tabular-nums">{urgentCount}</p>
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
