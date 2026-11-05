"use client";

import { useState } from "react";
import { X, Loader2, Calendar, MapPin, DollarSign, User, FileText, CheckCircle } from "lucide-react";
import { createEventAction, updateEventAction, EventInput, EventWithClientInfo } from "@/actions/events";
import { EventStatus } from "@/types/database";

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
      <div className="w-full max-w-lg rounded-2xl border border-[#2d2822] bg-[#161513] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#23201c] pb-3">
          <h3 className="text-sm font-semibold text-[#f6f4ef] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#c8a97e]" />
            {isEditing ? "Editar Detalhes da Captação" : "Nova Captação / Evento"}
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
              Cliente Vinculado *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              >
                {clients.length === 0 ? (
                  <option value="">Nenhum cliente cadastrado ainda</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Título da Captação / Projeto *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ensaio Gestante, Casamento Itally & Erick"
              className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 px-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
                Data e Horário *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 px-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
                Valor Cobrado (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price !== undefined ? formData.price : ""}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors tabular-nums"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Localização / Set
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <input
                type="text"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Praia da Joaquina, Estúdio Central"
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Fase da Máquina de Estados (Status)
            </label>
            <div className="relative">
              <CheckCircle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              >
                <option value="budget_lead">1. Orçamento / Lead</option>
                <option value="scheduled">2. Agendado (Fechado)</option>
                <option value="captured">3. Captação Concluída</option>
                <option value="post_production">4. Pós-Produção</option>
                <option value="finished">5. Finalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Briefing / Observações
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalhes de iluminação, lentes necessárias, estilo de cor..."
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23201c]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-[#26231f] bg-[#181715] text-[#8e887f] hover:text-[#f6f4ef] text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? "Atualizar Evento" : "Criar Evento"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
