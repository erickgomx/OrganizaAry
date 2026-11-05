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
  CheckCircle2,
  AlertCircle,
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
      label: "Orçamento / Lead",
      color: "text-amber-400",
      bg: "bg-amber-950/40",
      border: "border-amber-800/40",
    },
    scheduled: {
      label: "Agendado",
      color: "text-blue-400",
      bg: "bg-blue-950/40",
      border: "border-blue-800/40",
    },
    captured: {
      label: "Captação Concluída",
      color: "text-purple-400",
      bg: "bg-purple-950/40",
      border: "border-purple-800/40",
    },
    post_production: {
      label: "Pós-Produção",
      color: "text-orange-400",
      bg: "bg-orange-950/40",
      border: "border-orange-800/40",
    },
    finished: {
      label: "Finalizado",
      color: "text-emerald-400",
      bg: "bg-emerald-950/40",
      border: "border-emerald-800/40",
    },
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para lista de clientes</span>
        </Link>
      </div>

      {/* Client Header Card */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-sm shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-800/50 text-purple-300 flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {client.name}
                </h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                  Visão 360º
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors text-xs font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => setIsEditClientOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors text-xs font-semibold"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          </div>
        </div>

        {/* Contact details row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-neutral-800/80 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>{client.phone || "Telefone não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>{client.email || "E-mail não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-300">
            <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="truncate">{client.notes || "Nenhuma nota registrada"}</span>
          </div>
        </div>
      </div>

      {/* 360º Financial & Production Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
            Faturamento Total
          </span>
          <span className="text-xl font-bold text-white mt-1 block">
            {formatBRL(stats.totalRevenue)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Histórico acumulado</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
            Recebido / Concluído
          </span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {formatBRL(stats.completedRevenue)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Eventos finalizados</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
            Em Aberto / Pipeline
          </span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">
            {formatBRL(stats.pendingRevenue)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Captações pendentes</span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <span className="text-[10px] font-semibold uppercase text-neutral-500 block">
            Total de Captações
          </span>
          <span className="text-xl font-bold text-purple-400 mt-1 block">
            {stats.eventsCount}
          </span>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Eventos vinculados</span>
        </div>
      </div>

      {/* Events History Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Histórico de Captações & Projetos
            </h2>
            <p className="text-xs text-neutral-400">
              Todos os trabalhos registrados para este cliente com status e valores.
            </p>
          </div>

          <button
            onClick={() => setIsNewEventOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Captação</span>
          </button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-10 text-center space-y-3">
            <Film className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-medium text-neutral-300">Nenhum evento registrado ainda.</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Clique em &quot;Nova Captação&quot; para registrar um ensaio, casamento ou cobertura para este cliente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const status = statusConfig[ev.status];
              return (
                <div
                  key={ev.id}
                  className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-4 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm">{ev.title}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        {formatDate(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
                    <span className="text-sm font-bold text-white sm:text-right">
                      {formatBRL(Number(ev.price))}
                    </span>
                    <Link
                      href="/events"
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Ver no Pipeline →
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
