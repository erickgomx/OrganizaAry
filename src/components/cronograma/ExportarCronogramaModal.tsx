"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import {
  X,
  FileDown,
  Upload,
  Trash2,
  Loader2,
  Palette,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  ExportConfig,
  LogoData,
  MOCK_CRONOGRAMA_POSTS,
  POST_STATUSES,
  PostItem,
  PostStatus,
  SOCIAL_NETWORKS,
  SocialNetwork,
} from "@/types/cronograma";
import {
  exportarCronogramaPDF,
  fileToLogoData,
  filterPostsForExport,
  hexToRgb,
} from "@/lib/cronograma/exportarCronogramaPDF";
import { MONTH_NAMES_PT } from "@/lib/finance/calculations";

function getDefaultPeriodLabel(): string {
  const now = new Date();
  return `${MONTH_NAMES_PT[now.getMonth()]} / ${now.getFullYear()}`;
}

interface ExportarCronogramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: PostItem[];
  defaultBrandName?: string;
  defaultPeriodLabel?: string;
  storageKeySuffix?: string;
  initialStatusFilter?: "Todos" | PostStatus;
  initialNetworkFilter?: "Todas" | SocialNetwork;
}

const PRESET_COLORS = [
  { hex: "#33293c", label: "Roxo Organiza Ary" },
  { hex: "#1e293b", label: "Slate Escuro" },
  { hex: "#9873a1", label: "Lavanda" },
  { hex: "#0f172a", label: "Azul Noite" },
  { hex: "#14532d", label: "Verde Floresta" },
  { hex: "#7c2d12", label: "Terracota" },
];

interface SavedBrandPreferences {
  brandName?: string;
  periodLabel?: string;
  primaryColorHex?: string;
  logo?: LogoData | null;
}

function loadSavedPreferences(storageKey: string): SavedBrandPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as SavedBrandPreferences;
  } catch {
    return null;
  }
}

function savePreferences(storageKey: string, data: SavedBrandPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // Ignora caso o storage esteja cheio ou bloqueado
  }
}

export function ExportarCronogramaModal({
  isOpen,
  onClose,
  posts,
  defaultBrandName = "EA REC",
  defaultPeriodLabel,
  storageKeySuffix = "default",
  initialStatusFilter = "Todos",
  initialNetworkFilter = "Todas",
}: ExportarCronogramaModalProps) {
  const resolvedPeriodDefault = defaultPeriodLabel || getDefaultPeriodLabel();
  const storageKey = `organizaary_cronograma_brand_${storageKeySuffix}`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialPrefs = loadSavedPreferences(storageKey);

  const [brandName, setBrandName] = useState<string>(
    initialPrefs?.brandName || defaultBrandName
  );
  const [periodLabel, setPeriodLabel] = useState<string>(
    initialPrefs?.periodLabel || resolvedPeriodDefault
  );
  const [primaryColorHex, setPrimaryColorHex] = useState<string>(
    initialPrefs?.primaryColorHex || "#33293c"
  );
  const [logo, setLogo] = useState<LogoData | null>(initialPrefs?.logo || null);
  const [statusFilter, setStatusFilter] = useState<"Todos" | PostStatus>(initialStatusFilter);
  const [networkFilter, setNetworkFilter] = useState<"Todas" | SocialNetwork>(initialNetworkFilter);
  const [useMockIfEmpty, setUseMockIfEmpty] = useState<boolean>(posts.length === 0);

  const [isDragging, setIsDragging] = useState(false);
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFileName, setSuccessFileName] = useState<string | null>(null);

  // Sincroniza quando o modal reabre com outra marca/chave
  const modalKey = isOpen
    ? `${storageKey}-${defaultBrandName}-${posts.length}-${initialStatusFilter}-${initialNetworkFilter}`
    : "closed";
  const [prevModalKey, setPrevModalKey] = useState(modalKey);
  if (prevModalKey !== modalKey) {
    setPrevModalKey(modalKey);
    if (isOpen) {
      const prefs = loadSavedPreferences(storageKey);
      setBrandName(
        defaultBrandName && defaultBrandName !== "EA REC"
          ? defaultBrandName
          : prefs?.brandName || defaultBrandName
      );
      setPeriodLabel(prefs?.periodLabel || resolvedPeriodDefault);
      setPrimaryColorHex(prefs?.primaryColorHex || "#33293c");
      setLogo(prefs?.logo || null);
      setStatusFilter(initialStatusFilter);
      setNetworkFilter(initialNetworkFilter);
      setUseMockIfEmpty(posts.length === 0);
      setError(null);
      setSuccessFileName(null);
    }
  }

  const effectivePosts = useMemo(() => {
    if (posts.length > 0) return posts;
    return useMockIfEmpty ? MOCK_CRONOGRAMA_POSTS : [];
  }, [posts, useMockIfEmpty]);

  const matchingPostsCount = useMemo(
    () =>
      filterPostsForExport(effectivePosts, {
        statusFilter,
        networkFilter,
      }).length,
    [effectivePosts, statusFilter, networkFilter]
  );

  if (!isOpen) return null;

  const handleLogoFile = async (file: File) => {
    setError(null);
    setSuccessFileName(null);
    setIsReadingLogo(true);
    try {
      const parsedLogo = await fileToLogoData(file);
      setLogo(parsedLogo);
      savePreferences(storageKey, {
        brandName,
        periodLabel,
        primaryColorHex,
        logo: parsedLogo,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar imagem da logo."
      );
    } finally {
      setIsReadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    savePreferences(storageKey, {
      brandName,
      periodLabel,
      primaryColorHex,
      logo: null,
    });
  };

  const handleGeneratePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessFileName(null);

    if (matchingPostsCount === 0) {
      setError(
        "Nenhuma postagem encontrada com os filtros selecionados. Ajuste os filtros ou ative os exemplos."
      );
      return;
    }

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 60));

    try {
      savePreferences(storageKey, {
        brandName,
        periodLabel,
        primaryColorHex,
        logo,
      });

      const config: ExportConfig = {
        brandName: brandName.trim() || "Cliente",
        periodLabel: periodLabel.trim() || "Geral",
        primaryColorHex,
        logo,
        statusFilter,
        networkFilter,
      };

      const fileName = exportarCronogramaPDF(effectivePosts, config);
      setSuccessFileName(fileName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const previewRgb = hexToRgb(primaryColorHex);
  const previewLuminance =
    0.299 * previewRgb[0] + 0.587 * previewRgb[1] + 0.114 * previewRgb[2];
  const previewHeadTextColor = previewLuminance > 195 ? "#0f172a" : "#ffffff";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <div className="flex items-center gap-2">
            <FileDown className="w-4 h-4 text-[#9873a1]" />
            <h3 className="text-sm font-semibold text-[#f4eff5]">
              Exportar Cronograma em PDF (A4 Paisagem)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-[#261514] p-3 text-xs text-[#e06b63] border border-[#4a2420] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successFileName && (
          <div className="rounded-xl bg-[#162017] p-3 text-xs text-[#9fc193] border border-[#273829] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              PDF gerado: <strong className="text-[#f4eff5]">{successFileName}</strong>
            </span>
          </div>
        )}

        <form onSubmit={handleGeneratePdf} className="space-y-4">
          {/* Upload de Logo */}
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider">
              Logo da Marca / Cliente (Opcional)
            </label>

            {logo ? (
              <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-14 w-28 rounded-lg bg-white/95 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                    <Image
                      src={logo.base64}
                      alt="Preview da logo"
                      width={logo.width}
                      height={logo.height}
                      unoptimized
                      className="max-h-full max-w-full w-auto h-auto object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#f4eff5] truncate">
                      {logo.fileName || "Logo carregada"}
                    </p>
                    <p className="text-[11px] text-[#6e6375] tabular-nums">
                      {logo.width} × {logo.height}px · {logo.format}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[11px] text-[#bba0c1] font-medium cursor-pointer"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#e06b63] hover:bg-[#261514] transition-colors cursor-pointer"
                    title="Remover logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleLogoFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#9873a1] bg-[#231c29]/60"
                    : "border-[#33293c] bg-[#120e15] hover:border-[#9873a1]/60"
                }`}
              >
                {isReadingLogo ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#bba0c1]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando imagem...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="w-5 h-5 text-[#9873a1]" />
                    <p className="text-xs font-medium text-[#f4eff5]">
                      Clique ou arraste a logo aqui
                    </p>
                    <p className="text-[11px] text-[#6e6375]">
                      PNG, JPG/JPEG ou WEBP (máx. 2MB) · Redimensionada sem distorção
                    </p>
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
              }}
              className="hidden"
            />
          </div>

          {/* Identidade Visual Rápida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="pdf-brand-name"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Nome do Cliente / Marca *
              </label>
              <input
                id="pdf-brand-name"
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: Studio Silva, Clínica Viva"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 px-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pdf-period"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Período de Referência *
              </label>
              <input
                id="pdf-period"
                type="text"
                required
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Ex: Novembro / 2026"
                className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 px-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
              />
            </div>
          </div>

          {/* Seletor de Cor Primária */}
          <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#f4eff5]">
                <Palette className="w-3.5 h-3.5 text-[#9873a1]" />
                <span>Cor Primária do Cabeçalho</span>
              </span>
              <span className="text-[11px] font-mono text-[#bba0c1] uppercase">
                {primaryColorHex}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColorHex(preset.hex)}
                    title={preset.label}
                    className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                      primaryColorHex.toLowerCase() === preset.hex
                        ? "scale-110 ring-2 ring-[#f4eff5] border-transparent"
                        : "border-[#33293c] opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                ))}
              </div>

              <label className="inline-flex items-center gap-2 text-[11px] text-[#968a9c] cursor-pointer">
                <span>Personalizar:</span>
                <input
                  type="color"
                  value={primaryColorHex}
                  onChange={(e) => setPrimaryColorHex(e.target.value)}
                  className="w-8 h-7 rounded border border-[#33293c] bg-transparent cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Filtros de Exportação */}
          <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#f4eff5]">
                <Filter className="w-3.5 h-3.5 text-[#9873a1]" />
                <span>Filtros de Exportação</span>
              </span>
              <span className="text-[11px] font-semibold text-[#bba0c1] tabular-nums">
                {matchingPostsCount} postagem{matchingPostsCount === 1 ? "" : "ns"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pdf-filter-status"
                  className="block text-[10px] text-[#968a9c] uppercase mb-1"
                >
                  Status
                </label>
                <select
                  id="pdf-filter-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "Todos" | PostStatus)
                  }
                  className="w-full rounded-lg border border-[#33293c] bg-[#1a151f] px-2.5 py-1.5 text-xs text-[#f4eff5]"
                >
                  <option value="Todos">Todos os status</option>
                  {POST_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="pdf-filter-network"
                  className="block text-[10px] text-[#968a9c] uppercase mb-1"
                >
                  Rede Social
                </label>
                <select
                  id="pdf-filter-network"
                  value={networkFilter}
                  onChange={(e) =>
                    setNetworkFilter(e.target.value as "Todas" | SocialNetwork)
                  }
                  className="w-full rounded-lg border border-[#33293c] bg-[#1a151f] px-2.5 py-1.5 text-xs text-[#f4eff5]"
                >
                  <option value="Todas">Todas as redes</option>
                  {SOCIAL_NETWORKS.map((net) => (
                    <option key={net} value={net}>
                      {net}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {posts.length === 0 && (
              <label className="flex items-center gap-2 pt-2 border-t border-[#33293c]/60 text-[11px] text-[#bba0c1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMockIfEmpty}
                  onChange={(e) => setUseMockIfEmpty(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#9873a1]"
                />
                <Sparkles className="w-3.5 h-3.5 text-[#9873a1] shrink-0" />
                <span>Incluir 5 postagens de exemplo para testar o layout do PDF</span>
              </label>
            )}
          </div>

          {/* Mini Preview do Cabeçalho do PDF */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-medium text-[#968a9c] uppercase tracking-wider">
              Pré-visualização do cabeçalho (A4 Paisagem)
            </span>
            <div className="rounded-xl border border-[#33293c] bg-white p-3.5 text-slate-900 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="h-9 max-w-[110px] flex items-center shrink-0">
                  {logo ? (
                    <Image
                      src={logo.base64}
                      alt="Logo no cabeçalho"
                      width={logo.width}
                      height={logo.height}
                      unoptimized
                      className="max-h-9 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Sem logo</span>
                  )}
                </div>
                <div className="text-right min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate">
                    Cronograma de Conteúdo - {brandName.trim() || "Cliente"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    Período: {periodLabel.trim() || "Geral"}
                  </p>
                  <p className="text-[8px] text-slate-400">Organiza Ary</p>
                </div>
              </div>
              <div className="h-px bg-slate-200" />
              <div
                className="grid grid-cols-6 gap-1 rounded px-2 py-1 text-[8px] font-bold"
                style={{
                  backgroundColor: primaryColorHex,
                  color: previewHeadTextColor,
                }}
              >
                <span>Data / Horário</span>
                <span>Rede Social</span>
                <span>Formato</span>
                <span>Tema / Título</span>
                <span>Legenda / CTA</span>
                <span className="text-center">Status</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#33293c]">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isGenerating || matchingPostsCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Gerar e Baixar PDF</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
