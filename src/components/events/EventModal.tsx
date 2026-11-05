"use client";

import { useState } from "react";
import { X, Loader2, Calendar, MapPin, DollarSign, User, FileText, CheckCircle, Trash2, ChevronDown } from "lucide-react";
import { createEventAction, updateEventAction, deleteEventAction, EventInput, EventWithClientInfo } from "@/actions/events";
import { EventStatus } from "@/types/database";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface SimpleClientOption {
  id: string;
  name: string;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: EventWithClientInfo | null;
  clients: SimpleClientOption[];
  defaultClientId?: string;
  onSuccess?: () => void;
}

export function EventModal({
  isOpen,
  onClose,
  event,
  clients,
  defaultClientId,
  onSuccess,
}: EventModalProps) {
  const isEditing = Boolean(event);

  const getInitialDateTime = () => {
    if (event?.date) {
      const d = new Date(event.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T14:00`;
  };

  const [formData, setFormData] = useState<EventInput>({
    title: event?.title || "",
    clientId: event?.client_id || defaultClientId || (clients[0]?.id || ""),
    date: getInitialDateTime(),
    location: event?.location || "",
    status: event?.status || "budget_lead",
    price: event?.price !== undefined ? Number(event.price) : 1500,
    notes: event?.notes || "",
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
      if (isEditing && event) {
        const res = await updateEventAction(event.id, formData);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createEventAction(formData);
        if (res.error) throw new Error(res.error);
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar evento.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#9873a1]" />
            {isEditing ? "Editar Detalhes da Captação" : "Nova Captação / Evento"}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Cliente Vinculado *
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-9 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              >
                {clients.length === 0 ? (
                  <option value="" className="bg-[#1a151f] text-[#f4eff5]">Nenhum cliente cadastrado ainda</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#1a151f] text-[#f4eff5]">
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Título da Captação / Projeto *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ensaio Gestante, Casamento Itally & Erick"
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 px-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
                Data e Horário *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 px-3 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
                Valor Cobrado (R$)
              </label>
              <div className="relative flex items-center">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price !== undefined ? formData.price : ""}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-3 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors tabular-nums"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Localização / Set
            </label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <input
                type="text"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Praia da Joaquina, Estúdio Central"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Fase da Máquina de Estados (Status)
            </label>
            <div className="relative flex items-center">
              <CheckCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                className="w-full appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-9 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              >
                <option value="budget_lead" className="bg-[#1a151f] text-[#f4eff5]">1. Orçamento / Proposta</option>
                <option value="scheduled" className="bg-[#1a151f] text-[#f4eff5]">2. Agendado (Fechado)</option>
                <option value="captured" className="bg-[#1a151f] text-[#f4eff5]">3. Captação Concluída</option>
                <option value="post_production" className="bg-[#1a151f] text-[#f4eff5]">4. Pós-Produção</option>
                <option value="finished" className="bg-[#1a151f] text-[#f4eff5]">5. Finalizado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5 text-[#9873a1] shrink-0" />
              <span>Briefing / Observações</span>
            </label>
            <textarea
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalhes de iluminação, lentes necessárias, estilo de cor..."
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] p-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#33293c]">
            {isEditing && event ? (
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
                <span>{isEditing ? "Atualizar Evento" : "Criar Evento"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation */}
        {event && (
          <ConfirmModal
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            isLoading={isDeleting}
            title="Remover Captação"
            description={`Tem certeza que deseja excluir "${event.title}"? Todas as tarefas vinculadas também serão removidas.`}
            confirmLabel="Sim, Remover"
            onConfirm={async () => {
              setIsDeleting(true);
              const res = await deleteEventAction(event.id);
              setIsDeleting(false);
              if (res.success) {
                setIsConfirmDeleteOpen(false);
                onSuccess?.();
                onClose();
              } else {
                setError(res.error || "Erro ao excluir evento.");
                setIsConfirmDeleteOpen(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
