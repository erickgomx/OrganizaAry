"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Calendar,
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
  Filter,
  Film,
  Flame,
  CheckCheck,
} from "lucide-react";
import {
  TaskWithDetails,
  updateTaskStatusAction,
  toggleTaskDoneAction,
  deleteTaskAction,
} from "@/actions/tasks";
import { TaskPriority, TaskStatus } from "@/types/database";
import { TaskModal } from "./TaskModal";

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
      title: "To Do",
      subtitle: "Backlog & A Fazer",
      color: "border-neutral-800 bg-neutral-900/30",
      accent: "text-neutral-400 bg-neutral-800",
    },
    {
      id: "in_progress",
      title: "In Progress",
      subtitle: "Edição & Pós Ativa",
      color: "border-blue-900/40 bg-blue-950/10",
      accent: "text-blue-400 bg-blue-950/60",
    },
    {
      id: "done",
      title: "Done",
      subtitle: "Entregue & Concluído",
      color: "border-emerald-900/40 bg-emerald-950/10",
      accent: "text-emerald-400 bg-emerald-950/60",
    },
  ];

  const priorityConfig: Record<
    TaskPriority,
    { label: string; badgeClass: string; isUrgent?: boolean }
  > = {
    low: {
      label: "Baixa",
      badgeClass: "bg-neutral-800 text-neutral-300 border-neutral-700/50",
    },
    medium: {
      label: "Média",
      badgeClass: "bg-amber-950/60 text-amber-300 border-amber-800/50",
    },
    high: {
      label: "Alta",
      badgeClass: "bg-orange-950/60 text-orange-300 border-orange-800/50",
    },
    urgent: {
      label: "Urgente",
      badgeClass: "bg-red-950/80 text-red-300 border-red-700/80 animate-pulse",
      isUrgent: true,
    },
  };

  const handleMoveColumn = async (taskId: string, targetStatus: TaskStatus) => {
    // Optimistic update
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

    // Optimistic update
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarefas, descrições ou projetos..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "all")}
            className="rounded-xl border border-neutral-800 bg-neutral-900/80 py-2 px-3 text-xs text-neutral-300 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">Todas prioridades</option>
            <option value="urgent">Urgente 🔥</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setModalDefaultStatus("todo");
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
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
              className={`rounded-2xl border ${col.color} p-4 flex flex-col min-h-[500px] space-y-3 backdrop-blur-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{col.title}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.accent}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">{col.subtitle}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingTask(null);
                    setModalDefaultStatus(col.id);
                    setIsModalOpen(true);
                  }}
                  type="button"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  title={`Adicionar tarefa em ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks List with Framer Motion */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                <AnimatePresence>
                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800/60 p-6 text-center text-xs text-neutral-500">
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
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`group rounded-xl border p-3.5 space-y-3 shadow-md transition-all ${
                            task.is_done
                              ? "border-neutral-800 bg-neutral-950/40 opacity-75"
                              : "border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 hover:bg-neutral-900"
                          }`}
                        >
                          {/* Card Top Row: Checkbox, Title & Menu */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1">
                              <button
                                onClick={() => handleToggleDone(task.id, task.is_done)}
                                type="button"
                                className="mt-0.5 text-neutral-500 hover:text-amber-400 transition-colors shrink-0"
                              >
                                {task.is_done ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              <div>
                                <h4
                                  className={`text-xs font-bold leading-snug ${
                                    task.is_done
                                      ? "line-through text-neutral-500"
                                      : "text-white"
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {task.description && (
                                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuId(
                                    activeMenuId === task.id ? null : task.id
                                  )
                                }
                                className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === task.id && (
                                <div className="absolute right-0 top-6 z-20 w-32 rounded-xl border border-neutral-800 bg-neutral-950 p-1 shadow-xl text-xs space-y-0.5">
                                  <button
                                    onClick={() => {
                                      setEditingTask(task);
                                      setIsModalOpen(true);
                                      setActiveMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDelete(task.id, task.title);
                                    }}
                                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-red-400 hover:bg-red-950/40"
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
                            <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-950/30 px-2 py-1 rounded-md border border-blue-900/30 truncate">
                              <Film className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {task.event.title}
                                {task.event.client ? ` • ${task.event.client.name}` : ""}
                              </span>
                            </div>
                          )}

                          {/* Bottom Row: Priority, Due Date & Fast Move Arrows */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60 text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Priority Pill */}
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold border ${priority.badgeClass} flex items-center gap-1`}
                              >
                                {priority.isUrgent && <Flame className="w-2.5 h-2.5" />}
                                <span>{priority.label}</span>
                              </span>

                              {/* Due Date Indicator */}
                              {task.due_date && (
                                <span
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                                    overdue
                                      ? "bg-red-950/60 text-red-400 font-bold border border-red-800/40"
                                      : "text-neutral-400"
                                  }`}
                                  title={overdue ? "Tarefa Atrasada!" : "Data limite"}
                                >
                                  {overdue ? (
                                    <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                                  ) : (
                                    <Clock className="w-2.5 h-2.5" />
                                  )}
                                  <span>{formatDate(task.due_date)}</span>
                                </span>
                              )}
                            </div>

                            {/* Move Left / Right Single-Tap Thumb Buttons (Mobile Set Ready) */}
                            <div className="flex items-center gap-0.5">
                              {colIndex > 0 && (
                                <button
                                  onClick={() =>
                                    handleMoveColumn(task.id, columns[colIndex - 1].id)
                                  }
                                  className="p-1 rounded bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
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
                                  className="p-1 rounded bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
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
