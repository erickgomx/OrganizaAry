"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  FileDown,
  Search,
  Pencil,
  Trash2,
  Sparkles,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  MOCK_CRONOGRAMA_POSTS,
  POST_STATUSES,
  PostItem,
  PostStatus,
  SOCIAL_NETWORKS,
  SocialNetwork,
} from "@/types/cronograma";
import {
  deleteSchedulePostAction,
  updateSchedulePostAction,
} from "@/actions/cronograma";

const ExportarCronogramaModal = dynamic(
  () => import("./ExportarCronogramaModal").then((m) => m.ExportarCronogramaModal),
  { ssr: false }
);
const PostModal = dynamic(
  () => import("./PostModal").then((m) => m.PostModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((m) => m.ConfirmModal),
  { ssr: false }
);

interface SimpleClientOption {
  id: string;
  name: string;
}

interface CronogramaOverviewProps {
  initialPosts: PostItem[];
  clients: SimpleClientOption[];
  schemaMissing?: boolean;
}

function getStatusBadgeClasses(status: PostStatus): string {
  if (status === "Aprovado" || status === "Publicado") {
    return "bg-[#162017] text-[#9fc193] border-[#273829]";
  }
  if (status === "Pendente" || status === "Em Revisão") {
    return "bg-[#211a14] text-[#ffb066] border-[#ff9e3b]/30";
  }
  return "bg-[#261514] text-[#e06b63] border-[#4a2420]";
}

function formatDateBr(dateStr: string): string {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function CronogramaOverview({
  initialPosts,
  clients,
  schemaMissing = false,
}: CronogramaOverviewProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [prevInitialPosts, setPrevInitialPosts] = useState(initialPosts);

  if (prevInitialPosts !== initialPosts) {
    setPrevInitialPosts(initialPosts);
    setPosts(initialPosts);
  }

  const [clientFilter, setClientFilter] = useState<string>("all");
  const [networkFilter, setNetworkFilter] = useState<"Todas" | SocialNetwork>("Todas");
  const [statusFilter, setStatusFilter] = useState<"Todos" | PostStatus>("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<{ id: string; theme: string } | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visiblePosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts
      .filter((p) => {
        if (clientFilter !== "all" && p.clientId !== clientFilter) return false;
        if (networkFilter !== "Todas" && p.socialNetwork !== networkFilter) return false;
        if (statusFilter !== "Todos" && p.status !== statusFilter) return false;
        if (q) {
          const hay = [p.theme, p.caption, p.socialNetwork, p.format, p.clientName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = a.scheduledDate.localeCompare(b.scheduledDate);
        if (cmp !== 0) return cmp;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
  }, [posts, clientFilter, networkFilter, statusFilter, searchQuery]);

  const clientPosts = useMemo(() => {
    if (clientFilter === "all") return posts;
    return posts.filter((p) => p.clientId === clientFilter);
  }, [posts, clientFilter]);

  const hasMockPosts = useMemo(
    () => posts.some((p) => p.id.startsWith("mock-")),
    [posts]
  );

  const selectedClientName = useMemo(() => {
    if (clientFilter === "all") return "EA REC";
    return clients.find((c) => c.id === clientFilter)?.name || "EA REC";
  }, [clientFilter, clients]);

  const handleStatusChange = async (post: PostItem, nextStatus: PostStatus) => {
    const prevStatus = post.status;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p))
    );

    if (post.id.startsWith("mock-")) return;

    const res = await updateSchedulePostAction(post.id, { status: nextStatus });
    if (res.error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: prevStatus } : p))
      );
      setActionError(res.error);
    } else {
      router.refresh();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPost) return;
    setIsDeleting(true);
    const backup = posts;
    setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));

    if (!deletingPost.id.startsWith("mock-")) {
      const res = await deleteSchedulePostAction(deletingPost.id);
      if (!res.success) {
        setPosts(backup);
        setActionError(res.error || "Erro ao excluir postagem.");
      } else {
        router.refresh();
      }
    }

    setIsDeleting(false);
    setDeletingPost(null);
  };

  return (
    <div className="space-y-5">
      {schemaMissing && (
        <div className="rounded-xl border border-[#ff9e3b]/30 bg-[#211a14] px-4 py-3 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-[#ffb066] shrink-0 mt-0.5" />
          <p className="text-[#d1c8d4]">
            Rode a migration{" "}
            <code className="px-1 rounded bg-black/30 text-[#bba0c1]">
              supabase/migrations/20261119_cronograma_posts.sql
            </code>{" "}
            no Supabase para salvar postagens no banco. Você já pode testar a exportação em PDF com os exemplos.
          </p>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-[#4a2420] bg-[#261514] px-4 py-2.5 text-xs text-[#e06b63] flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33293c] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#9873a1] shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#f4eff5] tracking-tight">
              Cronograma de Postagens
            </h1>
            <p className="text-xs text-[#968a9c]">
              Organize conteúdos e exporte em PDF personalizado para aprovação de clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[#bba0c1] hover:text-[#f4eff5] text-xs font-medium transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[#9873a1]" />
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPost(null);
              setIsPostModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Postagem</span>
          </button>
        </div>
      </div>

      {hasMockPosts && (
        <div className="rounded-xl border border-[#9873a1]/40 bg-[#231c29]/70 px-4 py-2.5 text-xs text-[#d1c8d4] flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#9873a1] shrink-0" />
            <span>Visualizando postagens de exemplo para teste rápido da exportação em PDF.</span>
          </span>
          <button
            type="button"
            onClick={() => setPosts([])}
            className="text-[11px] font-medium text-[#bba0c1] hover:text-[#f4eff5] underline shrink-0 cursor-pointer"
          >
            Limpar exemplos
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
        <div className="lg:col-span-3">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
          >
            <option value="all">Todos os clientes / marcas</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={networkFilter}
            onChange={(e) =>
              setNetworkFilter(e.target.value as "Todas" | SocialNetwork)
            }
            className="w-full rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
          >
            <option value="Todas">Todas as redes</option>
            {SOCIAL_NETWORKS.map((net) => (
              <option key={net} value={net}>
                {net}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "Todos" | PostStatus)
            }
            className="w-full rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
          >
            <option value="Todos">Todos os status</option>
            {POST_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-5 relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-[#6e6375] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tema, legenda ou formato..."
            className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Postagens */}
      {visiblePosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#33293c] bg-[#16121b]/60 p-12 text-center space-y-3">
          <CalendarDays className="w-8 h-8 text-[#6e6375] mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#f4eff5]">
              Nenhuma postagem encontrada
            </p>
            <p className="text-xs text-[#968a9c]">
              Crie sua primeira postagem ou carregue os exemplos prontos para testar o PDF.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setIsPostModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Postagem
            </button>

            {posts.length === 0 && (
              <button
                type="button"
                onClick={() => setPosts(MOCK_CRONOGRAMA_POSTS)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[#bba0c1] text-xs font-medium cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#9873a1]" /> Carregar Exemplos
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#33293c] bg-[#16121b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#33293c] bg-[#120e15] text-[10px] uppercase tracking-wider text-[#968a9c]">
                  <th className="py-3 px-4 font-semibold">Data / Horário</th>
                  <th className="py-3 px-4 font-semibold">Rede / Formato</th>
                  <th className="py-3 px-4 font-semibold">Tema / Título</th>
                  <th className="py-3 px-4 font-semibold">Legenda / Briefing</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#33293c]/60 text-xs">
                {visiblePosts.map((post) => (
                  <tr key={post.id} className="hover:bg-[#1a151f]/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                      <span className="block font-semibold text-[#f4eff5]">
                        {formatDateBr(post.scheduledDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#6e6375]">
                        <Clock className="w-3 h-3" />
                        {post.scheduledTime}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="block font-medium text-[#bba0c1]">
                        {post.socialNetwork}
                      </span>
                      <span className="text-[11px] text-[#968a9c]">{post.format}</span>
                    </td>

                    <td className="py-3 px-4 max-w-[220px]">
                      <span className="block font-semibold text-[#f4eff5]">
                        {post.theme}
                      </span>
                      {post.clientName && (
                        <span className="text-[11px] text-[#9873a1]">
                          {post.clientName}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-[320px]">
                      <p className="text-[11px] text-[#968a9c] line-clamp-2 leading-relaxed">
                        {post.caption || "—"}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <select
                        value={post.status}
                        onChange={(e) =>
                          handleStatusChange(post, e.target.value as PostStatus)
                        }
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border cursor-pointer focus:outline-none ${getStatusBadgeClasses(
                          post.status
                        )}`}
                      >
                        {POST_STATUSES.map((st) => (
                          <option
                            key={st}
                            value={st}
                            className="bg-[#1a151f] text-[#f4eff5]"
                          >
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                            setIsPostModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors cursor-pointer"
                          title="Editar postagem"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeletingPost({ id: post.id, theme: post.theme })
                          }
                          className="p-1.5 rounded-lg text-[#968a9c] hover:text-[#e06b63] hover:bg-[#261514] transition-colors cursor-pointer"
                          title="Excluir postagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      {isPostModalOpen && (
        <PostModal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setEditingPost(null);
          }}
          post={editingPost}
          clients={clients}
          defaultClientId={clientFilter !== "all" ? clientFilter : ""}
          onSuccess={(saved) => {
            setPosts((prev) => {
              const withoutMocks = prev.filter((p) => !p.id.startsWith("mock-"));
              const exists = withoutMocks.some((p) => p.id === saved.id);
              if (exists) {
                return withoutMocks.map((p) => (p.id === saved.id ? saved : p));
              }
              return [...withoutMocks, saved];
            });
            router.refresh();
          }}
        />
      )}

      {isExportModalOpen && (
        <ExportarCronogramaModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          posts={clientPosts}
          defaultBrandName={selectedClientName}
          storageKeySuffix={clientFilter}
          initialStatusFilter={statusFilter}
          initialNetworkFilter={networkFilter}
        />
      )}

      {deletingPost && (
        <ConfirmModal
          isOpen={!!deletingPost}
          onClose={() => setDeletingPost(null)}
          isLoading={isDeleting}
          title="Excluir Postagem"
          description={`Tem certeza que deseja excluir "${deletingPost.theme}" do cronograma?`}
          confirmLabel="Sim, Excluir"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
