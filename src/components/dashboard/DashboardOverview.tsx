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
  Video,
  CheckSquare,
} from "lucide-react";
import { EventWithClientInfo } from "@/actions/events";
import { TaskWithDetails, toggleTaskDoneAction } from "@/actions/tasks";
import { EventModal } from "@/components/events/EventModal";
import { TaskModal } from "@/components/tasks/TaskModal";

interface DashboardOverviewProps {
  events: EventWithClientInfo[];
  tasks: TaskWithDetails[];
  clients: { id: string; name: string; phone?: string | null }[];
  userName: string;
}

export function DashboardOverview({
  events,
  tasks: initialTasks,
  clients,
  userName,
}: DashboardOverviewProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const pendingTasks = tasks.filter((t) => !t.is_done);
  const nextEvents = events
    .filter((e) => e.status !== "finished")
    .slice(0, 5);

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

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

  const cleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
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
        {/* Coluna 1: Próximas Captações da Agenda */}
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
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">Nenhum ensaio pendente na agenda.</p>
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
                return (
                  <div
                    key={ev.id}
                    className="group rounded-2xl border border-[#26231f] bg-[#151412] p-4 hover:border-[#38332c] hover:bg-[#181715] transition-all shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-[#f6f4ef] leading-snug">
                          {ev.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {ev.client && (
                            <span className="text-xs text-[#8e887f]">
                              {ev.client.name}
                            </span>
                          )}
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
                      </div>

                      <span className="text-xs font-semibold text-[#dfba88] tabular-nums shrink-0">
                        {formatBRL(Number(ev.price))}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#23201c] text-[11px] text-[#8e887f]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-[#dfba88] tabular-nums">
                          <Clock className="w-3 h-3 text-[#c8a97e]" />
                          {formatDate(ev.date)}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#736e65]" />
                            {ev.location}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.drive_folder_url && (
                          <a
                            href={ev.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#d4a359] hover:underline"
                            title="Abrir pasta no Google Drive"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Pasta Drive</span>
                          </a>
                        )}
                        {ev.meet_link && (
                          <a
                            href={ev.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#94a3b8] hover:underline"
                            title="Entrar no Google Meet"
                          >
                            <Video className="w-3 h-3" />
                            <span>Reunião</span>
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
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">Tudo entregue! Nenhuma edição pendente.</p>
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

                  {task.due_date && (
                    <span className="text-[10px] text-[#8e887f] tabular-nums shrink-0">
                      Entrega: {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_date))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
    </div>
  );
}
