"use client";

import { useState } from "react";
import { X, Loader2, Calendar, Clock, User, ChevronDown, FileText } from "lucide-react";
import {
  POST_FORMATS,
  POST_STATUSES,
  PostFormat,
  PostItem,
  PostStatus,
  SOCIAL_NETWORKS,
  SocialNetwork,
} from "@/types/cronograma";
import {
  createSchedulePostAction,
  updateSchedulePostAction,
} from "@/actions/cronograma";
import { handleFormKeyDownEnterToNextField } from "@/lib/utils";

interface SimpleClientOption {
  id: string;
  name: string;
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: PostItem | null;
  clients: SimpleClientOption[];
  defaultClientId?: string;
  onSuccess?: (savedPost: PostItem) => void;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function PostModal({
  isOpen,
  onClose,
  post,
  clients,
  defaultClientId = "",
  onSuccess,
}: PostModalProps) {
  const isEditing = Boolean(post);

  const [clientId, setClientId] = useState<string>(post?.clientId || defaultClientId);
  const [scheduledDate, setScheduledDate] = useState<string>(
    post?.scheduledDate || getTodayDate()
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    post?.scheduledTime || "18:00"
  );
  const [socialNetwork, setSocialNetwork] = useState<SocialNetwork>(
    post?.socialNetwork || "Instagram"
  );
  const [format, setFormat] = useState<PostFormat>(post?.format || "Reels");
  const [theme, setTheme] = useState<string>(post?.theme || "");
  const [caption, setCaption] = useState<string>(post?.caption || "");
  const [status, setStatus] = useState<PostStatus>(post?.status || "Pendente");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalKey = isOpen ? `${post?.id || "new"}-${defaultClientId}` : "closed";
  const [prevKey, setPrevKey] = useState(modalKey);
  if (prevKey !== modalKey) {
    setPrevKey(modalKey);
    if (isOpen) {
      setClientId(post?.clientId || defaultClientId);
      setScheduledDate(post?.scheduledDate || getTodayDate());
      setScheduledTime(post?.scheduledTime || "18:00");
      setSocialNetwork(post?.socialNetwork || "Instagram");
      setFormat(post?.format || "Reels");
      setTheme(post?.theme || "");
      setCaption(post?.caption || "");
      setStatus(post?.status || "Pendente");
      setError(null);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        clientId: clientId || null,
        scheduledDate,
        scheduledTime,
        socialNetwork,
        format,
        theme,
        caption,
        status,
      };

      if (isEditing && post && !post.id.startsWith("mock-")) {
        const res = await updateSchedulePostAction(post.id, payload);
        if (res.error || !res.data) throw new Error(res.error || "Erro ao atualizar postagem.");
        onSuccess?.(res.data);
      } else {
        const res = await createSchedulePostAction(payload);
        if (res.error || !res.data) throw new Error(res.error || "Erro ao criar postagem.");
        onSuccess?.(res.data);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar postagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#9873a1]" />
            {isEditing ? "Editar Postagem" : "Nova Postagem no Cronograma"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-[#261514] p-3 text-xs text-[#e06b63] border border-[#4a2420]">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDownEnterToNextField}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="post-client"
              className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
            >
              Cliente / Marca (Opcional)
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-[#6e6375] pointer-events-none" />
              <select
                id="post-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full min-h-[40px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-10 pr-9 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
              >
                <option value="">Geral / Sem cliente específico</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 w-4 h-4 text-[#6e6375] pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="post-date"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Data *
              </label>
              <input
                id="post-date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] [color-scheme:dark] focus:border-[#9873a1]/60 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="post-time"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Horário
              </label>
              <div className="relative flex items-center">
                <Clock className="absolute left-3 w-3.5 h-3.5 text-[#6e6375] pointer-events-none" />
                <input
                  id="post-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] [color-scheme:dark] focus:border-[#9873a1]/60 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="post-network"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Rede Social
              </label>
              <select
                id="post-network"
                value={socialNetwork}
                onChange={(e) => setSocialNetwork(e.target.value as SocialNetwork)}
                className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
              >
                {SOCIAL_NETWORKS.map((net) => (
                  <option key={net} value={net}>
                    {net}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="post-format"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Formato
              </label>
              <select
                id="post-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as PostFormat)}
                className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
              >
                {POST_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="post-status"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Status
              </label>
              <select
                id="post-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
              >
                {POST_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="post-theme"
              className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
            >
              Tema / Título *
            </label>
            <input
              id="post-theme"
              type="text"
              required
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Bastidores do ensaio ao pôr do sol"
              className="w-full min-h-[40px] rounded-xl border border-[#33293c] bg-[#120e15] px-3.5 py-2 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="post-caption"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#9873a1]" />
              <span>Legenda / Briefing / CTA</span>
            </label>
            <textarea
              id="post-caption"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda, instruções visuais ou chamada para ação..."
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] p-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#33293c]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? "Salvar Alterações" : "Adicionar Postagem"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
