"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  MoreVertical,
  ChevronRight,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { ClientWithStats, deleteClientAction } from "@/actions/clients";
import { ClientModal } from "./ClientModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface ClientsListProps {
  initialClients: ClientWithStats[];
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingClient, setDeletingClient] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  });

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    const res = await deleteClientAction(deletingClient.id);
    setIsDeleting(false);
    if (res.success) {
      setClients((prev) => prev.filter((c) => c.id !== deletingClient.id));
      setDeletingClient(null);
    } else {
      alert("Erro ao excluir cliente: " + res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & New Client Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente por nome ou telefone..."
            className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10.5 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
          />
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#120e15]/40 p-12 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#968a9c]">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">
            {searchTerm ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </p>
          <button
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="text-xs text-[#9873a1] hover:underline font-medium"
          >
            + Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClients.map((client) => {
            const cleanPhone = getCleanPhone(client.phone);
            return (
              <div
                key={client.id}
                className="group relative rounded-2xl border border-[#33293c] bg-[#120e15] hover:border-[#33293c] hover:bg-[#1a151f] transition-all p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-sm"
              >
                {/* Header: Avatar, Name & Options */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#231c29] border border-[#33293c] text-[#bba0c1] flex items-center justify-center font-medium text-sm shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-sm text-[#f4eff5] hover:text-[#bba0c1] transition-colors flex items-center gap-1"
                      >
                        {client.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#9873a1]" />
                      </Link>
                      <p className="text-[11px] text-[#968a9c] truncate max-w-[170px]">
                        {client.phone || client.email || "Sem telefone informado"}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === client.id ? null : client.id)
                      }
                      className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
                      type="button"
                      title="Opções"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuId === client.id && (
                      <div className="absolute right-0 top-8 z-20 w-32 rounded-xl border border-[#33293c] bg-[#1a151f] p-1 shadow-xl text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setEditingClient(client);
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
                            setDeletingClient({ id: client.id, name: client.name });
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

                {/* Bottom Row: WhatsApp in 1 touch & Link to Details */}
                <div className="flex items-center justify-between pt-2 border-t border-[#33293c]">
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162017] text-[#9fc193] border border-[#273829] hover:bg-[#1e2e20] transition-colors text-xs font-medium"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#6e6375]">
                      Sem WhatsApp
                    </span>
                  )}

                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#9873a1] hover:text-[#bba0c1] transition-colors px-2 py-1 rounded-lg hover:bg-[#231c29]"
                  >
                    <span>{client.eventsCount} {client.eventsCount === 1 ? "ensaio" : "ensaios"}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Remover Cliente"
        description={`Tem certeza que deseja remover o cliente "${deletingClient?.name}"? Todas as captações, reuniões e tarefas vinculadas a este cliente também serão permanentemente excluídas.`}
        confirmLabel="Sim, Remover"
      />
    </div>
  );
}
