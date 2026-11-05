"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  DollarSign,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  Video,
  FolderOpen,
  CalendarCheck2,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  EventWithClientInfo,
  updateEventStatusAction,
  deleteEventAction,
} from "@/actions/events";
import { completeAllTasksForEventAction } from "@/actions/tasks";
import {
  syncCalendarAction,
  generateMeetAction,
  createDriveFoldersAction,
} from "@/actions/google";
import { EventStatus } from "@/types/database";
import { EventModal } from "./EventModal";

interface EventsViewProps {
  initialEvents: EventWithClientInfo[];
  clients: { id: string; name: string }[];
}

export function EventsView({ initialEvents, clients }: EventsViewProps) {
  const [events, setEvents] = useState<EventWithClientInfo[]>(initialEvents);
  const [activeTab, setActiveTab] = useState<EventStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithClientInfo | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadingGoogleAction, setLoadingGoogleAction] = useState<{
    eventId: string;
    type: "meet" | "drive" | "calendar";
  } | null>(null);

  const statusMachine: {
    key: EventStatus;
    label: string;
    step: number;
    color: string;
    bg: string;
    border: string;
  }[] = [
    {
      key: "budget_lead",
      label: "Orçamento / Lead",
      step: 1,
      color: "text-amber-400",
      bg: "bg-amber-950/40",
      border: "border-amber-800/40",
    },
    {
      key: "scheduled",
      label: "Agendado",
      step: 2,
      color: "text-blue-400",
      bg: "bg-blue-950/40",
      border: "border-blue-800/40",
    },
    {
      key: "captured",
      label: "Captação Concluída",
      step: 3,
      color: "text-purple-400",
      bg: "bg-purple-950/40",
      border: "border-purple-800/40",
    },
    {
      key: "post_production",
      label: "Pós-Produção",
      step: 4,
      color: "text-orange-400",
      bg: "bg-orange-950/40",
      border: "border-orange-800/40",
    },
    {
      key: "finished",
      label: "Finalizado",
      step: 5,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40",
      border: "border-emerald-800/40",
    },
  ];

  const getStatusObj = (statusKey: EventStatus) => {
    return statusMachine.find((s) => s.key === statusKey) || statusMachine[0];
  };

  const getNextStatus = (current: EventStatus): EventStatus | null => {
    const currentIndex = statusMachine.findIndex((s) => s.key === current);
    if (currentIndex >= 0 && currentIndex < statusMachine.length - 1) {
      return statusMachine[currentIndex + 1].key;
    }
    return null;
  };

  const handleStatusChange = async (id: string, newStatus: EventStatus) => {
    try {
      setUpdatingId(id);
      const res = await updateEventStatusAction(id, newStatus);
      if (res.data) {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === id ? { ...ev, status: newStatus } : ev))
        );

        // Gatilho 1: Ao confirmar fechamento ('scheduled' / Agendado)
        // Oferece gerar estrutura de pastas no Drive e sincronizar no Calendar
        if (newStatus === "scheduled") {
          const syncConfirm = confirm(
            "Captação agendada com sucesso! Deseja sincronizar com o Google Calendar e criar as pastas [RAWs] e [Entregas] no Google Drive agora?"
          );
          if (syncConfirm) {
            handleDriveAction(id);
            handleCalendarSync(id);
          }
        }

        // Gatilho 2: Ao marcar evento como Finalizado, prompt para baixar tarefas
        if (newStatus === "finished") {
          const autoFinishTasks = confirm(
            "Captação finalizada! Deseja marcar e baixar automaticamente todas as tarefas de pós-produção vinculadas a este evento no Kanban como 'Concluídas'?"
          );
          if (autoFinishTasks) {
            await completeAllTasksForEventAction(id);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Google Meet Trigger
  const handleMeetAction = async (ev: EventWithClientInfo) => {
    if (ev.meet_link) {
      window.open(ev.meet_link, "_blank");
      return;
    }

    try {
      setLoadingGoogleAction({ eventId: ev.id, type: "meet" });
      const res = await generateMeetAction(ev.id);
      if (!res.success) {
        alert(res.error);
        return;
      }

      setEvents((prev) =>
        prev.map((item) =>
          item.id === ev.id ? { ...item, meet_link: res.meetLink } : item
        )
      );
      const openNow = confirm(
        `Link do Google Meet gerado com sucesso!\n${res.meetLink}\n\nDeseja abrir a sala agora?`
      );
      if (openNow) {
        window.open(res.meetLink, "_blank");
      }
    } catch (err) {
      console.error("Erro ao gerar Meet:", err);
    } finally {
      setLoadingGoogleAction(null);
    }
  };

  // Google Drive Folders Trigger
  const handleDriveAction = async (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (ev?.drive_folder_url) {
      window.open(ev.drive_folder_url, "_blank");
      return;
    }

    try {
      setLoadingGoogleAction({ eventId, type: "drive" });
      const res = await createDriveFoldersAction(eventId);
      if (!res.success) {
        alert(res.error);
        return;
      }

      setEvents((prev) =>
        prev.map((item) =>
          item.id === eventId
            ? {
                ...item,
                drive_folder_url: res.folderUrl,
                drive_folder_id: res.folderId,
              }
            : item
        )
      );

      const openDrive = confirm(
        `Estrutura de pastas gerada no Google Drive!\n[Ano/Mês] - [Cliente] - [Evento] / RAWs e / Entregas.\n\nDeseja abrir a pasta no Google Drive?`
      );
      if (openDrive) {
        window.open(res.folderUrl, "_blank");
      }
    } catch (err) {
      console.error("Erro ao criar pastas no Drive:", err);
    } finally {
      setLoadingGoogleAction(null);
    }
  };

  // Google Calendar Sync Trigger
  const handleCalendarSync = async (eventId: string) => {
    try {
      setLoadingGoogleAction({ eventId, type: "calendar" });
      const res = await syncCalendarAction(eventId);
      if (!res.success) {
        alert(res.error);
        return;
      }

      alert("Evento sincronizado com sucesso na sua agenda do Google Calendar!");
      if (res.googleEventId) {
        setEvents((prev) =>
          prev.map((item) =>
            item.id === eventId
              ? { ...item, google_event_id: res.googleEventId }
              : item
          )
        );
      }
      if (res.htmlLink) {
        window.open(res.htmlLink, "_blank");
      }
    } catch (err) {
      console.error("Erro ao sincronizar Calendar:", err);
    } finally {
      setLoadingGoogleAction(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Deseja excluir a captação "${title}"?`)) {
      const res = await deleteEventAction(id);
      if (res.success) {
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
      } else {
        alert("Erro ao excluir: " + res.error);
      }
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesTab = activeTab === "all" || ev.status === activeTab;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(term) ||
      ev.client?.name?.toLowerCase().includes(term) ||
      (ev.location && ev.location.toLowerCase().includes(term));
    return matchesTab && matchesSearch;
  });

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

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por evento, cliente ou local..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            setEditingEvent(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Captação</span>
        </button>
      </div>

      {/* Status Machine Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "all"
              ? "bg-neutral-800 text-white shadow-sm"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
          }`}
        >
          Todas ({events.length})
        </button>

        {statusMachine.map((sm) => {
          const count = events.filter((ev) => ev.status === sm.key).length;
          const isActive = activeTab === sm.key;
          return (
            <button
              key={sm.key}
              onClick={() => setActiveTab(sm.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? `${sm.bg} ${sm.color} border ${sm.border}`
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              <span>{sm.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? "bg-black/30" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Event Cards Grid */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center space-y-3">
          <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
          <p className="text-sm font-medium text-neutral-300">Nenhuma captação nesta etapa.</p>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            Crie novos eventos ou altere os filtros de status acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const status = getStatusObj(ev.status);
            const nextStatus = getNextStatus(ev.status);
            const nextStatusObj = nextStatus ? getStatusObj(nextStatus) : null;
            const isUpdating = updatingId === ev.id;

            const isMeetLoading =
              loadingGoogleAction?.eventId === ev.id &&
              loadingGoogleAction.type === "meet";
            const isDriveLoading =
              loadingGoogleAction?.eventId === ev.id &&
              loadingGoogleAction.type === "drive";
            const isCalendarLoading =
              loadingGoogleAction?.eventId === ev.id &&
              loadingGoogleAction.type === "calendar";

            return (
              <div
                key={ev.id}
                className="group relative rounded-2xl border border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900/90 hover:border-neutral-700 transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header: Title, Client & Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.step}. {status.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base leading-snug pt-0.5">
                      {ev.title}
                    </h3>

                    {ev.client && (
                      <Link
                        href={`/clients/${ev.client.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{ev.client.name}</span>
                      </Link>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === ev.id ? null : ev.id)
                      }
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                      type="button"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === ev.id && (
                      <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setEditingEvent(ev);
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
                            handleDelete(ev.id, ev.title);
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

                {/* Event Details: Date, Location, Value */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span>{formatDate(ev.date)}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-center">
                    <span className="text-[10px] uppercase font-semibold text-neutral-500">
                      Investimento
                    </span>
                    <span className="text-sm font-bold text-white">
                      {formatBRL(Number(ev.price))}
                    </span>
                  </div>
                </div>

                {/* Status Machine Fast-Forward Trigger & Google Integration Buttons */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60">
                  {nextStatusObj ? (
                    <button
                      onClick={() => handleStatusChange(ev.id, nextStatusObj.key)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      title={`Avançar para: ${nextStatusObj.label}`}
                    >
                      <span>Avançar p/ {nextStatusObj.label}</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>Trabalho Finalizado</span>
                    </span>
                  )}

                  {/* Google Integration Trigger Quick-Pills */}
                  <div className="flex items-center gap-1.5">
                    {/* Meet Briefing Generator button */}
                    <button
                      onClick={() => handleMeetAction(ev)}
                      disabled={isMeetLoading}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ev.meet_link
                          ? "bg-blue-950/60 text-blue-400 border border-blue-800/50 hover:bg-blue-900/60"
                          : "bg-neutral-800/80 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800"
                      }`}
                      title={ev.meet_link ? "Entrar na reunião Google Meet" : "Gerar link Google Meet"}
                    >
                      {isMeetLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[10px] hidden sm:inline">
                        {ev.meet_link ? "Meet" : "Criar Meet"}
                      </span>
                    </button>

                    {/* Google Drive Folder Trigger */}
                    <button
                      onClick={() => handleDriveAction(ev.id)}
                      disabled={isDriveLoading}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ev.drive_folder_url
                          ? "bg-amber-950/60 text-amber-400 border border-amber-800/50 hover:bg-amber-900/60"
                          : "bg-neutral-800/80 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800"
                      }`}
                      title={ev.drive_folder_url ? "Abrir pasta no Google Drive" : "Criar pastas RAWs & Entregas no Drive"}
                    >
                      {isDriveLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[10px] hidden sm:inline">
                        {ev.drive_folder_url ? "Drive" : "Pastas RAW"}
                      </span>
                    </button>

                    {/* Google Calendar Sync Trigger */}
                    <button
                      onClick={() => handleCalendarSync(ev.id)}
                      disabled={isCalendarLoading}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ev.google_event_id
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60"
                          : "bg-neutral-800/80 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800"
                      }`}
                      title="Sincronizar no Google Calendar"
                    >
                      {isCalendarLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[10px] hidden sm:inline">Agenda</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent}
        clients={clients}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
