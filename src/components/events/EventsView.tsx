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
  ArrowRight,
  Check,
  Loader2,
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
      label: "Orçamento / Proposta",
      step: 1,
      color: "text-[#d4a359]",
      bg: "bg-[#211a12]",
      border: "border-[#382b1d]",
    },
    {
      key: "scheduled",
      label: "Agendado",
      step: 2,
      color: "text-[#94a3b8]",
      bg: "bg-[#161a20]",
      border: "border-[#252c38]",
    },
    {
      key: "captured",
      label: "Captação Concluída",
      step: 3,
      color: "text-[#c8a97e]",
      bg: "bg-[#1c1a18]",
      border: "border-[#332e27]",
    },
    {
      key: "post_production",
      label: "Pós-Produção",
      step: 4,
      color: "text-[#d48970]",
      bg: "bg-[#211714]",
      border: "border-[#3b2520]",
    },
    {
      key: "finished",
      label: "Finalizado",
      step: 5,
      color: "text-[#9fc193]",
      bg: "bg-[#162017]",
      border: "border-[#273829]",
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

        if (newStatus === "scheduled") {
          const syncConfirm = confirm(
            "Captação agendada com sucesso! Deseja sincronizar com o Google Calendar e criar as pastas [RAWs] e [Entregas] no Google Drive agora?"
          );
          if (syncConfirm) {
            handleDriveAction(id);
            handleCalendarSync(id);
          }
        }

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
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#736e65]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por evento, cliente ou local..."
            className="w-full rounded-xl border border-[#26231f] bg-[#151412] py-2 pl-9 pr-3 text-xs text-[#f6f4ef] placeholder-[#736e65] focus:border-[#c8a97e]/60 focus:outline-none focus:ring-1 focus:ring-[#c8a97e]/20 transition-colors"
          />
        </div>

        <button
          onClick={() => {
            setEditingEvent(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Captação</span>
        </button>
      </div>

      {/* Status Machine Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#23201c]">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            activeTab === "all"
              ? "bg-[#1c1a18] text-[#dfba88] border border-[#332e27] shadow-sm"
              : "text-[#8e887f] hover:text-[#f6f4ef] hover:bg-[#151412]"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? `${sm.bg} ${sm.color} border ${sm.border}`
                  : "text-[#8e887f] hover:text-[#f6f4ef] hover:bg-[#151412]"
              }`}
            >
              <span>{sm.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums ${
                  isActive ? "bg-black/40" : "bg-[#1c1a18] text-[#736e65]"
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
        <div className="rounded-2xl border border-dashed border-[#26231f] bg-[#151412]/40 p-12 text-center space-y-2">
          <Calendar className="w-6 h-6 text-[#736e65] mx-auto" />
          <p className="text-xs sm:text-sm font-medium text-[#f6f4ef]">Nenhuma captação nesta etapa.</p>
          <p className="text-xs text-[#736e65] max-w-xs mx-auto">
            Crie novos eventos ou altere os filtros de status acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                className="group relative rounded-2xl border border-[#26231f] bg-[#151412] hover:border-[#38332c] hover:bg-[#181715] transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                {/* Header: Title, Client & Menu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
                      >
                        {status.step}. {status.label}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[#f6f4ef] text-sm sm:text-base leading-snug pt-0.5">
                      {ev.title}
                    </h3>

                    {ev.client && (
                      <Link
                        href={`/clients/${ev.client.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#c8a97e] hover:text-[#dfba88] font-medium transition-colors"
                      >
                        <User className="w-3 h-3" />
                        <span>{ev.client.name}</span>
                      </Link>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuId(activeMenuId === ev.id ? null : ev.id)
                      }
                      className="p-1.5 rounded-lg text-[#736e65] hover:text-[#f6f4ef] hover:bg-[#1c1a18] transition-colors"
                      type="button"
                      title="Opções"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuId === ev.id && (
                      <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-[#2d2822] bg-[#181715] p-1.5 shadow-xl text-xs space-y-0.5">
                        <button
                          onClick={() => {
                            setEditingEvent(ev);
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
                            handleDelete(ev.id, ev.title);
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

                {/* Event Details: Date, Location, Value */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-[#181715] border border-[#23201c] text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[#9d978d]">
                      <Clock className="w-3 h-3 text-[#736e65] shrink-0" />
                      <span className="tabular-nums">{formatDate(ev.date)}</span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-[#8e887f]">
                        <MapPin className="w-3 h-3 text-[#736e65] shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end justify-center">
                    <span className="text-[10px] uppercase font-medium text-[#736e65]">
                      Investimento
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#dfba88] tabular-nums">
                      {formatBRL(Number(ev.price))}
                    </span>
                  </div>
                </div>

                {/* Status Machine Fast-Forward Trigger & Google Integration Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#23201c]">
                  {nextStatusObj ? (
                    <button
                      onClick={() => handleStatusChange(ev.id, nextStatusObj.key)}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1a18] hover:bg-[#23201c] border border-[#2d2822] text-[#f6f4ef] text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                      title={`Avançar para: ${nextStatusObj.label}`}
                    >
                      <span>Avançar p/ {nextStatusObj.label}</span>
                      <ArrowRight className="w-3 h-3 text-[#c8a97e]" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9fc193]">
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
                          ? "bg-[#161a20] text-[#94a3b8] border border-[#252c38] hover:bg-[#1e232c]"
                          : "bg-[#1a1917] border border-[#26231f] text-[#8e887f] hover:text-[#f6f4ef]"
                      }`}
                      title={ev.meet_link ? "Entrar na reunião Google Meet" : "Gerar link Google Meet"}
                    >
                      {isMeetLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#c8a97e]" />
                      ) : (
                        <Video className="w-3 h-3" />
                      )}
                      <span className="text-[10px] hidden sm:inline">
                        {ev.meet_link ? "Reunião" : "Criar Meet"}
                      </span>
                    </button>

                    {/* Google Drive Folder Trigger */}
                    <button
                      onClick={() => handleDriveAction(ev.id)}
                      disabled={isDriveLoading}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ev.drive_folder_url
                          ? "bg-[#211a12] text-[#d4a359] border border-[#382b1d] hover:bg-[#2b2218]"
                          : "bg-[#1a1917] border border-[#26231f] text-[#8e887f] hover:text-[#f6f4ef]"
                      }`}
                      title={ev.drive_folder_url ? "Abrir pasta no Google Drive" : "Criar pastas RAWs & Entregas no Drive"}
                    >
                      {isDriveLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#c8a97e]" />
                      ) : (
                        <FolderOpen className="w-3 h-3" />
                      )}
                      <span className="text-[10px] hidden sm:inline">
                        {ev.drive_folder_url ? "Pastas" : "Criar Pastas"}
                      </span>
                    </button>

                    {/* Google Calendar Sync Trigger */}
                    <button
                      onClick={() => handleCalendarSync(ev.id)}
                      disabled={isCalendarLoading}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ev.google_event_id
                          ? "bg-[#162017] text-[#9fc193] border border-[#273829] hover:bg-[#1e2e20]"
                          : "bg-[#1a1917] border border-[#26231f] text-[#8e887f] hover:text-[#f6f4ef]"
                      }`}
                      title="Sincronizar no Google Calendar"
                    >
                      {isCalendarLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#c8a97e]" />
                      ) : (
                        <CalendarCheck2 className="w-3 h-3" />
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
