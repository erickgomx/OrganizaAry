"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MoreVertical,
  ChevronRight,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { ClientWithStats, deleteClientAction } from "@/actions/clients";
import { ClientModal } from "./ClientModal";

interface ClientsListProps {
  initialClients: ClientWithStats[];
}

export function ClientsList({ initialClients }: ClientsListProps) {
  const [clients, setClients] = useState<ClientWithStats[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const getCleanPhone = (phone?: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o cliente "${name}"? Todos os eventos atrelados serão apagados.`)) {
      const res = await deleteClientAction(id);
      if (res.success) {
        setClients((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert("Erro ao excluir cliente: " + res.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar: Search & New Client */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full rounded-xl border border-[#26231f] bg-[#151412] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
          />
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-12 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#1b1917] border border-[#2d2822] flex items-center justify-center text-[#8e887f]">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">
            {searchTerm ? "Nenhum cliente encontrado para a busca." : "Nenhum cliente cadastrado ainda."}
          </p>
          <p className="text-xs text-[#736e65] max-w-xs mx-auto">
            Cadastre seus clientes para gerenciar ensaios, eventos e faturamento 360º.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClients.map((client) => {
            const cleanPhone = getCleanPhone(client.phone);
            return (
              <div
                key={client.id}
                className="group relative rounded-2xl border border-[#26231f] bg-[#151412] hover:border-[#38332c] hover:bg-[#181715] transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header: Avatar, Name & Options */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1c1a18] border border-[#2e2923] text-[#dfba88] flex items-center justify-center font-medium text-xs shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-sm text-[#f6f4ef] hover:text-[#dfba88] transition-colors flex items-center gap-1"
                      >
                        {client.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#c8a97e]" />
                      </Link>
                      <p className="text-[11px] text-[#8e887f] truncate max-w-[170px]">
                        {client.email || "Sem e-mail cadastrado"}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === client.id ? null : client.id)
                      }
                      className="p-1.5 rounded-lg text-[#736e65] hover:text-[#f6f4ef] hover:bg-[#1c1a18] transition-colors"
                      type="button"
                      title="Opções"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuId === client.id && (
                      <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-[#2d2822] bg-[#181715] p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setIsModalOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#9d978d] hover:bg-[#221f1c] hover:text-[#f6f4ef] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDelete(client.id, client.name);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[#d48970] hover:bg-[#261714] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics: Events & Total Revenue */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-[#181715] border border-[#23201c] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-[#736e65] block">
                      Captações
                    </span>
                    <span className="text-[#f6f4ef] font-medium flex items-center gap-1.5 mt-0.5 tabular-nums">
                      <Calendar className="w-3 h-3 text-[#c8a97e]" />
                      {client.eventsCount} evento{client.eventsCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-medium text-[#736e65] block">
                      Total Faturado
                    </span>
                    <span className="text-[#dfba88] font-medium flex items-center gap-1 mt-0.5 tabular-nums">
                      <DollarSign className="w-3 h-3 text-[#c8a97e]" />
                      {formatBRL(client.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Quick Contact & Profile Action */}
                <div className="flex items-center justify-between pt-1 border-t border-[#23201c]">
                  <div className="flex items-center gap-1.5">
                    {cleanPhone && (
                      <>
                        <a
                          href={`https://wa.me/55${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-[#162017] text-[#9fc193] border border-[#273829] hover:bg-[#1e2e20] transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-1.5 rounded-lg bg-[#1a1917] text-[#9d978d] border border-[#26231f] hover:text-[#f6f4ef] transition-colors"
                          title="Ligar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="p-1.5 rounded-lg bg-[#1a1917] text-[#9d978d] border border-[#26231f] hover:text-[#f6f4ef] transition-colors"
                        title="Enviar E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#c8a97e] hover:text-[#dfba88] transition-colors px-2 py-1 rounded-lg hover:bg-[#1c1a18]"
                  >
                    <span>Visão 360º</span>
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
    </div>
  );
}
