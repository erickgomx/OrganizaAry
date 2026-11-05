"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Film,
  Flame,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import {
  TaskWithDetails,
  updateTaskStatusAction,
  toggleTaskDoneAction,
  deleteTaskAction,
} from "@/actions/tasks";
import { TaskPriority, TaskStatus } from "@/types/database";
import { TaskModal } from "./TaskModal";
import { parseTaskDescription } from "@/lib/checklist";

interface SimpleEventOption {
  id: string;
  title: string;
  clientName?: string;
}

interface KanbanBoardProps {
  initialTasks: TaskWithDetails[];
  events: SimpleEventOption[];
}

export function KanbanBoard({ initialTasks, events }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>("todo");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const columns: {
    id: TaskStatus;
    title: string;
    subtitle: string;
    color: string;
    accent: string;
  }[] = [
    {
      id: "todo",
      title: "A Fazer",
      subtitle: "Backlog & Novas Tarefas",
      color: "border-[#33293c] bg-[#120e15]",
      accent: "text-[#968a9c] bg-[#231c29] border border-[#33293c]",
    },
    {
      id: "in_progress",
      title: "Em Andamento",
      subtitle: "Edição & Pós-Produção",
      color: "border-[#252c38]/40 bg-[#131518]/60",
      accent: "text-[#94a3b8] bg-[#161a20] border border-[#252c38]",
    },
    {
      id: "done",
      title: "Concluído",
      subtitle: "Entregue & Finalizado",
      color: "border-[#273829]/40 bg-[#121613]/60",
      accent: "text-[#9fc193] bg-[#162017] border border-[#273829]",
    },
  ];

  const priorityConfig: Record<
    TaskPriority,
    { label: string; badgeClass: string; isUrgent?: boolean }
  > = {
    low: {
      label: "Baixa",
      badgeClass: "bg-[#1a151f] text-[#968a9c] border-[#33293c]",
    },
    medium: {
      label: "Média",
      badgeClass: "bg-[#211a12] text-[#d4a359] border-[#382b1d]",
    },
    high: {
      label: "Alta",
      badgeClass: "bg-[#211714] text-[#d48970] border-[#3b2520]",
    },
    urgent: {
      label: "Urgente",
      badgeClass: "bg-[#261514] text-[#e06b63] border-[#4a2420]",
      isUrgent: true,
    },
  };

  const handleMoveColumn = async (taskId: string, targetStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: targetStatus, is_done: targetStatus === "done" }
          : t
      )
    );

    try {
      await updateTaskStatusAction(taskId, targetStatus);
    } catch (err) {
      console.error("Erro ao mover tarefa:", err);
    }
  };

  const handleToggleDone = async (taskId: string, currentIsDone: boolean) => {
    const nextIsDone = !currentIsDone;
    const nextStatus: TaskStatus = nextIsDone ? "done" : "todo";

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, is_done: nextIsDone, status: nextStatus } : t
      )
    );

    try {
      await toggleTaskDoneAction(taskId, currentIsDone);
    } catch (err) {
      console.error("Erro ao alternar conclusão:", err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Deseja remover a tarefa "${title}"?`)) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await deleteTaskAction(id);
    }
  };

  const isOverdue = (dueDateStr: string | null, isDone: boolean) => {
    if (!dueDateStr || isDone) return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(dateStr));
  };

  const filteredTasks = tasks.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.event?.title && t.event.title.toLowerCase().includes(term));

    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter & Creation Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarefas, descrições ou projetos..."
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            />
          </div>

          <div className="relative flex items-center">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}
              className="appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-3 pr-8 text-xs text-[#968a9c] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            >
              <option value="all" className="bg-[#1a151f] text-[#f4eff5]">Todas as prioridades</option>
              <option value="urgent" className="bg-[#1a151f] text-[#f4eff5]">Urgente</option>
              <option value="high" className="bg-[#1a151f] text-[#f4eff5]">Alta</option>
              <option value="medium" className="bg-[#1a151f] text-[#f4eff5]">Média</option>
              <option value="low" className="bg-[#1a151f] text-[#f4eff5]">Baixa</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e6375] pointer-events-none shrink-0" />
          </div>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setModalDefaultStatus("todo");
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Kanban 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {columns.map((col, colIndex) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`rounded-2xl border ${col.color} p-4 flex flex-col min-h-[500px] space-y-3`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#33293c] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#f4eff5] text-xs sm:text-sm">{col.title}</h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full tabular-nums ${col.accent}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6e6375] mt-0.5">{col.subtitle}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingTask(null);
                    setModalDefaultStatus(col.id);
                    setIsModalOpen(true);
                  }}
                  type="button"
                  className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
                  title={`Adicionar tarefa em ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List with Framer Motion */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                <AnimatePresence>
                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#33293c] p-6 text-center text-xs text-[#6e6375]">
                      Nenhuma tarefa nesta etapa.
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priority = priorityConfig[task.priority];
                      const overdue = isOverdue(task.due_date, task.is_done);

                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className={`group rounded-xl border p-3.5 space-y-2.5 shadow-sm transition-all ${
                            task.is_done
                              ? "border-[#231c29] bg-[#120e15] opacity-70"
                              : "border-[#33293c] bg-[#1a151f] hover:border-[#33293c] hover:bg-[#1a151f]"
                          }`}
                        >
                          {/* Card Top Row: Checkbox, Title & Menu */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1">
                              <button
                                onClick={() => handleToggleDone(task.id, task.is_done)}
                                type="button"
                                className="mt-0.5 text-[#6e6375] hover:text-[#9873a1] transition-colors shrink-0"
                                title={task.is_done ? "Marcar como não concluída" : "Marcar como concluída"}
                              >
                                {task.is_done ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#9fc193]" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <h4
                                  className={`text-xs font-medium leading-snug ${
                                    task.is_done
                                      ? "line-through text-[#6e6375]"
                                      : "text-[#f4eff5]"
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {(() => {
                                  const { notes, checklist } = parseTaskDescription(task.description);
                                  const completedChecklistCount = checklist.filter((c) => c.completed).length;

                                  return (
                                    <>
                                      {checklist.length > 0 && (
                                        <div className="space-y-1 mt-1.5">
                                          <div className="flex items-center justify-between text-[10px] text-[#968a9c]">
                                            <span className="flex items-center gap-1 font-medium text-[#bba0c1]">
                                              <ListChecks className="w-3 h-3 text-[#9873a1]" />
                                              {completedChecklistCount}/{checklist.length} etapas
                                            </span>
                                            <span className="tabular-nums">
                                              {Math.round((completedChecklistCount / checklist.length) * 100)}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-[#120e15] h-1 rounded-full overflow-hidden border border-[#33293c]/50">
                                            <div
                                              className="bg-gradient-to-r from-[#9873a1] to-[#9fc193] h-full transition-all duration-300"
                                              style={{
                                                width: `${(completedChecklistCount / checklist.length) * 100}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      {notes && (
                                        <p className="text-[11px] text-[#968a9c] mt-1 line-clamp-2 leading-relaxed">
                                          {notes}
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuId(
                                    activeMenuId === task.id ? null : task.id
                                  )
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
                                      setIsModalOpen(true);
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
                                      handleDelete(task.id, task.title);
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

                          {/* Event Link Tag */}
                          {task.event && (
                            <div className="flex items-center gap-1 text-[10px] text-[#9873a1] bg-[#1a151f] px-2 py-1 rounded-md border border-[#33293c] truncate">
                              <Film className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {task.event.title}
                                {task.event.client ? ` • ${task.event.client.name}` : ""}
                              </span>
                            </div>
                          )}

                          {/* Bottom Row: Priority, Due Date & Fast Move Arrows */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#33293c] text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Priority Pill */}
                              <span
                                className={`px-2 py-0.5 rounded-md font-medium border ${priority.badgeClass} flex items-center gap-1`}
                              >
                                {priority.isUrgent && <Flame className="w-2.5 h-2.5" />}
                                <span>{priority.label}</span>
                              </span>

                              {/* Due Date Indicator */}
                              {task.due_date && (
                                <span
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md tabular-nums ${
                                    overdue
                                      ? "bg-[#261514] text-[#e06b63] font-medium border border-[#4a2420]"
                                      : "text-[#968a9c]"
                                  }`}
                                  title={overdue ? "Tarefa Atrasada!" : "Data limite"}
                                >
                                  {overdue ? (
                                    <AlertTriangle className="w-2.5 h-2.5 text-[#e06b63]" />
                                  ) : (
                                    <Clock className="w-2.5 h-2.5" />
                                  )}
                                  <span>{formatDate(task.due_date)}</span>
                                </span>
                              )}
                            </div>

                            {/* Move Left / Right Buttons */}
                            <div className="flex items-center gap-0.5">
                              {colIndex > 0 && (
                                <button
                                  onClick={() =>
                                    handleMoveColumn(task.id, columns[colIndex - 1].id)
                                  }
                                  className="p-1 rounded bg-[#231c29] text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#33293c] transition-colors"
                                  title={`Mover para ${columns[colIndex - 1].title}`}
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}

                              {colIndex < columns.length - 1 && (
                                <button
                                  onClick={() =>
                                    handleMoveColumn(task.id, columns[colIndex + 1].id)
                                  }
                                  className="p-1 rounded bg-[#231c29] text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#33293c] transition-colors"
                                  title={`Mover para ${columns[colIndex + 1].title}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        events={events}
        defaultStatus={modalDefaultStatus}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
