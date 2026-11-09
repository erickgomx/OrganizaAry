"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  CheckSquare,
  Trash2,
  ListChecks,
  Film,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { EventWithClientInfo, deleteEventAction } from "@/actions/events";
import {
  TaskWithDetails,
  toggleTaskDoneAction,
  deleteTaskAction,
  toggleTaskChecklistItemAction,
} from "@/actions/tasks";
import { parseTaskDescription, serializeTaskDescription } from "@/lib/checklist";
import { formatTaskDueDateDisplay, isTaskOverdue } from "@/lib/utils";

const EventModal = dynamic(
  () => import("@/components/events/EventModal").then((m) => m.EventModal),
  { ssr: false }
);
const TaskModal = dynamic(
  () => import("@/components/tasks/TaskModal").then((m) => m.TaskModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((m) => m.ConfirmModal),
  { ssr: false }
);

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
  const router = useRouter();
  const [events, setEvents] = useState<EventWithClientInfo[]>(initialEvents);
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);

  // Sincroniza estado com as props quando o servidor revalidar dados
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithClientInfo | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);

  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Filtros e expansões para deixar o painel inicial completo e customizável
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<"pending" | "all" | "done">("pending");
  const [isChecklistsExpanded, setIsChecklistsExpanded] = useState(true);

  // Filtro de tarefas
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "pending") return !t.is_done;
    if (taskFilter === "done") return t.is_done;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.is_done).length;
  const doneCount = tasks.filter((t) => t.is_done).length;

  // Filtro de eventos do lado esquerdo
  const activeEvents = events.filter((e) => e.status !== "finished");
  const displayEvents = isEventsExpanded
    ? events
    : activeEvents.length > 0
    ? activeEvents.slice(0, 6)
    : events.slice(0, 6);

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
      console.error("Erro ao alternar item do checklist:", err);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33293c] pb-5">
        <div className="space-y-0.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-[#f4eff5] tracking-tight">
            Olá, {userName}
          </h2>
          <p className="text-xs sm:text-sm text-[#968a9c]">
            Visão completa dos seus trabalhos na agenda e blocos de tarefas em andamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[#f4eff5] text-xs font-medium transition-colors cursor-pointer active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#9873a1]" />
            <span>Nova Tarefa</span>
          </button>

          <button
            onClick={() => {
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Trabalho</span>
          </button>
        </div>
      </div>

      {/* Layout Completo: Trabalhos no lado esquerdo (vertical) e Tarefas como blocos no lado direito (lado a lado) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LADO ESQUERDO: Trabalhos listados um abaixo do outro (4 colunas) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 shadow-lg space-y-4">
            {/* Top Purple Accent Line (estilo foto de referência) */}
            <div className="h-1 bg-gradient-to-r from-[#9873a1] to-[#bba0c1] rounded-full w-full -mt-1" />

            <div className="flex items-center justify-between pb-2 border-b border-[#33293c]/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#9873a1]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
                  Trabalhos da Agenda
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#231c29] border border-[#33293c] text-[#bba0c1] tabular-nums">
                  {events.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/events"
                  className="text-[11px] text-[#9873a1] hover:text-[#bba0c1] font-medium flex items-center gap-0.5 transition-colors"
                  title="Abrir agenda completa"
                >
                  <span>Agenda</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {displayEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#33293c] bg-[#120e15]/40 p-6 text-center space-y-2">
                <Calendar className="w-6 h-6 text-[#6e6375] mx-auto" />
                <p className="text-xs font-medium text-[#f4eff5]">
                  Nenhum trabalho cadastrado.
                </p>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setIsEventModalOpen(true);
                  }}
                  className="text-xs text-[#9873a1] hover:underline font-medium cursor-pointer"
                >
                  + Agendar primeiro trabalho
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayEvents.map((ev) => {
                  const phone = cleanPhone(ev.client?.phone);
                  const { day, month, time } = parseDateParts(ev.date);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setEditingEvent(ev);
                        setIsEventModalOpen(true);
                      }}
                      className="group rounded-xl border border-[#33293c] bg-[#120e15] p-3 hover:border-[#9873a1]/60 hover:bg-[#1a151f] transition-all shadow-sm flex items-start gap-3 cursor-pointer select-none"
                      title="Toque para editar os detalhes deste trabalho"
                    >
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-[#231c29] border border-[#33293c] shrink-0 text-center select-none group-hover:border-[#9873a1]/40 transition-colors">
                        <span className="text-xs font-bold text-[#bba0c1] tabular-nums leading-none">
                          {day}
                        </span>
                        <span className="text-[8px] font-medium text-[#968a9c] uppercase tracking-wider mt-0.5">
                          {month}
                        </span>
                      </div>

                      {/* Shoot details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="font-semibold text-xs text-[#f4eff5] leading-snug truncate group-hover:text-[#bba0c1] transition-colors">
                            {ev.title}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#bba0c1] tabular-nums shrink-0">
                            {formatBRL(Number(ev.price))}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-[#968a9c] truncate">
                          {ev.client && <span className="truncate">{ev.client.name}</span>}
                          {phone && (
                            <a
                              href={`https://wa.me/55${phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#162017] text-[#9fc193] border border-[#273829] text-[9px] font-medium hover:bg-[#1e2e20] transition-colors shrink-0"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              <span>Zap</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-[#6e6375]">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Clock className="w-2.5 h-2.5 text-[#6e6375]" />
                            {time}
                          </span>
                          {ev.location && (
                            <span className="truncate max-w-[120px]" title={ev.location}>
                              {ev.location}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingEvent({ id: ev.id, title: ev.title });
                            }}
                            type="button"
                            className="p-1 rounded text-[#6e6375] hover:text-[#d48970] hover:bg-[#211615] transition-colors"
                            title="Remover ensaio da agenda"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botão de Expandir / Recolher Trabalhos */}
            {events.length > 6 && (
              <button
                type="button"
                onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                className="w-full py-2 px-3 rounded-xl border border-[#33293c] bg-[#120e15] hover:bg-[#231c29] text-xs font-medium text-[#bba0c1] hover:text-[#f4eff5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isEventsExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Recolher trabalhos</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Ver todos os {events.length} trabalhos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* LADO DIREITO: Tarefas como blocos um ao lado do outro (8 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header de Tarefas com controles de filtro e expansão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#16121b] border border-[#33293c] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#9873a1]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
                Painel de Tarefas
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#231c29] border border-[#33293c] text-[#bba0c1] tabular-nums">
                {filteredTasks.length}
              </span>
            </div>

            {/* Filtros rápidos: Pendentes | Todas | Concluídas e Botão de Expandir */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl bg-[#120e15] border border-[#33293c] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTaskFilter("pending")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    taskFilter === "pending"
                      ? "bg-[#231c29] text-[#bba0c1] shadow-sm font-semibold"
                      : "text-[#968a9c] hover:text-[#f4eff5]"
                  }`}
                >
                  Pendentes ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    taskFilter === "all"
                      ? "bg-[#231c29] text-[#bba0c1] shadow-sm font-semibold"
                      : "text-[#968a9c] hover:text-[#f4eff5]"
                  }`}
                >
                  Todas ({tasks.length})
                </button>
                {doneCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setTaskFilter("done")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      taskFilter === "done"
                        ? "bg-[#231c29] text-[#bba0c1] shadow-sm font-semibold"
                        : "text-[#968a9c] hover:text-[#f4eff5]"
                    }`}
                  >
                    Concluídas ({doneCount})
                  </button>
                )}
              </div>

              {/* Botão de Expandir / Recolher Etapas dos Blocos */}
              <button
                type="button"
                onClick={() => setIsChecklistsExpanded(!isChecklistsExpanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#33293c] bg-[#120e15] text-[11px] text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors cursor-pointer"
                title={isChecklistsExpanded ? "Recolher etapas dos blocos" : "Expandir etapas de todas as tarefas"}
              >
                <ListChecks className="w-3.5 h-3.5 text-[#9873a1]" />
                <span className="hidden sm:inline">
                  {isChecklistsExpanded ? "Recolher etapas" : "Expandir etapas"}
                </span>
              </button>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </button>
            </div>
          </div>

          {/* Grid de Tarefas em Blocos lado a lado (estilo foto enviada pelo usuário) */}
          {filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#16121b]/60 p-12 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-[#9fc193] mx-auto" />
              <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">
                {taskFilter === "pending"
                  ? "Tudo entregue! Nenhuma tarefa pendente."
                  : "Nenhuma tarefa cadastrada nesta visualização."}
              </p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="text-xs text-[#9873a1] hover:underline font-medium cursor-pointer"
              >
                + Criar nova tarefa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {filteredTasks.map((task) => {
                const { notes, checklist } = parseTaskDescription(task.description);
                const completedCount = checklist.filter((c) => c.completed).length;
                const overdue = isTaskOverdue(task.due_date, task.is_done);

                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    className={`group relative rounded-2xl border bg-[#18131d] p-4 shadow-md hover:border-[#9873a1]/70 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between select-none ${
                      task.is_done
                        ? "border-[#273829]/50 opacity-70 bg-[#121613]/40"
                        : overdue
                        ? "border-[#4a2420] bg-[#1e1416]/90"
                        : "border-[#33293c] hover:bg-[#1e1724]"
                    }`}
                    title="Toque em cima para alterar esta tarefa"
                  >
                    {/* Top Purple Accent Line (igual aos blocos da imagem de referência) */}
                    <div
                      className={`h-1.5 rounded-t-xl w-full -mt-4 -mx-4 mb-3.5 ${
                        task.is_done
                          ? "bg-[#9fc193]/70"
                          : overdue
                          ? "bg-[#e06b63]"
                          : "bg-gradient-to-r from-[#9873a1] to-[#bba0c1]"
                      }`}
                    />

                    <div className="space-y-3 flex-1">
                      {/* Top Header do Bloco: Checkbox, Título em negrito com ":" e botão de remover */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(task.id, task.is_done);
                            }}
                            className="mt-0.5 text-[#6e6375] hover:text-[#9fc193] transition-colors shrink-0"
                            title={task.is_done ? "Marcar como pendente" : "Concluir tarefa"}
                          >
                            {task.is_done ? (
                              <CheckCircle2 className="w-4 h-4 text-[#9fc193]" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            {/* Título com ":" no final (como na foto: "casa:", "trabalho:", "casamento:") */}
                            <h4
                              className={`font-bold text-sm tracking-tight leading-snug break-words ${
                                task.is_done
                                  ? "line-through text-[#6e6375]"
                                  : "text-[#f4eff5] group-hover:text-[#d4b9dc] transition-colors"
                              }`}
                            >
                              {task.title.endsWith(":") ? task.title : `${task.title}:`}
                            </h4>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTask({ id: task.id, title: task.title });
                          }}
                          className="p-1 rounded text-[#6e6375] hover:text-[#d48970] hover:bg-[#211615] transition-colors shrink-0"
                          title="Remover tarefa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Tags opcionais: Trabalho Vinculado e Data Limite */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        {task.event && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#231c29] border border-[#33293c] text-[#bba0c1] max-w-full truncate"
                            title={`Trabalho: ${task.event.title}`}
                          >
                            <Film className="w-2.5 h-2.5 text-[#9873a1] shrink-0" />
                            <span className="truncate">{task.event.title}</span>
                          </span>
                        )}

                        {task.due_date && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded tabular-nums border ${
                              overdue
                                ? "bg-[#261514] text-[#e06b63] border-[#4a2420] font-semibold"
                                : "bg-[#120e15] text-[#968a9c] border-[#33293c]"
                            }`}
                          >
                            <Calendar className="w-2.5 h-2.5 text-[#9873a1] shrink-0" />
                            <span>{formatTaskDueDateDisplay(task.due_date)}</span>
                          </span>
                        )}
                      </div>

                      {/* Lista de Itens do Check-list no formato bloco da foto ("-item 1", "-item 2") */}
                      {checklist.length > 0 && isChecklistsExpanded && (
                        <div className="space-y-1 pt-2 border-t border-[#33293c]/50">
                          {checklist.map((item) => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleChecklistItem(task.id, item.id, item.completed);
                              }}
                              className="flex items-start gap-1.5 text-xs group/chk hover:text-[#f4eff5] transition-colors py-0.5 cursor-pointer"
                              title={item.completed ? "Desmarcar esta etapa" : "Marcar etapa como concluída"}
                            >
                              <span
                                className={`font-bold select-none shrink-0 ${
                                  item.completed ? "text-[#9fc193]" : "text-[#9873a1]"
                                }`}
                              >
                                {item.completed ? "✓" : "-"}
                              </span>
                              <span
                                className={`leading-relaxed break-words text-[11px] sm:text-xs ${
                                  item.completed
                                    ? "line-through text-[#6e6375]"
                                    : "text-[#d1c8d4] group-hover/chk:text-[#f4eff5]"
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quando etapas estão recolhidas mas existem itens */}
                      {checklist.length > 0 && !isChecklistsExpanded && (
                        <div className="flex items-center justify-between text-[10px] text-[#968a9c] pt-1">
                          <span className="flex items-center gap-1">
                            <ListChecks className="w-3 h-3 text-[#9873a1]" />
                            {completedCount} de {checklist.length} concluídas
                          </span>
                          <span className="text-[#bba0c1] font-medium">Toque para ver</span>
                        </div>
                      )}

                      {/* Notas Adicionais */}
                      {notes && (
                        <p className="text-[11px] text-[#857b8c] line-clamp-2 leading-relaxed pt-1 italic">
                          {notes}
                        </p>
                      )}
                    </div>

                    {/* Rodapé do Bloco com barra de progresso se houver checklist */}
                    {checklist.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#33293c]/40 flex items-center justify-between gap-2 text-[10px]">
                        <div className="w-full bg-[#120e15] h-1 rounded-full overflow-hidden border border-[#33293c]/40">
                          <div
                            className="bg-gradient-to-r from-[#9873a1] to-[#9fc193] h-full transition-all duration-300"
                            style={{
                              width: `${(completedCount / checklist.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[#968a9c] tabular-nums shrink-0">
                          {Math.round((completedCount / checklist.length) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="pt-8 text-center border-t border-[#33293c]/60">
        <p className="text-[11px] text-[#6e6375]">
          &copy; {new Date().getFullYear()} EAREC Produtora Audiovisual &bull; Todos os direitos reservados
        </p>
      </div>

      {/* Modais de Edição e Criação */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setEditingEvent(null);
          }}
          event={editingEvent}
          clients={clients}
          onSuccess={(savedEvent) => {
            if (savedEvent) {
              setEvents((prev) => {
                const exists = prev.some((e) => e.id === savedEvent.id);
                if (exists) {
                  return prev.map((e) => (e.id === savedEvent.id ? savedEvent : e));
                }
                return [savedEvent, ...prev];
              });
            }
            router.refresh();
          }}
        />
      )}

      {isTaskModalOpen && (
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
          onSuccess={(savedTask) => {
            if (savedTask) {
              setTasks((prev) => {
                const exists = prev.some((t) => t.id === savedTask.id);
                if (exists) {
                  return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
                }
                return [savedTask, ...prev];
              });
            }
            router.refresh();
          }}
        />
      )}

      {/* Confirm Delete Event Modal */}
      {deletingEvent && (
        <ConfirmModal
          isOpen={!!deletingEvent}
          onClose={() => setDeletingEvent(null)}
          isLoading={isDeletingEvent}
          title="Remover Captação da Agenda"
          description={`Tem certeza que deseja remover "${deletingEvent?.title}"? Todas as tarefas vinculadas também serão excluídas.`}
          confirmLabel="Sim, Remover"
          onConfirm={handleConfirmDeleteEvent}
        />
      )}

      {/* Confirm Delete Task Modal */}
      {deletingTask && (
        <ConfirmModal
          isOpen={!!deletingTask}
          onClose={() => setDeletingTask(null)}
          isLoading={isDeletingTask}
          title="Remover Tarefa"
          description={`Tem certeza que deseja remover a tarefa "${deletingTask?.title}"?`}
          confirmLabel="Sim, Remover"
          onConfirm={handleConfirmDeleteTask}
        />
      )}
    </div>
  );
}
