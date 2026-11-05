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
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-neutral-300">
            {searchTerm ? "Nenhum cliente encontrado para a busca." : "Nenhum cliente cadastrado ainda."}
          </p>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            Cadastre seus clientes para gerenciar ensaios, eventos e faturamento 360º.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const cleanPhone = getCleanPhone(client.phone);
            return (
              <div
                key={client.id}
                className="group relative rounded-2xl border border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header: Avatar, Name & Options */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-bold text-white text-sm hover:text-purple-400 transition-colors flex items-center gap-1"
                      >
                        {client.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">
                        {client.email || "Sem e-mail cadastrado"}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === client.id ? null : client.id)
                      }
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      type="button"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === client.id && (
                      <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setIsModalOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveMenuId(null);
                            handleDelete(client.id, client.name);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics: Events & Total Revenue */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-neutral-950/50 border border-neutral-800/50 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                      Captações
                    </span>
                    <span className="text-neutral-200 font-semibold flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {client.eventsCount} evento{client.eventsCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                      Total Faturado
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatBRL(client.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Quick Contact & Profile Action */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/50">
                  <div className="flex items-center gap-1.5">
                    {cleanPhone && (
                      <>
                        <a
                          href={`https://wa.me/55${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50 transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${cleanPhone}`}
                          className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                          title="Ligar"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="p-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                        title="Enviar E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-purple-950/30"
                  >
                    <span>Visão 360º</span>
                    <ChevronRight className="w-3.5 h-3.5" />
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
