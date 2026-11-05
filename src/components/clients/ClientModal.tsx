"use client";

import { useState } from "react";
import { X, Loader2, User, Phone, Mail, FileText, Trash2 } from "lucide-react";
import { createClientAction, updateClientAction, deleteClientAction, ClientInput } from "@/actions/clients";
import { Client } from "@/types/database";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="w-full max-w-md rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <User className="w-4 h-4 text-[#9873a1]" />
            {isEditing ? "Editar Perfil do Cliente" : "Novo Cliente"}
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
              Nome Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#6e6375]" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Itally Ariane"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Telefone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#6e6375]" />
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: (11) 98765-4321"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#6e6375]" />
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: cliente@email.com"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1">
              Observações & Briefing
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#6e6375]" />
              <textarea
                rows={3}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Preferências de ensaio, indicações ou restrições..."
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#33293c]">
            {isEditing && client ? (
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
                <span>{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation */}
        {client && (
          <ConfirmModal
            isOpen={isConfirmDeleteOpen}
            onClose={() => setIsConfirmDeleteOpen(false)}
            isLoading={isDeleting}
            title="Remover Cliente"
            description={`Tem certeza que deseja remover o cliente "${client.name}"? Todas as captações e tarefas vinculadas serão excluídas.`}
            confirmLabel="Sim, Remover"
            onConfirm={async () => {
              setIsDeleting(true);
              const res = await deleteClientAction(client.id);
              setIsDeleting(false);
              if (res.success) {
                setIsConfirmDeleteOpen(false);
                onSuccess?.();
                onClose();
              } else {
                setError(res.error || "Erro ao excluir cliente.");
                setIsConfirmDeleteOpen(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
