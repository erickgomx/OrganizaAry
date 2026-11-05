"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  CheckSquare,
  Calendar,
  Flag,
  AlignLeft,
  Film,
  Trash2,
  ChevronDown,
  Plus,
  CheckCircle2,
  Circle,
  ListChecks,
} from "lucide-react";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  TaskInput,
  TaskWithDetails,
} from "@/actions/tasks";
import { TaskPriority, TaskStatus } from "@/types/database";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { handleFormKeyDownEnterToNextField } from "@/lib/utils";
import {
  TaskChecklistItem,
  parseTaskDescription,
  serializeTaskDescription,
} from "@/lib/checklist";

function createChecklistItemId(): string {
  return `chk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

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

  const initialParsed = parseTaskDescription(task?.description);
  const currentTaskKey = task
    ? `${task.id}-${task.description || ""}-${task.title || ""}-${task.event_id || ""}-${task.priority || ""}-${task.status || ""}-${task.due_date || ""}`
    : `new-${defaultEventId || ""}-${defaultStatus || ""}`;

  const [prevTaskKey, setPrevTaskKey] = useState<string>(currentTaskKey);
  const [notes, setNotes] = useState(initialParsed.notes);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(initialParsed.checklist);
  const [newChecklistText, setNewChecklistText] = useState("");

  const [formData, setFormData] = useState<TaskInput>({
    title: task?.title || "",
    description: task?.description || "",
    eventId: task?.event_id || defaultEventId || "",
    priority: task?.priority || "medium",
    status: task?.status || defaultStatus,
    dueDate: getInitialDueDate(),
  });

  if (prevTaskKey !== currentTaskKey) {
    setPrevTaskKey(currentTaskKey);
    const parsed = parseTaskDescription(task?.description);
    setNotes(parsed.notes);
    setChecklist(parsed.checklist);
    setNewChecklistText("");
    setFormData({
      title: task?.title || "",
      description: task?.description || "",
      eventId: task?.event_id || defaultEventId || "",
      priority: task?.priority || "medium",
      status: task?.status || defaultStatus,
      dueDate: getInitialDueDate(),
    });
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const quickSuggestions = [
    "Backup dos arquivos",
    "Curadoria das fotos",
    "Correção de cor / LUTs",
    "Edição do teaser",
    "Exportação final",
    "Envio para aprovação",
  ];

  const handleAddChecklistItem = (textToAdd?: string) => {
    const text = (textToAdd ?? newChecklistText).trim();
    if (!text) return;

    if (checklist.some((item) => item.text.toLowerCase() === text.toLowerCase())) {
      setNewChecklistText("");
      return;
    }

    const newItem: TaskChecklistItem = {
      id: createChecklistItemId(),
      text,
      completed: false,
    };
    setChecklist((prev) => [...prev, newItem]);
    if (!textToAdd) {
      setNewChecklistText("");
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalDescription = serializeTaskDescription(notes, checklist);
    const submissionData = {
      ...formData,
      description: finalDescription,
    };

    try {
      if (isEditing && task) {
        const res = await updateTaskAction(task.id, submissionData);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createTaskAction(submissionData);
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

  const completedCount = checklist.filter((c) => c.completed).length;
  const progressPercent = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#9873a1]" />
            {isEditing ? "Editar Detalhes da Tarefa" : "Nova Tarefa"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/20 p-3 text-xs text-red-300 border border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDownEnterToNextField} className="flex flex-col gap-4">
          <div>
            <label htmlFor="task-title" className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
              Título da Tarefa *
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Curadoria de fotos, Color grading do teaser"
              className="w-full min-h-[42px] rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 px-3.5 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="task-event" className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
              Captação / Evento Vinculado
            </label>
            <div className="relative flex items-center">
              <Film className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <select
                id="task-event"
                value={formData.eventId || ""}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value || null })}
                className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              >
                <option value="" className="bg-[#1a151f] text-[#f4eff5]">Geral (Sem evento específico)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#1a151f] text-[#f4eff5]">
                    {ev.title} {ev.clientName ? `(${ev.clientName})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-status" className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
                Coluna / Estado
              </label>
              <div className="relative flex items-center">
                <select
                  id="task-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                  className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-3.5 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
                >
                  <option value="todo" className="bg-[#1a151f] text-[#f4eff5]">A Fazer</option>
                  <option value="in_progress" className="bg-[#1a151f] text-[#f4eff5]">Em Andamento</option>
                  <option value="done" className="bg-[#1a151f] text-[#f4eff5]">Concluído</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              </div>
            </div>

            <div>
              <label htmlFor="task-priority" className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
                Prioridade
              </label>
              <div className="relative flex items-center">
                <Flag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
                <select
                  id="task-priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as TaskPriority })
                  }
                  className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
                >
                  <option value="low" className="bg-[#1a151f] text-[#f4eff5]">Baixa</option>
                  <option value="medium" className="bg-[#1a151f] text-[#f4eff5]">Média</option>
                  <option value="high" className="bg-[#1a151f] text-[#f4eff5]">Alta</option>
                  <option value="urgent" className="bg-[#1a151f] text-[#f4eff5]">Urgente</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="task-due-date" className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
              Data Limite (Prazo de Entrega)
            </label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <input
                id="task-due-date"
                type="date"
                value={formData.dueDate || ""}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value || null })}
                className="w-full min-h-[42px] rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-3.5 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Check-list Section */}
          <div className="space-y-2.5 pt-2 border-t border-[#33293c]/80">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#968a9c] uppercase tracking-wider">
                <ListChecks className="w-3.5 h-3.5 text-[#9873a1]" />
                <span>Check-list da Tarefa</span>
              </label>
              {checklist.length > 0 && (
                <span className="text-[10px] font-semibold text-[#bba0c1] tabular-nums">
                  {completedCount} de {checklist.length} concluídos
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {checklist.length > 0 && (
              <div className="w-full bg-[#120e15] h-1.5 rounded-full overflow-hidden border border-[#33293c]">
                <div
                  className="bg-gradient-to-r from-[#9873a1] to-[#9fc193] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Quick Suggestions */}
            <div className="space-y-1">
              <span className="text-[10px] text-[#6e6375] font-medium block">
                Sugestões rápidas de etapas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((suggestion) => {
                  const alreadyAdded = checklist.some(
                    (item) => item.text.toLowerCase() === suggestion.toLowerCase()
                  );
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddChecklistItem(suggestion)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        alreadyAdded
                          ? "border-[#33293c]/40 text-[#6e6375] opacity-50 cursor-not-allowed"
                          : "border-[#33293c] text-[#968a9c] hover:text-[#f4eff5] hover:border-[#9873a1]/50 hover:bg-[#231c29]"
                      }`}
                    >
                      + {suggestion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input to add custom item */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Digitar nova etapa (ex: Gravar áudio)..."
                className="flex-1 rounded-xl border border-[#33293c] bg-[#120e15] py-2 px-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => handleAddChecklistItem()}
                disabled={!newChecklistText.trim()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#231c29] border border-[#33293c] text-[#bba0c1] hover:text-[#f4eff5] hover:border-[#9873a1]/50 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Checklist Items list */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-colors ${
                      item.completed
                        ? "bg-[#162017]/40 border-[#273829]"
                        : "bg-[#120e15] border-[#33293c] hover:border-[#9873a1]/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className="flex items-center gap-2 flex-1 text-left min-w-0"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#9fc193] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#6e6375] shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          item.completed ? "line-through text-[#6e6375]" : "text-[#f4eff5]"
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="p-1 rounded text-[#6e6375] hover:text-[#d48970] transition-colors shrink-0"
                      title="Remover etapa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações / Notas Adicionais */}
          <div>
            <label htmlFor="task-notes" className="flex items-center gap-1.5 text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-[#9873a1] shrink-0" />
              <span>Observações Adicionais</span>
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções de exportação, proporção de aspecto, ajustes do cliente..."
              className="w-full min-h-[75px] rounded-xl border border-[#33293c] bg-[#120e15] p-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#33293c]">
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
                className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || isDeleting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isEditing ? "Salvar Alterações" : "Criar Tarefa"}</span>
              </button>
            </div>
          </div>
        </form>

        {isEditing && task && (
          <ConfirmModal
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            isLoading={isDeleting}
            title="Excluir Tarefa"
            description={`Tem certeza que deseja excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`}
            confirmLabel="Sim, Excluir"
            onConfirm={async () => {
              setIsDeleting(true);
              const res = await deleteTaskAction(task.id);
              setIsDeleting(false);
              if (res.success) {
                setIsConfirmDeleteOpen(false);
                onSuccess?.();
                onClose();
              } else {
                alert("Erro ao excluir tarefa: " + res.error);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
