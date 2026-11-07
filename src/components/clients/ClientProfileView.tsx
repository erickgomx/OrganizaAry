"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  FileText,
  MessageCircle,
  Pencil,
  Trash2,
  Plus,
  Clock,
  MapPin,
  Film,
} from "lucide-react";
import { Client, Event, EventStatus } from "@/types/database";
import { deleteClientAction } from "@/actions/clients";
import { deleteEventAction } from "@/actions/events";

const ClientModal = dynamic(
  () => import("./ClientModal").then((m) => m.ClientModal),
  { ssr: false }
);
const EventModal = dynamic(
  () => import("@/components/events/EventModal").then((m) => m.EventModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((m) => m.ConfirmModal),
  { ssr: false }
);

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

export function ClientProfileView({ client, events: initialEvents, stats }: ClientProfileViewProps) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(initialEvents);

  // Sincroniza eventos do cliente sempre que houver revalidação no servidor
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [isDeleteClientModalOpen, setIsDeleteClientModalOpen] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

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
      color: "text-[#9873a1]",
      bg: "bg-[#231c29]",
      border: "border-[#33293c]",
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#968a9c] hover:text-[#f4eff5] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para lista de clientes</span>
        </Link>
      </div>

      {/* Client Header Card */}
      <div className="rounded-2xl border border-[#33293c] bg-[#120e15] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#231c29] border border-[#33293c] text-[#bba0c1] flex items-center justify-center font-medium text-lg shadow-inner shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#f4eff5] tracking-tight">
                  {client.name}
                </h1>
                <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[#231c29] text-[#9873a1] border border-[#33293c]">
                  Visão 360º
                </span>
              </div>
              <p className="text-xs text-[#968a9c] mt-0.5">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a151f] hover:bg-[#231c29] text-[#f4eff5] border border-[#33293c] transition-colors text-xs font-medium"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              onClick={() => setIsDeleteClientModalOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#211615] hover:bg-[#2b1b1a] text-[#d48970] border border-[#3d2320] transition-colors text-xs font-medium"
              title="Remover cliente"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          </div>
        </div>

        {/* Contact details row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#33293c] text-xs">
          <div className="flex items-center gap-2 text-[#968a9c]">
            <Phone className="w-3.5 h-3.5 text-[#6e6375] shrink-0" />
            <span>{client.phone || "Telefone não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#968a9c]">
            <Mail className="w-3.5 h-3.5 text-[#6e6375] shrink-0" />
            <span>{client.email || "E-mail não informado"}</span>
          </div>
          <div className="flex items-center gap-2 text-[#968a9c]">
            <FileText className="w-3.5 h-3.5 text-[#6e6375] shrink-0" />
            <span className="truncate">{client.notes || "Nenhuma nota registrada"}</span>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro Discreto */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 rounded-xl bg-[#120e15] border border-[#33293c] text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] text-[#6e6375] uppercase font-medium block">Total de Ensaios</span>
            <span className="text-sm font-semibold text-[#f4eff5] tabular-nums">{stats.eventsCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6e6375] uppercase font-medium block">Total Faturado</span>
            <span className="text-sm font-semibold text-[#bba0c1] tabular-nums">{formatBRL(stats.totalRevenue)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#6e6375] uppercase font-medium block">Recebido</span>
            <span className="text-sm font-semibold text-[#9fc193] tabular-nums">{formatBRL(stats.completedRevenue)}</span>
          </div>
          {stats.pendingRevenue > 0 && (
            <div>
              <span className="text-[10px] text-[#6e6375] uppercase font-medium block">A Receber</span>
              <span className="text-sm font-semibold text-[#d4a359] tabular-nums">{formatBRL(stats.pendingRevenue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Events History Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f4eff5] tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#9873a1]" />
              Histórico de Captações & Projetos
            </h2>
            <p className="text-xs text-[#968a9c]">
              Todos os trabalhos registrados para este cliente com status e valores.
            </p>
          </div>

          <button
            onClick={() => setIsNewEventOpen(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Captação</span>
          </button>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#120e15]/40 p-10 text-center space-y-2">
            <Film className="w-6 h-6 text-[#6e6375] mx-auto" />
            <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">Nenhum evento registrado ainda.</p>
            <p className="text-xs text-[#6e6375] max-w-xs mx-auto">
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
                  className="rounded-xl border border-[#33293c] bg-[#120e15] p-4 hover:border-[#33293c] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-[#f4eff5] text-xs sm:text-sm">{ev.title}</h3>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-[#968a9c] flex-wrap">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3 text-[#6e6375]" />
                        {formatDate(ev.date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#6e6375]" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#33293c]">
                    <span className="text-xs sm:text-sm font-semibold text-[#bba0c1] tabular-nums sm:text-right">
                      {formatBRL(Number(ev.price))}
                    </span>
                    <Link
                      href="/events"
                      className="text-xs text-[#9873a1] hover:text-[#bba0c1] font-medium"
                    >
                      Ver no Pipeline &rarr;
                    </Link>
                    <button
                      onClick={() => setDeletingEvent({ id: ev.id, title: ev.title })}
                      type="button"
                      className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#d48970] hover:bg-[#211615] transition-colors"
                      title="Remover captação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      {isEditClientOpen && (
        <ClientModal
          isOpen={isEditClientOpen}
          onClose={() => setIsEditClientOpen(false)}
          client={client}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* New Event Modal for this client */}
      {isNewEventOpen && (
        <EventModal
          isOpen={isNewEventOpen}
          onClose={() => setIsNewEventOpen(false)}
          defaultClientId={client.id}
          clients={[{ id: client.id, name: client.name }]}
          onSuccess={(savedEvent) => {
            if (savedEvent) {
              setEvents((prev) => {
                const exists = prev.some((e) => e.id === savedEvent.id);
                if (exists) {
                  return prev.map((e) => (e.id === savedEvent.id ? savedEvent : e));
                }
                return [savedEvent, ...prev];
              });
            }
            router.refresh();
          }}
        />
      )}

      {/* Confirm Delete Client Modal */}
      {isDeleteClientModalOpen && (
        <ConfirmModal
          isOpen={isDeleteClientModalOpen}
          onClose={() => setIsDeleteClientModalOpen(false)}
          isLoading={isDeletingClient}
          title="Remover Cliente"
          description={`Tem certeza que deseja remover o cliente "${client.name}"? Todas as captações, reuniões e tarefas vinculadas a ele também serão excluídas.`}
          confirmLabel="Sim, Remover Cliente"
          onConfirm={async () => {
            setIsDeletingClient(true);
            const res = await deleteClientAction(client.id);
            setIsDeletingClient(false);
            if (res.success) {
              router.push("/clients");
            } else {
              alert("Erro ao excluir cliente: " + res.error);
            }
          }}
        />
      )}

      {/* Confirm Delete Event Modal */}
      {deletingEvent && (
        <ConfirmModal
          isOpen={!!deletingEvent}
          onClose={() => setDeletingEvent(null)}
          isLoading={isDeletingEvent}
          title="Remover Captação"
          description={`Tem certeza que deseja remover "${deletingEvent?.title}"? As tarefas vinculadas a este projeto também serão excluídas.`}
          confirmLabel="Sim, Remover"
          onConfirm={async () => {
            if (!deletingEvent) return;
            setIsDeletingEvent(true);
            const res = await deleteEventAction(deletingEvent.id);
            setIsDeletingEvent(false);
            if (res.success) {
              setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
              setDeletingEvent(null);
            } else {
              alert("Erro ao excluir captação: " + res.error);
            }
          }}
        />
      )}
    </div>
  );
}
