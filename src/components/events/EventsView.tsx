"use client";

import { useState } from "react";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  MessageCircle,
  FolderOpen,
  Search,
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  MoreVertical,
  ArrowRight,
  Video,
  CheckSquare,
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
} from "@/actions/tasks";
import { EventStatus } from "@/types/database";
import { EventModal } from "./EventModal";
import { TaskModal } from "@/components/tasks/TaskModal";

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
      color: "text-[#c8a97e]",
      bg: "bg-[#1c1a18]",
      border: "border-[#332e27]",
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

  const handleDeleteEvent = async (id: string, title: string) => {
    if (confirm(`Deseja remover o ensaio "${title}"?`)) {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      await deleteEventAction(id);
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

  const handleDeleteTask = async (id: string, title: string) => {
    if (confirm(`Deseja remover a tarefa "${title}"?`)) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await deleteTaskAction(id);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23201c] pb-4">
        {/* Simple Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#151412] border border-[#26231f]">
          <button
            onClick={() => setActiveTab("agenda")}
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "agenda"
                ? "bg-[#1c1a18] text-[#dfba88] border border-[#332e27] shadow-sm"
                : "text-[#8e887f] hover:text-[#f6f4ef]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#c8a97e]" />
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
                ? "bg-[#1c1a18] text-[#dfba88] border border-[#332e27] shadow-sm"
                : "text-[#8e887f] hover:text-[#f6f4ef]"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#c8a97e]" />
            <span>Fila de Edição</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 tabular-nums">
              {tasks.filter((t) => !t.is_done).length}
            </span>
          </button>
        </div>

        {/* Search & Action Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou trabalho..."
              className="w-full rounded-xl border border-[#26231f] bg-[#151412] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
            />
          </div>

          {activeTab === "agenda" ? (
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0"
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
            <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-12 text-center space-y-2">
              <Calendar className="w-6 h-6 text-[#736e65] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">
                {searchTerm ? "Nenhum ensaio encontrado." : "Nenhum ensaio cadastrado ainda."}
              </p>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsEventModalOpen(true);
                }}
                className="text-xs text-[#c8a97e] hover:underline font-medium"
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
                    className="group relative rounded-2xl border border-[#26231f] bg-[#151412] hover:border-[#38332c] hover:bg-[#181715] transition-all p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                        >
                          {status.label}
                        </span>

                        <h3 className="font-semibold text-sm sm:text-base text-[#f6f4ef] leading-snug pt-0.5">
                          {ev.title}
                        </h3>

                        <div className="flex items-center gap-2">
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

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === ev.id ? null : ev.id)
                          }
                          className="p-1.5 rounded-lg text-[#736e65] hover:text-[#f6f4ef] hover:bg-[#1c1a18] transition-colors"
                          type="button"
                          title="Opções"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuId === ev.id && (
                          <div className="absolute right-0 top-8 z-20 w-32 rounded-xl border border-[#2d2822] bg-[#181715] p-1 shadow-xl text-xs space-y-0.5">
                            <button
                              onClick={() => {
                                setEditingEvent(ev);
                                setIsEventModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#9d978d] hover:bg-[#221f1c] hover:text-[#f6f4ef] transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDeleteEvent(ev.id, ev.title);
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
                    <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-[#181715] border border-[#23201c] text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[#dfba88] tabular-nums">
                          <Clock className="w-3 h-3 text-[#c8a97e]" />
                          <span>{formatDate(ev.date)}</span>
                        </div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-[#8e887f]">
                            <MapPin className="w-3 h-3 text-[#736e65]" />
                            <span className="truncate max-w-[180px]">{ev.location}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-xs sm:text-sm font-semibold text-[#dfba88] tabular-nums">
                        {formatBRL(Number(ev.price))}
                      </span>
                    </div>

                    {/* Bottom: Fast Stage Progress & Links */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#23201c]">
                      {nextStatusObj ? (
                        <button
                          onClick={() => handleStatusChange(ev.id, nextStatusObj.key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1c1a18] hover:bg-[#23201c] border border-[#2d2822] text-[#f6f4ef] text-xs font-medium transition-all"
                        >
                          <span>{nextStatusObj.nextLabel || nextStatusObj.label}</span>
                          <ArrowRight className="w-3 h-3 text-[#c8a97e]" />
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9fc193]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Finalizado & Entregue</span>
                        </span>
                      )}

                      {/* Subtle Google Links (Only when ready) */}
                      <div className="flex items-center gap-2">
                        {ev.drive_folder_url && (
                          <a
                            href={ev.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1a1917] text-[#d4a359] border border-[#26231f] hover:border-[#d4a359]/30 text-[11px] transition-colors"
                            title="Abrir pasta no Google Drive"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Pasta RAWs/Entregas</span>
                          </a>
                        )}
                        {ev.meet_link && (
                          <a
                            href={ev.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1a1917] text-[#94a3b8] border border-[#26231f] hover:border-[#94a3b8]/30 text-[11px] transition-colors"
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

      {/* View 2: Fila de Edição (Checklist Limpo) */}
      {activeTab === "edicao" && (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-12 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#9fc193] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">
                {searchTerm ? "Nenhuma tarefa encontrada." : "Tudo entregue! Nenhuma tarefa pendente."}
              </p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="text-xs text-[#c8a97e] hover:underline font-medium"
              >
                + Criar nova tarefa de edição
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition-all shadow-sm ${
                    task.is_done
                      ? "border-[#201e1c] bg-[#121110] opacity-65"
                      : "border-[#26231f] bg-[#151412] hover:border-[#38332c] hover:bg-[#181715]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id, task.is_done)}
                      type="button"
                      className="text-[#736e65] hover:text-[#9fc193] transition-colors shrink-0"
                      title={task.is_done ? "Desmarcar conclusão" : "Concluir tarefa"}
                    >
                      {task.is_done ? (
                        <CheckCircle2 className="w-5 h-5 text-[#9fc193]" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <p
                        className={`text-sm font-medium leading-snug truncate ${
                          task.is_done
                            ? "line-through text-[#736e65]"
                            : "text-[#f6f4ef]"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.event && (
                        <p className="text-xs text-[#8e887f] truncate">
                          {task.event.title}
                          {task.event.client ? ` • ${task.event.client.name}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {task.due_date && (
                      <span className="text-xs text-[#8e887f] tabular-nums hidden sm:inline">
                        Entrega: {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_date))}
                      </span>
                    )}

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuId(activeMenuId === task.id ? null : task.id)
                        }
                        className="p-1 rounded text-[#736e65] hover:text-[#f6f4ef] transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-[#2d2822] bg-[#181715] p-1 shadow-xl text-xs space-y-0.5">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                              setActiveMenuId(null);
                            }}
                            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[#9d978d] hover:bg-[#221f1c] hover:text-[#f6f4ef] transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDeleteTask(task.id, task.title);
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
              ))}
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
    </div>
  );
}
