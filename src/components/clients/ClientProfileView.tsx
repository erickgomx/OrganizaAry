"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  FileText,
  MessageCircle,
  Pencil,
  Plus,
  Clock,
  MapPin,
  Film,
} from "lucide-react";
import { Client, Event, EventStatus } from "@/types/database";
import { ClientModal } from "./ClientModal";
import { EventModal } from "@/components/events/EventModal";

interface ClientProfileViewProps {
  client: Client;
  events: Event[];
  stats: {
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    eventsCount: number;
  };
}

export function ClientProfileView({ client, events, stats }: ClientProfileViewProps) {
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

  const cleanPhone = client.phone ? client.phone.replace(/\D/g, "") : "";

  const statusConfig: Record<
    EventStatus,
    { label: string; color: string; bg: string; border: string }
  > = {
    budget_lead: {
      label: "Orçamento / Proposta",
      color: "text-[#d4a359]",
      bg: "bg-[#211a12]",
      border: "border-[#382b1d]",
    },
    scheduled: {
      label: "Agendado",
      color: "text-[#94a3b8]",
      bg: "bg-[#161a20]",
      border: "border-[#252c38]",
    },
    captured: {
      label: "Captação Concluída",
      color: "text-[#c8a97e]",
      bg: "bg-[#1c1a18]",
      border: "border-[#332e27]",
    },
    post_production: {
      label: "Pós-Produção",
      color: "text-[#d48970]",
      bg: "bg-[#211714]",
      border: "border-[#3b2520]",
    },
    finished: {
      label: "Finalizado",
      color: "text-[#9fc193]",
      bg: "bg-[#162017]",
      border: "border-[#273829]",
    },
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8e887f] hover:text-[#f6f4ef] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para lista de clientes</span>
        </Link>
      </div>

      {/* Client Header Card */}
      <div className="rounded-2xl border border-[#26231f] bg-[#151412] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1c1a18] border border-[#2e2923] text-[#dfba88] flex items-center justify-center font-medium text-lg shadow-inner shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#f6f4ef] tracking-tight">
                  {client.name}
                </h1>
                <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[#1c1a18] text-[#c8a97e] border border-[#332e27]">
                  Visão 360º
                </span>
              </div>
              <p className="text-xs text-[#8e887f] mt-0.5">
                Cliente desde {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(client.created_at))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {cleanPhone && (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162017] text-[#9fc193] border border-[#273829] hover:bg-[#1e2e20] transition-colors text-xs font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => setIsEditClientOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1917] hover:bg-[#221f1c] text-[#f6f4ef] border border-[#26231f] transition-colors text-xs font-medium"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* Contact details row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#23201c] text-xs">
          <div className="flex items-center gap-2 text-[#9d978d]">
            <Phone className="w-3.5 h-3.5 text-[#736e65] shrink-0" />
            <span>{client.phone || "Telefone não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#9d978d]">
            <Mail className="w-3.5 h-3.5 text-[#736e65] shrink-0" />
            <span>{client.email || "E-mail não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#9d978d]">
            <FileText className="w-3.5 h-3.5 text-[#736e65] shrink-0" />
            <span className="truncate">{client.notes || "Nenhuma nota registrada"}</span>
          </div>
        </div>
      </div>

      {/* 360º Financial & Production Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f] block">
            Faturamento Total
          </span>
          <span className="text-xl font-semibold text-[#f6f4ef] mt-1 block tabular-nums">
            {formatBRL(stats.totalRevenue)}
          </span>
          <span className="text-[10px] text-[#736e65] mt-0.5 block">Histórico acumulado</span>
        </div>

        <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f] block">
            Recebido / Concluído
          </span>
          <span className="text-xl font-semibold text-[#9fc193] mt-1 block tabular-nums">
            {formatBRL(stats.completedRevenue)}
          </span>
          <span className="text-[10px] text-[#736e65] mt-0.5 block">Eventos finalizados</span>
        </div>

        <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f] block">
            Em Aberto / Pipeline
          </span>
          <span className="text-xl font-semibold text-[#dfba88] mt-1 block tabular-nums">
            {formatBRL(stats.pendingRevenue)}
          </span>
          <span className="text-[10px] text-[#736e65] mt-0.5 block">Captações pendentes</span>
        </div>

        <div className="rounded-xl border border-[#26231f] bg-[#151412] p-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#8e887f] block">
            Total de Captações
          </span>
          <span className="text-xl font-semibold text-[#f6f4ef] mt-1 block tabular-nums">
            {stats.eventsCount}
          </span>
          <span className="text-[10px] text-[#736e65] mt-0.5 block">Eventos vinculados</span>
        </div>
      </div>

      {/* Events History Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f6f4ef] tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#c8a97e]" />
              Histórico de Captações & Projetos
            </h2>
            <p className="text-xs text-[#8e887f]">
              Todos os trabalhos registrados para este cliente com status e valores.
            </p>
          </div>

          <button
            onClick={() => setIsNewEventOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Captação</span>
          </button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-10 text-center space-y-2">
            <Film className="w-6 h-6 text-[#736e65] mx-auto" />
            <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">Nenhum evento registrado ainda.</p>
            <p className="text-xs text-[#736e65] max-w-xs mx-auto">
              Clique em &quot;Nova Captação&quot; para registrar um ensaio, casamento ou cobertura para este cliente.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.map((ev) => {
              const status = statusConfig[ev.status];
              return (
                <div
                  key={ev.id}
                  className="rounded-xl border border-[#26231f] bg-[#151412] p-4 hover:border-[#38332c] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-[#f6f4ef] text-xs sm:text-sm">{ev.title}</h3>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-[#8e887f] flex-wrap">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3 text-[#736e65]" />
                        {formatDate(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#736e65]" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#23201c]">
                    <span className="text-xs sm:text-sm font-semibold text-[#dfba88] tabular-nums sm:text-right">
                      {formatBRL(Number(ev.price))}
                    </span>
                    <Link
                      href="/events"
                      className="text-xs text-[#c8a97e] hover:text-[#dfba88] font-medium"
                    >
                      Ver no Pipeline &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      <ClientModal
        isOpen={isEditClientOpen}
        onClose={() => setIsEditClientOpen(false)}
        client={client}
        onSuccess={() => window.location.reload()}
      />

      {/* New Event Modal for this client */}
      <EventModal
        isOpen={isNewEventOpen}
        onClose={() => setIsNewEventOpen(false)}
        defaultClientId={client.id}
        clients={[{ id: client.id, name: client.name }]}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
