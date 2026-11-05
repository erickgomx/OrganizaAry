"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  MessageCircle,
  Search,
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  MoreVertical,
  Video,
  CheckSquare,
  ListChecks,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  EventWithClientInfo,
  updateEventStatusAction,
  deleteEventAction,
} from "@/actions/events";
import {
  TaskWithDetails,
  toggleTaskDoneAction,
  deleteTaskAction,
  toggleTaskChecklistItemAction,
} from "@/actions/tasks";
import { EventStatus } from "@/types/database";
import { EventModal } from "./EventModal";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import { sanitizeExternalUrl } from "@/lib/utils";
import { parseTaskDescription, serializeTaskDescription } from "@/lib/checklist";

interface EventsViewProps {
  initialEvents: EventWithClientInfo[];
  initialTasks: TaskWithDetails[];
  clients: { id: string; name: string; phone?: string | null }[];
}

export function EventsView({
  initialEvents,
  initialTasks,
  clients,
}: EventsViewProps) {
  const [activeTab, setActiveTab] = useState<"agenda" | "edicao">("agenda");
  const [events, setEvents] = useState<EventWithClientInfo[]>(initialEvents);
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithClientInfo | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [expandedTaskChecklists, setExpandedTaskChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklistExpand = (taskId: string) => {
    setExpandedTaskChecklists((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleToggleChecklistItem = async (
    taskId: string,
    itemId: string,
    currentCompleted: boolean
  ) => {
    const nextCompleted = !currentCompleted;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const { notes, checklist } = parseTaskDescription(t.description);
        const updated = checklist.map((c) =>
          c.id === itemId ? { ...c, completed: nextCompleted } : c
        );
        return {
          ...t,
          description: serializeTaskDescription(notes, updated),
        };
      })
    );

    try {
      await toggleTaskChecklistItemAction(taskId, itemId, nextCompleted);
    } catch (err) {
      console.error("Erro ao atualizar checklist:", err);
    }
  };

  // Status Machine
  const statusMachine: {
    key: EventStatus;
    label: string;
    nextLabel?: string;
    color: string;
    bg: string;
    border: string;
  }[] = [
    {
      key: "budget_lead",
      label: "Orçamento",
      nextLabel: "Confirmar Agendamento",
      color: "text-[#d4a359]",
      bg: "bg-[#211a12]",
      border: "border-[#382b1d]",
    },
    {
      key: "scheduled",
      label: "Agendado",
      nextLabel: "Captação Concluída",
      color: "text-[#94a3b8]",
      bg: "bg-[#161a20]",
      border: "border-[#252c38]",
    },
    {
      key: "captured",
      label: "Gravado / Fotografado",
      nextLabel: "Iniciar Pós-Produção",
      color: "text-[#9873a1]",
      bg: "bg-[#231c29]",
      border: "border-[#33293c]",
    },
    {
      key: "post_production",
      label: "Em Edição",
      nextLabel: "Concluir e Entregar",
      color: "text-[#d48970]",
      bg: "bg-[#211714]",
      border: "border-[#3b2520]",
    },
    {
      key: "finished",
      label: "Finalizado",
      color: "text-[#9fc193]",
      bg: "bg-[#162017]",
      border: "border-[#273829]",
    },
  ];

  const getStatusObj = (statusKey: EventStatus) => {
    return statusMachine.find((s) => s.key === statusKey) || statusMachine[0];
  };

  const getNextStatus = (current: EventStatus): EventStatus | null => {
    const currentIndex = statusMachine.findIndex((s) => s.key === current);
    if (currentIndex >= 0 && currentIndex < statusMachine.length - 1) {
      return statusMachine[currentIndex + 1].key;
    }
    return null;
  };

  const handleStatusChange = async (id: string, newStatus: EventStatus) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, status: newStatus } : ev))
    );
    try {
      await updateEventStatusAction(id, newStatus);
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!deletingEvent) return;
    setIsDeletingEvent(true);
    const res = await deleteEventAction(deletingEvent.id);
    setIsDeletingEvent(false);
    if (res.success) {
      setEvents((prev) => prev.filter((ev) => ev.id !== deletingEvent.id));
      setDeletingEvent(null);
    } else {
      alert("Erro ao excluir ensaio: " + res.error);
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
      console.error("Erro ao alternar tarefa:", err);
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

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
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

  const term = searchTerm.toLowerCase();

  const filteredEvents = events.filter(
    (ev) =>
      ev.title.toLowerCase().includes(term) ||
      ev.client?.name?.toLowerCase().includes(term) ||
      (ev.location && ev.location.toLowerCase().includes(term))
  );

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.event?.title && t.event.title.toLowerCase().includes(term))
  );

  return (
    <div className="space-y-6">
      {/* Top Header: Unified Switcher & Search & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33293c] pb-4">
        {/* Simple Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120e15] border border-[#33293c]">
          <button
            onClick={() => setActiveTab("agenda")}
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "agenda"
                ? "bg-[#231c29] text-[#bba0c1] border border-[#33293c] shadow-sm"
                : "text-[#968a9c] hover:text-[#f4eff5]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#9873a1]" />
            <span>Agenda de Ensaios</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 tabular-nums">
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("edicao")}
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "edicao"
                ? "bg-[#231c29] text-[#bba0c1] border border-[#33293c] shadow-sm"
                : "text-[#968a9c] hover:text-[#f4eff5]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#9873a1]" />
            <span>Tarefas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 tabular-nums">
              {tasks.filter((t) => !t.is_done).length}
            </span>
          </button>
        </div>

        {/* Search & Action Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou trabalho..."
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            />
          </div>

          {activeTab === "agenda" ? (
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Ensaio</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {/* View 1: Agenda de Ensaios */}
      {activeTab === "agenda" && (
        <div>
          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#120e15]/40 p-12 text-center space-y-2">
              <Calendar className="w-6 h-6 text-[#6e6375] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">
                {searchTerm ? "Nenhum ensaio encontrado." : "Nenhum ensaio cadastrado ainda."}
              </p>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsEventModalOpen(true);
                }}
                className="text-xs text-[#9873a1] hover:underline font-medium"
              >
                + Agendar primeiro trabalho
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredEvents.map((ev) => {
                const status = getStatusObj(ev.status);
                const nextStatus = getNextStatus(ev.status);
                const nextStatusObj = nextStatus ? getStatusObj(nextStatus) : null;
                const phone = cleanPhone(ev.client?.phone);

                return (
                  <div
                    key={ev.id}
                    className="group relative rounded-2xl border border-[#33293c] bg-[#120e15] hover:border-[#33293c] hover:bg-[#1a151f] transition-all p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                        >
                          {status.label}
                        </span>

                        <h3 className="font-semibold text-sm sm:text-base text-[#f4eff5] leading-snug pt-0.5">
                          {ev.title}
                        </h3>

                        <div className="flex items-center gap-2">
                          {ev.client && (
                            <span className="text-xs text-[#968a9c]">
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

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === ev.id ? null : ev.id)
                          }
                          className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
                          type="button"
                          title="Opções"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === ev.id && (
                          <div className="absolute right-0 top-8 z-20 w-32 rounded-xl border border-[#33293c] bg-[#1a151f] p-1 shadow-xl text-xs space-y-0.5">
                            <button
                              onClick={() => {
                                setEditingEvent(ev);
                                setIsEventModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#968a9c] hover:bg-[#231c29] hover:text-[#f4eff5] transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeletingEvent({ id: ev.id, title: ev.title });
                              }}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#d48970] hover:bg-[#261714] transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details: Data, Local, Valor */}
                    <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-[#1a151f] border border-[#33293c] text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[#bba0c1] tabular-nums">
                          <Clock className="w-3 h-3 text-[#9873a1]" />
                          <span>{formatDate(ev.date)}</span>
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-[#968a9c]">
                            <MapPin className="w-3 h-3 text-[#6e6375]" />
                            <span className="truncate max-w-[180px]">{ev.location}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-xs sm:text-sm font-semibold text-[#bba0c1] tabular-nums">
                        {formatBRL(Number(ev.price))}
                      </span>
                    </div>

                    {/* Bottom: Fast Stage Progress & Links */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#33293c]">
                      {nextStatusObj ? (
                        <div className="w-full sm:w-auto flex-1 max-w-sm">
                          <SlideToConfirm
                            key={`${ev.id}-${ev.status}`}
                            label={nextStatusObj.nextLabel || nextStatusObj.label}
                            onConfirm={() => handleStatusChange(ev.id, nextStatusObj.key)}
                          />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9fc193] py-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Finalizado & Entregue</span>
                        </span>
                      )}

                      {/* Subtle Google Links (Only when ready) */}
                      <div className="flex items-center gap-2">
                        {sanitizeExternalUrl(ev.meet_link) && (
                          <a
                            href={sanitizeExternalUrl(ev.meet_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1a151f] text-[#94a3b8] border border-[#33293c] hover:border-[#94a3b8]/30 text-[11px] transition-colors"
                            title="Entrar na reunião Google Meet"
                          >
                            <Video className="w-3 h-3" />
                            <span>Meet</span>
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
      )}

      {/* View 2: Tarefas (Checklist Limpo) */}
      {activeTab === "edicao" && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#120e15]/40 p-12 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#9fc193] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">
                {searchTerm ? "Nenhuma tarefa encontrada." : "Tudo entregue! Nenhuma tarefa pendente."}
              </p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="text-xs text-[#9873a1] hover:underline font-medium"
              >
                + Criar nova tarefa
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const { notes, checklist } = parseTaskDescription(task.description);
                const isExpanded = expandedTaskChecklists[task.id];
                const completedChecklistCount = checklist.filter((c) => c.completed).length;

                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border p-4 transition-all shadow-sm ${
                      task.is_done
                        ? "border-[#231c29] bg-[#120e15] opacity-65"
                        : "border-[#33293c] bg-[#120e15] hover:border-[#33293c] hover:bg-[#1a151f]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task.id, task.is_done)}
                          type="button"
                          className="text-[#6e6375] hover:text-[#9fc193] transition-colors shrink-0"
                          title={task.is_done ? "Desmarcar conclusão" : "Concluir tarefa"}
                        >
                          {task.is_done ? (
                            <CheckCircle2 className="w-5 h-5 text-[#9fc193]" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={`text-sm font-medium leading-snug truncate ${
                                task.is_done
                                  ? "line-through text-[#6e6375]"
                                  : "text-[#f4eff5]"
                              }`}
                            >
                              {task.title}
                            </p>
                            {checklist.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleChecklistExpand(task.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#231c29] border border-[#33293c] text-[#bba0c1] hover:border-[#9873a1]/40 transition-colors"
                              >
                                <ListChecks className="w-3 h-3 text-[#9873a1]" />
                                <span>
                                  {completedChecklistCount}/{checklist.length} etapas
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-2.5 h-2.5 text-[#6e6375]" />
                                ) : (
                                  <ChevronDown className="w-2.5 h-2.5 text-[#6e6375]" />
                                )}
                              </button>
                            )}
                          </div>
                          {task.event && (
                            <p className="text-xs text-[#968a9c] truncate">
                              {task.event.title}
                              {task.event.client ? ` • ${task.event.client.name}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {task.due_date && (
                          <span className="text-xs text-[#968a9c] tabular-nums hidden sm:inline">
                            Entrega: {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_date))}
                          </span>
                        )}

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === task.id ? null : task.id)
                            }
                            className="p-1 rounded text-[#6e6375] hover:text-[#f4eff5] transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuId === task.id && (
                            <div className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-[#33293c] bg-[#1a151f] p-1 shadow-xl text-xs space-y-0.5">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setIsTaskModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#968a9c] hover:bg-[#231c29] hover:text-[#f4eff5] transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeletingTask({ id: task.id, title: task.title });
                                }}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#d48970] hover:bg-[#261714] transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Checklist Sub-items */}
                    {checklist.length > 0 && isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#33293c]/60 pl-8 space-y-1.5 animate-in fade-in duration-150">
                        <div className="w-full bg-[#1a151f] h-1 rounded-full overflow-hidden border border-[#33293c]/50 mb-2">
                          <div
                            className="bg-gradient-to-r from-[#9873a1] to-[#9fc193] h-full transition-all duration-300 rounded-full"
                            style={{
                              width: `${(completedChecklistCount / checklist.length) * 100}%`,
                            }}
                          />
                        </div>
                        {checklist.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-[#1a151f] transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleChecklistItem(task.id, item.id, item.completed)
                              }
                              className="flex items-center gap-2 text-xs flex-1 text-left min-w-0"
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-[#6e6375] shrink-0" />
                              )}
                              <span
                                className={`truncate ${
                                  item.completed ? "line-through text-[#6e6375]" : "text-[#f4eff5]"
                                }`}
                              >
                                {item.text}
                              </span>
                            </button>
                          </div>
                        ))}
                        {notes && (
                          <p className="text-[11px] text-[#968a9c] italic pt-1 pl-1">
                            Nota: {notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modais */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        clients={clients}
        onSuccess={() => window.location.reload()}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
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
        title="Remover Captação"
        description={`Tem certeza que deseja remover o ensaio "${deletingEvent?.title}"? Todas as tarefas vinculadas a este trabalho também serão excluídas.`}
        confirmLabel="Sim, Remover"
        onConfirm={handleConfirmDeleteEvent}
      />

      {/* Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        isLoading={isDeletingTask}
        title="Remover Tarefa"
        description={`Tem certeza que deseja excluir a tarefa "${deletingTask?.title}"?`}
        confirmLabel="Sim, Remover"
        onConfirm={handleConfirmDeleteTask}
      />
    </div>
  );
}
