"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  MoreHorizontal,
  MoreVertical,
  FileSpreadsheet,
  UploadCloud,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Film,
  Pencil,
  CopyPlus,
  Trash2,
  Sliders,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  X,
} from "lucide-react";
import {
  FinancialTransactionType,
  FinancialTransactionWithEvent,
  ProfitPillarRule,
} from "@/types/database";
import {
  addMonthsToIsoDate,
  buildWhatsAppFinancialSummary,
  calculateFinancialSummary,
  calculateMonthlySeries,
  calculatePillarDivision,
  extractDateParts,
  filterTransactionsByPeriod,
  getToggledStatus,
  MONTH_NAMES_PT,
  MONTH_SHORT_PT,
} from "@/lib/finance/calculations";
import {
  createTransactionAction,
  deleteTransactionAction,
  toggleTransactionStatusAction,
} from "@/actions/finance";
import { exportToGoogleSheetAction } from "@/actions/google";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_OAUTH_SCOPES_STRING } from "@/lib/google/scopes";
import { formatBRL, sanitizeExternalUrl } from "@/lib/utils";
import type { SimpleEventOption } from "./TransactionModal";

const TransactionModal = dynamic(
  () => import("./TransactionModal").then((m) => m.TransactionModal),
  { ssr: false }
);
const ImportSpreadsheetModal = dynamic(
  () => import("./ImportSpreadsheetModal").then((m) => m.ImportSpreadsheetModal),
  { ssr: false }
);
const PillarsConfigModal = dynamic(
  () => import("./PillarsConfigModal").then((m) => m.PillarsConfigModal),
  { ssr: false }
);
const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((m) => m.ConfirmModal),
  { ssr: false }
);

interface FinanceOverviewProps {
  initialTransactions: FinancialTransactionWithEvent[];
  initialPillars: ProfitPillarRule[];
  events: SimpleEventOption[];
  schemaMissing?: boolean;
}

export function FinanceOverview({
  initialTransactions,
  initialPillars,
  events,
  schemaMissing = false,
}: FinanceOverviewProps) {
  const router = useRouter();

  // Estado local sincronizado com as props do servidor (padrão sem useEffect)
  const [transactions, setTransactions] =
    useState<FinancialTransactionWithEvent[]>(initialTransactions);
  const [pillars, setPillars] = useState<ProfitPillarRule[]>(initialPillars);
  const [prevInitialTransactions, setPrevInitialTransactions] =
    useState(initialTransactions);
  const [prevInitialPillars, setPrevInitialPillars] = useState(initialPillars);

  if (prevInitialTransactions !== initialTransactions) {
    setPrevInitialTransactions(initialTransactions);
    setTransactions(initialTransactions);
  }
  if (prevInitialPillars !== initialPillars) {
    setPrevInitialPillars(initialPillars);
    setPillars(initialPillars);
  }

  // Período
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentMonth);
  const isYearView = selectedMonth === "all";

  // Filtros simples da lista
  const [typeFilter, setTypeFilter] = useState<"all" | FinancialTransactionType>("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modais, menus e feedbacks
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinancialTransactionWithEvent | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPillarsModalOpen, setIsPillarsModalOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<{ id: string; description: string } | null>(
    null
  );
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);
  const [isYearChartOpen, setIsYearChartOpen] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requiresGoogleAuth, setRequiresGoogleAuth] = useState(false);
  const [isExportingGoogle, setIsExportingGoogle] = useState(false);
  const [exportedSheetInfo, setExportedSheetInfo] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Dados derivados
  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedMonth, selectedYear),
    [transactions, selectedMonth, selectedYear]
  );

  const visibleTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodTransactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (onlyPending && tx.status !== "Pendente") return false;
        if (q) {
          const hay = [tx.description, tx.event?.title, tx.event?.client?.name, tx.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
  }, [periodTransactions, typeFilter, onlyPending, searchQuery]);

  const summary = useMemo(
    () => calculateFinancialSummary(periodTransactions),
    [periodTransactions]
  );

  const pillarDivision = useMemo(
    () => calculatePillarDivision(summary.netBalance, pillars),
    [summary.netBalance, pillars]
  );

  const monthlySeries = useMemo(
    () => calculateMonthlySeries(transactions, selectedYear),
    [transactions, selectedYear]
  );

  const maxMonthlyValue = useMemo(() => {
    let maxVal = 1;
    for (const p of monthlySeries) {
      maxVal = Math.max(
        maxVal,
        p.confirmedIncome + p.pendingIncome,
        p.paidExpenses + p.pendingExpenses
      );
    }
    return maxVal;
  }, [monthlySeries]);

  const pendingCount = periodTransactions.filter((t) => t.status === "Pendente").length;

  const periodLabel = isYearView
    ? `Ano de ${selectedYear}`
    : `${MONTH_NAMES_PT[(selectedMonth as number) - 1]} ${selectedYear}`;

  const defaultModalDate = isYearView
    ? `${selectedYear}-${String(currentMonth).padStart(2, "0")}-${String(currentDay).padStart(2, "0")}`
    : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
        Math.min(currentDay, new Date(selectedYear, selectedMonth as number, 0).getDate())
      ).padStart(2, "0")}`;

  // Navegação de período
  const goToPreviousPeriod = () => {
    if (isYearView) {
      setSelectedYear((y) => y - 1);
      return;
    }
    const m = selectedMonth as number;
    if (m === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth(m - 1);
    }
  };

  const goToNextPeriod = () => {
    if (isYearView) {
      setSelectedYear((y) => y + 1);
      return;
    }
    const m = selectedMonth as number;
    if (m === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth(m + 1);
    }
  };

  const isCurrentPeriod = isYearView
    ? selectedYear === currentYear
    : selectedYear === currentYear && selectedMonth === currentMonth;

  // Ações
  const openNewTransaction = () => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const handleToggleStatus = async (tx: FinancialTransactionWithEvent) => {
    const previousStatus = tx.status;
    const optimisticStatus = getToggledStatus(tx.status, tx.type);
    setActionError(null);

    setTransactions((prev) =>
      prev.map((item) => (item.id === tx.id ? { ...item, status: optimisticStatus } : item))
    );

    try {
      const res = await toggleTransactionStatusAction(tx.id, previousStatus, tx.type);
      if (res.error) throw new Error(res.error);
      if (res.data) {
        const saved = res.data;
        setTransactions((prev) => prev.map((item) => (item.id === tx.id ? saved : item)));
      }
      router.refresh();
    } catch (err: unknown) {
      setTransactions((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, status: previousStatus } : item))
      );
      setActionError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  };

  const handleDuplicateNextMonth = async (tx: FinancialTransactionWithEvent) => {
    setActionError(null);
    const nextDate = addMonthsToIsoDate(tx.date, 1);
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    setTransactions((prev) => [
      { ...tx, id: tempId, date: nextDate, status: "Pendente", created_at: nowIso, updated_at: nowIso },
      ...prev,
    ]);

    try {
      const res = await createTransactionAction({
        date: nextDate,
        description: tx.description,
        type: tx.type,
        category: tx.category,
        amount: Number(tx.amount),
        status: "Pendente",
        eventId: tx.event_id,
      });
      if (res.error || !res.data) throw new Error(res.error || "Falha ao duplicar.");
      const saved = res.data;
      setTransactions((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
      router.refresh();
    } catch (err: unknown) {
      setTransactions((prev) => prev.filter((item) => item.id !== tempId));
      setActionError(err instanceof Error ? err.message : "Erro ao duplicar lançamento.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setIsDeletingTx(true);
    setActionError(null);

    const backup = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));

    const res = await deleteTransactionAction(deletingTx.id);
    setIsDeletingTx(false);
    setDeletingTx(null);

    if (res.success) {
      router.refresh();
    } else {
      setTransactions(backup);
      setActionError(res.error || "Erro ao excluir lançamento.");
    }
  };

  const handleCopyWhatsApp = async () => {
    const text = buildWhatsAppFinancialSummary({
      periodLabel,
      summary,
      pillars: pillarDivision,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      setActionError("Não foi possível copiar o resumo.");
    }
  };

  const handleAuthorizeGoogleSheets = async () => {
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            window.location.pathname
          )}`,
          queryParams: { access_type: "offline", prompt: "consent" },
          scopes: GOOGLE_OAUTH_SCOPES_STRING,
        },
      });
      if (authErr) throw authErr;
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Não foi possível abrir a autorização do Google."
      );
    }
  };

  const handleExportToGoogleSheets = async () => {
    setIsMoreMenuOpen(false);
    setIsExportingGoogle(true);
    setActionError(null);
    setRequiresGoogleAuth(false);
    setExportedSheetInfo(null);

    try {
      const res = await exportToGoogleSheetAction({
        month: selectedMonth,
        year: selectedYear,
      });
      if (!res.success) {
        setRequiresGoogleAuth(Boolean(res.requiresAuth));
        setActionError(res.error);
        return;
      }
      setExportedSheetInfo({ url: res.spreadsheetUrl, title: res.title });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Erro ao exportar para o Google.");
    } finally {
      setIsExportingGoogle(false);
    }
  };

  const totalCosts = summary.totalFixedCosts + summary.totalVariableCosts;
  const fixedPercent = totalCosts > 0 ? (summary.totalFixedCosts / totalCosts) * 100 : 0;
  const exportedUrl = exportedSheetInfo ? sanitizeExternalUrl(exportedSheetInfo.url) : undefined;

  return (
    <div className="space-y-5">
      {/* ── Avisos (aparecem só quando necessário) ── */}
      {schemaMissing && (
        <div className="rounded-xl border border-[#ff9e3b]/30 bg-[#211a14] px-4 py-3 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-[#ffb066] shrink-0 mt-0.5" />
          <p className="text-[#d1c8d4]">
            Falta configurar o banco. Rode a migration{" "}
            <code className="px-1 rounded bg-black/30 text-[#bba0c1]">20261118_financial_module.sql</code>{" "}
            no Supabase para salvar lançamentos.
          </p>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-[#4a2420] bg-[#261514] px-4 py-2.5 text-xs text-[#e06b63] flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <div className="flex items-center gap-2 shrink-0">
            {requiresGoogleAuth && (
              <button
                type="button"
                onClick={handleAuthorizeGoogleSheets}
                className="px-2.5 py-1 rounded-lg bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-[11px] font-semibold cursor-pointer"
              >
                Autorizar Google
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setRequiresGoogleAuth(false);
              }}
              className="p-1 rounded hover:bg-white/5"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {exportedSheetInfo && (
        <div className="rounded-xl border border-[#273829] bg-[#162017] px-4 py-2.5 text-xs text-[#9fc193] flex items-center justify-between gap-3">
          <span className="truncate">Planilha criada no seu Google Drive.</span>
          <div className="flex items-center gap-2 shrink-0">
            {exportedUrl && (
              <a
                href={exportedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#9fc193] hover:bg-[#b5d4aa] text-[#120e15] text-[11px] font-semibold"
              >
                Abrir <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setExportedSheetInfo(null)}
              className="p-1 rounded hover:bg-white/5"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Cabeçalho: título, período e ações ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#33293c] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#9873a1] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#f4eff5] tracking-tight">
              Financeiro
            </h1>
            <p className="text-xs text-[#968a9c]">Entradas, saídas e divisão do lucro</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu "Mais" com importar/exportar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              disabled={isExportingGoogle}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[#968a9c] hover:text-[#f4eff5] transition-colors cursor-pointer disabled:opacity-60"
              aria-label="Mais opções"
              title="Importar ou exportar planilha"
            >
              {isExportingGoogle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreHorizontal className="w-4 h-4" />
              )}
            </button>

            {isMoreMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-[#33293c] bg-[#1a151f] p-1.5 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsImportModalOpen(true);
                    }}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#231c29] transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#9fc193] mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-medium text-[#f4eff5]">Importar planilha</span>
                      <span className="block text-[11px] text-[#6e6375]">Arquivo .xlsx ou link do Google</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportToGoogleSheets}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[#231c29] transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-[#bba0c1] mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-xs font-medium text-[#f4eff5]">Exportar para Google Planilhas</span>
                      <span className="block text-[11px] text-[#6e6375]">{periodLabel}</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={openNewTransaction}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo lançamento</span>
          </button>
        </div>
      </div>

      {/* ── Seletor de período compacto ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPreviousPeriod}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#1a151f] transition-colors cursor-pointer"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold text-[#f4eff5] tabular-nums">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={goToNextPeriod}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#1a151f] transition-colors cursor-pointer"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentPeriod && (
            <button
              type="button"
              onClick={() => {
                setSelectedYear(currentYear);
                setSelectedMonth(isYearView ? "all" : currentMonth);
              }}
              className="ml-1 text-[11px] text-[#9873a1] hover:text-[#bba0c1] font-medium cursor-pointer"
            >
              Hoje
            </button>
          )}
        </div>

        <div className="inline-flex rounded-lg bg-[#120e15] border border-[#33293c] p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedMonth(isYearView ? currentMonth : selectedMonth)}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              !isYearView ? "bg-[#231c29] text-[#bba0c1]" : "text-[#968a9c] hover:text-[#f4eff5]"
            }`}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setSelectedMonth("all")}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              isYearView ? "bg-[#231c29] text-[#bba0c1]" : "text-[#968a9c] hover:text-[#f4eff5]"
            }`}
          >
            Ano
          </button>
        </div>
      </div>

      {/* ── 3 números principais ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          label="Entrou"
          value={summary.confirmedIncome}
          tone="positive"
          hint={summary.pendingIncome > 0 ? `+ ${formatBRL(summary.pendingIncome)} a receber` : undefined}
        />
        <SummaryCard
          label="Saiu"
          value={summary.paidExpenses}
          tone="negative"
          hint={summary.pendingExpenses > 0 ? `+ ${formatBRL(summary.pendingExpenses)} a pagar` : undefined}
        />
        <SummaryCard
          label="Lucro"
          value={summary.netBalance}
          tone={summary.netBalance >= 0 ? "highlight" : "negative"}
          hint={summary.confirmedIncome > 0 ? `Margem de ${summary.netMargin.toFixed(0)}%` : undefined}
        />
      </div>

      {/* ── Conteúdo: lista (esquerda) + divisão do lucro (direita) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Lista de lançamentos */}
        <section className="lg:col-span-2 rounded-2xl border border-[#33293c] bg-[#16121b] overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#33293c]">
            <div className="inline-flex rounded-lg bg-[#120e15] border border-[#33293c] p-0.5 text-[11px]">
              {(
                [
                  { value: "all", label: "Tudo" },
                  { value: "entrada", label: "Entradas" },
                  { value: "saida", label: "Saídas" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTypeFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    typeFilter === opt.value
                      ? "bg-[#231c29] text-[#bba0c1]"
                      : "text-[#968a9c] hover:text-[#f4eff5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyPending((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    onlyPending
                      ? "bg-[#211a14] text-[#ffb066] border-[#ff9e3b]/40"
                      : "border-[#33293c] text-[#968a9c] hover:text-[#f4eff5]"
                  }`}
                >
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </button>
              )}

              {isSearchOpen ? (
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 w-3.5 h-3.5 text-[#6e6375] pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                    placeholder="Buscar..."
                    className="w-36 sm:w-44 rounded-lg border border-[#33293c] bg-[#120e15] py-1.5 pl-8 pr-2 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#1a151f] cursor-pointer"
                  aria-label="Buscar lançamento"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {visibleTransactions.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3">
              <div className="w-11 h-11 mx-auto rounded-xl bg-[#1a151f] border border-[#33293c] flex items-center justify-center text-[#6e6375]">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#f4eff5]">
                  {periodTransactions.length === 0
                    ? "Nada lançado neste período"
                    : "Nenhum lançamento com esse filtro"}
                </p>
                <p className="text-xs text-[#6e6375]">
                  {periodTransactions.length === 0
                    ? "Registre uma entrada ou saída para começar."
                    : "Tente limpar a busca ou trocar o filtro."}
                </p>
              </div>
              {periodTransactions.length === 0 && (
                <button
                  type="button"
                  onClick={openNewTransaction}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#231c29] border border-[#33293c] hover:border-[#9873a1]/60 text-xs font-medium text-[#bba0c1] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo lançamento
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[#33293c]/60">
              {visibleTransactions.map((tx) => {
                const parts = extractDateParts(tx.date);
                const isIncome = tx.type === "entrada";
                const isPending = tx.status === "Pendente";
                const isTemp = tx.id.startsWith("temp-");

                return (
                  <li
                    key={tx.id}
                    className={`group flex items-center gap-3 px-4 py-3 hover:bg-[#1a151f]/70 transition-colors ${
                      isTemp ? "opacity-60" : ""
                    }`}
                  >
                    {/* Data */}
                    <div className="w-10 shrink-0 text-center">
                      <span className="block text-sm font-semibold text-[#f4eff5] tabular-nums leading-none">
                        {parts ? String(parts.day).padStart(2, "0") : "--"}
                      </span>
                      <span className="block text-[10px] uppercase text-[#6e6375] mt-0.5">
                        {parts ? MONTH_SHORT_PT[parts.month - 1] : ""}
                      </span>
                    </div>

                    {/* Descrição */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTx(tx);
                        setIsTxModalOpen(true);
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                      title="Editar lançamento"
                    >
                      <span className="block text-sm text-[#f4eff5] truncate">{tx.description}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-[#6e6375] truncate">
                        <span>{tx.category}</span>
                        {tx.event && (
                          <>
                            <span>·</span>
                            <Film className="w-3 h-3 text-[#9873a1] shrink-0" />
                            <span className="truncate">{tx.event.title}</span>
                          </>
                        )}
                      </span>
                    </button>

                    {/* Valor + status */}
                    <div className="text-right shrink-0">
                      <span
                        className={`block text-sm font-semibold tabular-nums ${
                          isIncome ? "text-[#9fc193]" : "text-[#e06b63]"
                        }`}
                      >
                        {isIncome ? "+" : "−"} {formatBRL(Number(tx.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => !isTemp && handleToggleStatus(tx)}
                        title={isPending ? "Marcar como confirmado" : "Voltar para pendente"}
                        className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium cursor-pointer transition-colors ${
                          isPending
                            ? "text-[#ffb066] hover:text-[#ffc88f]"
                            : "text-[#6e6375] hover:text-[#968a9c]"
                        }`}
                      >
                        {isPending ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb066]" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {tx.status}
                      </button>
                    </div>

                    {/* Menu de ações */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveRowMenuId(activeRowMenuId === tx.id ? null : tx.id)}
                        disabled={isTemp}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                        aria-label="Ações do lançamento"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {activeRowMenuId === tx.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setActiveRowMenuId(null)} />
                          <div className="absolute right-0 top-8 z-40 w-48 rounded-xl border border-[#33293c] bg-[#1a151f] p-1 shadow-2xl text-xs">
                            <RowMenuItem
                              icon={<Pencil className="w-3.5 h-3.5" />}
                              label="Editar"
                              onClick={() => {
                                setActiveRowMenuId(null);
                                setEditingTx(tx);
                                setIsTxModalOpen(true);
                              }}
                            />
                            <RowMenuItem
                              icon={<CopyPlus className="w-3.5 h-3.5" />}
                              label="Repetir no próximo mês"
                              onClick={() => {
                                setActiveRowMenuId(null);
                                handleDuplicateNextMonth(tx);
                              }}
                            />
                            <RowMenuItem
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              label="Excluir"
                              danger
                              onClick={() => {
                                setActiveRowMenuId(null);
                                setDeletingTx({ id: tx.id, description: tx.description });
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Coluna lateral */}
        <aside className="space-y-5">
          {/* Divisão do lucro */}
          <section className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#f4eff5]">Divisão do lucro</h2>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    copiedWhatsApp
                      ? "text-[#9fc193] bg-[#162017]"
                      : "text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29]"
                  }`}
                  title={copiedWhatsApp ? "Copiado!" : "Copiar resumo para WhatsApp"}
                  aria-label="Copiar resumo para WhatsApp"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPillarsModalOpen(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors cursor-pointer"
                  title="Editar percentuais"
                  aria-label="Editar percentuais"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden bg-[#120e15] flex">
              {pillarDivision.map((p) => (
                <div
                  key={p.id}
                  style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                  className={`h-full ${summary.netBalance > 0 ? "" : "opacity-30"}`}
                />
              ))}
            </div>

            <ul className="space-y-2.5">
              {pillarDivision.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[#d1c8d4] truncate">{p.name}</span>
                    <span className="text-[#6e6375] tabular-nums">{p.percentage}%</span>
                  </span>
                  <span className="font-semibold text-[#f4eff5] tabular-nums shrink-0">
                    {formatBRL(p.amount)}
                  </span>
                </li>
              ))}
            </ul>

            {summary.netBalance <= 0 && (
              <p className="text-[11px] text-[#6e6375] leading-relaxed">
                A divisão aparece quando o lucro confirmado do período ficar positivo.
              </p>
            )}
          </section>

          {/* Evolução do ano (recolhível) */}
          <section className="rounded-2xl border border-[#33293c] bg-[#16121b]">
            <button
              type="button"
              onClick={() => setIsYearChartOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#f4eff5] cursor-pointer"
              aria-expanded={isYearChartOpen}
            >
              <span>Evolução de {selectedYear}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#968a9c] transition-transform ${isYearChartOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isYearChartOpen && (
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-12 gap-1 items-end h-28">
                  {monthlySeries.map((pt) => {
                    const inc = pt.confirmedIncome + pt.pendingIncome;
                    const out = pt.paidExpenses + pt.pendingExpenses;
                    const isActive = selectedMonth === pt.monthIndex;
                    return (
                      <button
                        key={pt.monthIndex}
                        type="button"
                        onClick={() => setSelectedMonth(pt.monthIndex)}
                        title={`${pt.fullLabel}: entrou ${formatBRL(inc)} · saiu ${formatBRL(out)}`}
                        className={`flex flex-col items-center justify-end h-full gap-1 rounded-md py-0.5 cursor-pointer transition-colors ${
                          isActive ? "bg-[#231c29]" : "hover:bg-[#1a151f]"
                        }`}
                      >
                        <div className="flex items-end gap-px flex-1 w-full justify-center">
                          <div
                            className="w-1.5 rounded-t-sm bg-[#9fc193]"
                            style={{ height: `${inc > 0 ? Math.max(4, (inc / maxMonthlyValue) * 100) : 0}%` }}
                          />
                          <div
                            className="w-1.5 rounded-t-sm bg-[#e06b63]"
                            style={{ height: `${out > 0 ? Math.max(4, (out / maxMonthlyValue) * 100) : 0}%` }}
                          />
                        </div>
                        <span
                          className={`text-[9px] ${isActive ? "text-[#bba0c1] font-semibold" : "text-[#6e6375]"}`}
                        >
                          {pt.label.charAt(0)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#968a9c]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-[#9fc193]" /> Entradas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-[#e06b63]" /> Saídas
                  </span>
                </div>

                {totalCosts > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-[#33293c]/60">
                    <div className="flex justify-between text-[11px] text-[#968a9c]">
                      <span>Custo fixo {fixedPercent.toFixed(0)}%</span>
                      <span>Variável {(100 - fixedPercent).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#e06b63]/70 flex">
                      <div className="h-full bg-[#9873a1]" style={{ width: `${fixedPercent}%` }} />
                    </div>
                    <p className="text-[10px] text-[#6e6375]">Saídas de {periodLabel.toLowerCase()}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ── Modais ── */}
      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => {
            setIsTxModalOpen(false);
            setEditingTx(null);
          }}
          transaction={editingTx}
          events={events}
          defaultDate={defaultModalDate}
          onSuccess={(savedItems) => {
            setTransactions((prev) => {
              const byId = new Map(prev.map((t) => [t.id, t]));
              for (const item of savedItems) byId.set(item.id, item);
              return Array.from(byId.values());
            });
            router.refresh();
          }}
        />
      )}

      {isImportModalOpen && (
        <ImportSpreadsheetModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={(imported) => {
            setTransactions((prev) => [...imported, ...prev]);
            router.refresh();
          }}
        />
      )}

      {isPillarsModalOpen && (
        <PillarsConfigModal
          isOpen={isPillarsModalOpen}
          onClose={() => setIsPillarsModalOpen(false)}
          pillars={pillars}
          onSuccess={(updated) => {
            setPillars(updated);
            router.refresh();
          }}
        />
      )}

      {deletingTx && (
        <ConfirmModal
          isOpen={!!deletingTx}
          onClose={() => setDeletingTx(null)}
          isLoading={isDeletingTx}
          title="Excluir lançamento"
          description={`Excluir "${deletingTx.description}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "highlight";
  hint?: string;
}) {
  const valueColor =
    tone === "positive" ? "text-[#9fc193]" : tone === "negative" ? "text-[#e06b63]" : "text-[#f4eff5]";
  const cardStyle =
    tone === "highlight"
      ? "border-[#9873a1]/40 bg-gradient-to-br from-[#231c29] to-[#16121b]"
      : "border-[#33293c] bg-[#16121b]";

  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${cardStyle}`}>
      <span className="text-xs text-[#968a9c]">{label}</span>
      <p className={`text-2xl font-bold tabular-nums mt-0.5 ${valueColor}`}>{formatBRL(value)}</p>
      <p className="text-[11px] text-[#6e6375] tabular-nums h-4">{hint ?? ""}</p>
    </div>
  );
}

function RowMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
        danger
          ? "text-[#d48970] hover:bg-[#261514]"
          : "text-[#d1c8d4] hover:bg-[#231c29] hover:text-[#f4eff5]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
