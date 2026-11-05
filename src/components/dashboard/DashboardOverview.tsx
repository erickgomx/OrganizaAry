"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  FolderOpen,
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  CheckSquare,
  Trash2,
} from "lucide-react";
import { sanitizeExternalUrl } from "@/lib/utils";
import { EventWithClientInfo, deleteEventAction } from "@/actions/events";
import { TaskWithDetails, toggleTaskDoneAction, deleteTaskAction } from "@/actions/tasks";
import { EventModal } from "@/components/events/EventModal";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DashboardOverviewProps {
  events: EventWithClientInfo[];
  tasks: TaskWithDetails[];
  clients: { id: string; name: string; phone?: string | null }[];
  userName: string;
}

export function DashboardOverview({
  events: initialEvents,
  tasks: initialTasks,
  clients,
  userName,
}: DashboardOverviewProps) {
  const [events, setEvents] = useState<EventWithClientInfo[]>(initialEvents);
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const pendingTasks = tasks.filter((t) => !t.is_done);
  const nextEvents = events
    .filter((e) => e.status !== "finished")
    .slice(0, 6);

  const handleConfirmDeleteEvent = async () => {
    if (!deletingEvent) return;
    setIsDeletingEvent(true);
    const res = await deleteEventAction(deletingEvent.id);
    setIsDeletingEvent(false);
    if (res.success) {
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
      setDeletingEvent(null);
    } else {
      alert("Erro ao excluir trabalho: " + res.error);
    }
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeletingTask(true);
    const res = await deleteTaskAction(deletingTask.id);
    setIsDeletingTask(false);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
      setDeletingTask(null);
    } else {
      alert("Erro ao excluir tarefa: " + res.error);
    }
  };

  const handleToggleTask = async (taskId: string, currentIsDone: boolean) => {
    const nextIsDone = !currentIsDone;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, is_done: nextIsDone, status: nextIsDone ? "done" : "todo" }
          : t
      )
    );
    try {
      await toggleTaskDoneAction(taskId, currentIsDone);
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
    }
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const cleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const parseDateParts = (isoString: string) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(d)
      .replace(".", "")
      .toUpperCase();
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return { day, month, time };
  };

  return (
    <div className="space-y-6">
      {/* Top Greeting & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23201c] pb-5">
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight">
            Olá, {userName}
          </h2>
          <p className="text-xs sm:text-sm text-[#8e887f]">
            Aqui está a sua agenda de ensaios e o que precisa ser entregue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTaskModalOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#2d2822] bg-[#161513] hover:bg-[#1c1a18] text-[#f6f4ef] text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#c8a97e]" />
            <span>Nova Tarefa</span>
          </button>

          <button
            onClick={() => setIsEventModalOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Trabalho</span>
          </button>
        </div>
      </div>

      {/* Two Clean Actionable Columns: Agenda & Edição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Coluna 1: Próximos Ensaios na Agenda */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8e887f] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#c8a97e]" />
              Próximos Ensaios na Agenda
            </h3>
            <Link
              href="/events"
              className="text-xs text-[#c8a97e] hover:text-[#dfba88] font-medium flex items-center gap-1 transition-colors"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {nextEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-8 text-center space-y-2">
              <Calendar className="w-6 h-6 text-[#736e65] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">
                Nenhum ensaio pendente na agenda.
              </p>
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="text-xs text-[#c8a97e] hover:underline font-medium"
              >
                + Agendar primeiro trabalho
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {nextEvents.map((ev) => {
                const phone = cleanPhone(ev.client?.phone);
                const { day, month, time } = parseDateParts(ev.date);

                return (
                  <div
                    key={ev.id}
                    className="group rounded-2xl border border-[#26231f] bg-[#151412] p-4 hover:border-[#38332c] hover:bg-[#181715] transition-all shadow-sm flex items-start gap-3.5"
                  >
                    {/* Clean Date Pill */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#1c1a18] border border-[#2e2923] shrink-0 text-center select-none">
                      <span className="text-sm font-bold text-[#dfba88] tabular-nums leading-none">
                        {day}
                      </span>
                      <span className="text-[9px] font-medium text-[#8e887f] uppercase tracking-wider mt-0.5">
                        {month}
                      </span>
                    </div>

                    {/* Shoot details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-[#f6f4ef] leading-snug truncate">
                          {ev.title}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-[#dfba88] tabular-nums">
                            {formatBRL(Number(ev.price))}
                          </span>
                          <button
                            onClick={() => setDeletingEvent({ id: ev.id, title: ev.title })}
                            type="button"
                            className="p-1 rounded-lg text-[#736e65] hover:text-[#d48970] hover:bg-[#211615] transition-colors"
                            title="Remover ensaio da agenda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-[#8e887f]">
                        {ev.client && <span>{ev.client.name}</span>}
                        {phone && (
                          <a
                            href={`https://wa.me/55${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#162017] text-[#9fc193] border border-[#273829] text-[10px] font-medium hover:bg-[#1e2e20] transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="w-2.5 h-2.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#736e65] pt-0.5">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3 text-[#736e65]" />
                          {time}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="w-3 h-3 text-[#736e65]" />
                            {ev.location}
                          </span>
                        )}
                        {sanitizeExternalUrl(ev.drive_folder_url) && (
                          <a
                            href={sanitizeExternalUrl(ev.drive_folder_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#d4a359] hover:underline"
                            title="Pasta no Google Drive"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Drive</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna 2: Fila de Edição & Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8e887f] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#c8a97e]" />
              Fila de Edição ({pendingTasks.length})
            </h3>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              type="button"
              className="text-xs text-[#c8a97e] hover:text-[#dfba88] font-medium transition-colors"
            >
              + Adicionar tarefa
            </button>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-8 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#9fc193] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">
                Tudo entregue! Nenhuma edição pendente.
              </p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs text-[#c8a97e] hover:underline font-medium"
              >
                + Criar nova tarefa
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-[#26231f] bg-[#151412] p-3.5 flex items-center justify-between gap-3 hover:border-[#38332c] hover:bg-[#181715] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id, task.is_done)}
                      type="button"
                      className="text-[#736e65] hover:text-[#9fc193] transition-colors shrink-0"
                      title="Marcar como entregue / concluído"
                    >
                      {task.is_done ? (
                        <CheckCircle2 className="w-4 h-4 text-[#9fc193]" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#f6f4ef] truncate">
                        {task.title}
                      </p>
                      {task.event && (
                        <p className="text-[10px] text-[#8e887f] truncate mt-0.5">
                          {task.event.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.due_date && (
                      <span className="text-[10px] text-[#8e887f] tabular-nums">
                        Entrega: {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_date))}
                      </span>
                    )}
                    <button
                      onClick={() => setDeletingTask({ id: task.id, title: task.title })}
                      type="button"
                      className="p-1 rounded-lg text-[#736e65] hover:text-[#d48970] hover:bg-[#211615] transition-colors"
                      title="Remover tarefa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="pt-8 text-center border-t border-[#23201c]/60">
        <p className="text-[11px] text-[#736e65]">
          &copy; {new Date().getFullYear()} EAREC Produtora Audiovisual &bull; Todos os direitos reservados
        </p>
      </div>

      {/* Modais */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        clients={clients}
        onSuccess={() => window.location.reload()}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          clientName: e.client?.name,
        }))}
        onSuccess={() => window.location.reload()}
      />

      {/* Confirm Delete Event Modal */}
      <ConfirmModal
        isOpen={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        isLoading={isDeletingEvent}
        title="Remover Captação da Agenda"
        description={`Tem certeza que deseja remover "${deletingEvent?.title}"? Todas as tarefas vinculadas também serão excluídas.`}
        confirmLabel="Sim, Remover"
        onConfirm={handleConfirmDeleteEvent}
      />

      {/* Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        isLoading={isDeletingTask}
        title="Remover Tarefa"
        description={`Tem certeza que deseja remover a tarefa "${deletingTask?.title}"?`}
        confirmLabel="Sim, Remover"
        onConfirm={handleConfirmDeleteTask}
      />
    </div>
  );
}
