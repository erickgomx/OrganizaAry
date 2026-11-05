"use client";

import { useState } from "react";
import { X, Loader2, User, Phone, Mail, FileText } from "lucide-react";
import { createClientAction, updateClientAction, ClientInput } from "@/actions/clients";
import { Client } from "@/types/database";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  onSuccess?: () => void;
}

export function ClientModal({ isOpen, onClose, client, onSuccess }: ClientModalProps) {
  const isEditing = Boolean(client);

  const [formData, setFormData] = useState<ClientInput>({
    name: client?.name || "",
    phone: client?.phone || "",
    email: client?.email || "",
    notes: client?.notes || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && client) {
        const res = await updateClientAction(client.id, formData);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await createClientAction(formData);
        if (res.error) throw new Error(res.error);
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar cliente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#2d2822] bg-[#161513] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#23201c] pb-3">
          <h3 className="text-sm font-semibold text-[#f6f4ef] flex items-center gap-2">
            <User className="w-4 h-4 text-[#c8a97e]" />
            {isEditing ? "Editar Perfil do Cliente" : "Novo Cliente"}
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
              Nome Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Itally Ariane"
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: (11) 98765-4321"
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: cliente@email.com"
                className="w-full rounded-xl border border-[#26231f] bg-[#121110] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#8e887f] uppercase tracking-wider mb-1">
              Observações & Briefing
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
              <textarea
                rows={3}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Preferências de ensaio, indicações ou restrições..."
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
              <span>{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
