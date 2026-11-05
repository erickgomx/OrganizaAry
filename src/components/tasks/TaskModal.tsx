"use client";

import { useState } from "react";
import { X, Loader2, CheckSquare, Calendar, Flag, AlignLeft, Film, Trash2 } from "lucide-react";
import { createTaskAction, updateTaskAction, deleteTaskAction, TaskInput, TaskWithDetails } from "@/actions/tasks";
import { TaskPriority, TaskStatus } from "@/types/database";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#2d2822] bg-[#161513] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#23201c] pb-3">
          <h3 className="text-sm font-semibold text-[#f6f4ef] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#c8a97e]" />
            {isEditing ? "Editar Detalhes da Tarefa" : "Nova Tarefa de Pós-Produção"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-[#736e65] hover:text-[#f6f4ef] hover:bg-[#1c1a18] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/20 p-3 text-xs text-red-300 border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Título da Tarefa *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Curadoria de fotos, Color grading do teaser"
              className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 px-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Captação / Evento Vinculado
            </label>
            <div className="relative">
              <Film className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <select
                value={formData.eventId || ""}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value || null })}
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
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
              <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
                Coluna / Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 px-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              >
                <option value="todo">A Fazer</option>
                <option value="in_progress">Em Andamento</option>
                <option value="done">Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
                Prioridade
              </label>
              <div className="relative">
                <Flag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Data Limite (Prazo de Entrega)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <input
                type="date"
                value={formData.dueDate || ""}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value || null })}
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Detalhes / Checklist de Pós
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <textarea
                rows={3}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Instruções de exportação, proporção de aspecto, ajustes do cliente..."
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#23201c]">
            {isEditing && task ? (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={loading || isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#d48970] hover:bg-[#211615] text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || isDeleting}
                className="px-3 py-1.5 rounded-xl border border-[#26231f] bg-[#181715] text-[#8e887f] hover:text-[#f6f4ef] text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || isDeleting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEditing ? "Salvar Alterações" : "Criar Tarefa"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation */}
        {task && (
          <ConfirmModal
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            isLoading={isDeleting}
            title="Remover Tarefa"
            description={`Tem certeza que deseja remover a tarefa "${task.title}"?`}
            confirmLabel="Sim, Remover"
            onConfirm={async () => {
              setIsDeleting(true);
              const res = await deleteTaskAction(task.id);
              setIsDeleting(false);
              if (res.success) {
                setIsConfirmDeleteOpen(false);
                onSuccess?.();
                onClose();
              } else {
                setError(res.error || "Erro ao excluir tarefa.");
                setIsConfirmDeleteOpen(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
