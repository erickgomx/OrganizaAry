"use client";

import { useState } from "react";
import { X, Loader2, CheckSquare, Calendar, Flag, AlignLeft, Film } from "lucide-react";
import { createTaskAction, updateTaskAction, TaskInput, TaskWithDetails } from "@/actions/tasks";
import { TaskPriority, TaskStatus } from "@/types/database";

interface SimpleEventOption {
  id: string;
  title: string;
  clientName?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithDetails | null;
  events: SimpleEventOption[];
  defaultStatus?: TaskStatus;
  defaultEventId?: string;
  onSuccess?: () => void;
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  events,
  defaultStatus = "todo",
  defaultEventId,
  onSuccess,
}: TaskModalProps) {
  const isEditing = Boolean(task);

  const getInitialDueDate = () => {
    if (task?.due_date) {
      const d = new Date(task.due_date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return "";
  };

  const [formData, setFormData] = useState<TaskInput>({
    title: task?.title || "",
    description: task?.description || "",
    eventId: task?.event_id || defaultEventId || "",
    priority: task?.priority || "medium",
    status: task?.status || defaultStatus,
    dueDate: getInitialDueDate(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && task) {
        const res = await updateTaskAction(task.id, formData);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createTaskAction(formData);
        if (res.error) throw new Error(res.error);
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar tarefa.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            {isEditing ? "Editar Tarefa" : "Nova Tarefa de Pós-Produção"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/40 p-3 text-xs text-red-300 border border-red-800/40">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Título da Tarefa *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Curadoria de fotos, Color grading do teaser"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Captação / Evento Vinculado
            </label>
            <div className="relative">
              <Film className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
              <select
                value={formData.eventId || ""}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value || null })}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Geral (Sem evento específico)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.clientName ? `(${ev.clientName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Coluna / Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="todo">To Do (A Fazer)</option>
                <option value="in_progress">In Progress (Em Andamento)</option>
                <option value="done">Done (Concluído)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Prioridade
              </label>
              <div className="relative">
                <Flag className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente 🔥</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Data Limite (Prazo de Entrega)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={formData.dueDate || ""}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value || null })}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-3 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Detalhes / Checklist de Pós
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
              <textarea
                rows={3}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Instruções de exportação, proporção de aspecto, ajustes do cliente..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? "Salvar Alterações" : "Criar Tarefa"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
