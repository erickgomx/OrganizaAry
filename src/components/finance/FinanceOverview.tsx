"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Plus,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Percent,
  Sliders,
  Copy,
  Check,
  Search,
  Film,
  Pencil,
  CopyPlus,
  Trash2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  FinancialCategory,
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
  filterTransactionsByPeriod,
  formatFinanceDateDisplay,
  getToggledStatus,
  MONTH_NAMES_PT,
} from "@/lib/finance/calculations";
import {
  createTransactionAction,
  deleteTransactionAction,
  toggleTransactionStatusAction,
} from "@/actions/finance";
import { formatBRL } from "@/lib/utils";
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

const MIGRATION_SQL_HINT = `-- Execute supabase/migrations/20261118_financial_module.sql no Supabase SQL Editor`;

export function FinanceOverview({
  initialTransactions,
  initialPillars,
  events,
  schemaMissing = false,
}: FinanceOverviewProps) {
  const router = useRouter();
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

  // Filtros de período
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentMonth);

  // Filtros da tabela
  const [typeFilter, setTypeFilter] = useState<"all" | FinancialTransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | FinancialCategory>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "Pendente">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais e estados auxiliares
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinancialTransactionWithEvent | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPillarsModalOpen, setIsPillarsModalOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<{ id: string; description: string } | null>(
    null
  );
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>([2025, 2026, 2027, currentYear]);
    for (const tx of transactions) {
      const y = Number(tx.date?.slice(0, 4));
      if (y >= 2020 && y <= 2100) years.add(y);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [transactions, currentYear]);

  // Transações do período selecionado (para KPIs, Pilares e Composição)
  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedMonth, selectedYear),
    [transactions, selectedMonth, selectedYear]
  );

  // Transações filtradas para a tabela (período + tipo + categoria + status + busca)
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodTransactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
        if (statusFilter === "confirmed" && tx.status === "Pendente") return false;
        if (statusFilter === "Pendente" && tx.status !== "Pendente") return false;
        if (q) {
          const matchesDesc = tx.description.toLowerCase().includes(q);
          const matchesEvent = tx.event?.title?.toLowerCase().includes(q);
          const matchesClient = tx.event?.client?.name?.toLowerCase().includes(q);
          if (!matchesDesc && !matchesEvent && !matchesClient) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
  }, [periodTransactions, typeFilter, categoryFilter, statusFilter, searchQuery]);

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
    let maxVal = 100;
    for (const point of monthlySeries) {
      const inc = point.confirmedIncome + point.pendingIncome;
      const exp = point.paidExpenses + point.pendingExpenses;
      if (inc > maxVal) maxVal = inc;
      if (exp > maxVal) maxVal = exp;
    }
    return maxVal;
  }, [monthlySeries]);

  const periodLabel =
    selectedMonth === "all"
      ? `Ano Completo (${selectedYear})`
      : `${MONTH_NAMES_PT[selectedMonth - 1]} ${selectedYear}`;

  // Toggle otimista do badge de status (1 clique)
  const handleToggleStatus = async (tx: FinancialTransactionWithEvent) => {
    const previousStatus = tx.status;
    const optimisticStatus = getToggledStatus(tx.status, tx.type);
    setActionError(null);

    setTransactions((prev) =>
      prev.map((item) =>
        item.id === tx.id ? { ...item, status: optimisticStatus } : item
      )
    );

    try {
      const res = await toggleTransactionStatusAction(tx.id, previousStatus, tx.type);
      if (res.error) {
        throw new Error(res.error);
      }
      if (res.data) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? res.data! : item))
        );
      }
      router.refresh();
    } catch (err: unknown) {
      // Rollback em caso de erro
      setTransactions((prev) =>
        prev.map((item) =>
          item.id === tx.id ? { ...item, status: previousStatus } : item
        )
      );
      setActionError(
        err instanceof Error ? err.message : "Erro ao atualizar status do lançamento."
      );
    }
  };

  // Duplicar para o próximo mês (otimista após retorno ou imediato com ID temporário)
  const handleDuplicateNextMonth = async (tx: FinancialTransactionWithEvent) => {
    setDuplicatingId(tx.id);
    setActionError(null);
    const nextDate = addMonthsToIsoDate(tx.date, 1);
    const tempId = `temp-${Date.now()}`;

    const optimisticTx: FinancialTransactionWithEvent = {
      ...tx,
      id: tempId,
      date: nextDate,
      status: "Pendente",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTransactions((prev) => [optimisticTx, ...prev]);

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

      if (res.error || !res.data) {
        throw new Error(res.error || "Falha ao duplicar lançamento.");
      }

      setTransactions((prev) =>
        prev.map((item) => (item.id === tempId ? res.data! : item))
      );
      router.refresh();
    } catch (err: unknown) {
      setTransactions((prev) => prev.filter((item) => item.id !== tempId));
      setActionError(
        err instanceof Error ? err.message : "Erro ao duplicar lançamento."
      );
    } finally {
      setDuplicatingId(null);
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

    if (res.success) {
      setDeletingTx(null);
      router.refresh();
    } else {
      setTransactions(backup);
      setActionError(res.error || "Erro ao excluir lançamento.");
      setDeletingTx(null);
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
      setActionError("Não foi possível copiar para a área de transferência.");
    }
  };

  const totalCostsForBreakdown = summary.totalFixedCosts + summary.totalVariableCosts;
  const fixedPercent =
    totalCostsForBreakdown > 0
      ? (summary.totalFixedCosts / totalCostsForBreakdown) * 100
      : 0;
  const variablePercent =
    totalCostsForBreakdown > 0
      ? (summary.totalVariableCosts / totalCostsForBreakdown) * 100
      : 0;

  const defaultModalDate =
    selectedMonth === "all"
      ? `${selectedYear}-${String(currentMonth).padStart(2, "0")}-${String(
          currentDay
        ).padStart(2, "0")}`
      : `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
          Math.min(currentDay, new Date(selectedYear, selectedMonth, 0).getDate())
        ).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      {/* Aviso caso as tabelas ainda não tenham sido criadas no Supabase */}
      {schemaMissing && (
        <div className="rounded-2xl border border-[#ff9e3b]/30 bg-[#211a14] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ffb066] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#ffb066]">
                Tabelas financeiras ainda não detectadas no Supabase
              </p>
              <p className="text-[11px] text-[#d1c8d4]">
                Execute a migration{" "}
                <code className="px-1 py-0.5 rounded bg-black/30 text-[#bba0c1]">
                  supabase/migrations/20261118_financial_module.sql
                </code>{" "}
                no SQL Editor do Supabase para salvar seus lançamentos e regras.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#ffb066]/80 shrink-0">
            {MIGRATION_SQL_HINT}
          </span>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-[#4a2420] bg-[#261514] px-4 py-3 text-xs text-[#e06b63] flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] underline hover:text-white"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header & Ações Principais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#33293c] pb-5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#9873a1]" />
            <h1 className="text-xl sm:text-2xl font-semibold text-[#f4eff5] tracking-tight">
              Financeiro EA REC
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#968a9c]">
            Fluxo de caixa, cálculo de lucro líquido e divisão automática dos pilares.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#33293c] bg-[#1a151f] hover:bg-[#231c29] text-[#f4eff5] text-xs font-medium transition-colors cursor-pointer active:scale-95 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#9fc193]" />
            <span>Importar Planilha (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Barra de Período (Mês / Ano Completo) e Filtros */}
      <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Seletor de Mês + Ano Completo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 mr-1 text-xs font-medium text-[#968a9c]">
              <Calendar className="w-3.5 h-3.5 text-[#9873a1]" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-[#33293c] bg-[#120e15] px-2.5 py-1 text-xs font-semibold text-[#bba0c1] focus:border-[#9873a1] focus:outline-none"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonth("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                selectedMonth === "all"
                  ? "bg-[#9873a1] text-[#120e15] border-[#9873a1]"
                  : "bg-[#120e15] text-[#968a9c] border-[#33293c] hover:text-[#f4eff5] hover:bg-[#231c29]"
              }`}
            >
              Ano Completo ({selectedYear})
            </button>

            {MONTH_NAMES_PT.map((name, idx) => {
              const m = idx + 1;
              const active = selectedMonth === m;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                    active
                      ? "bg-[#231c29] text-[#bba0c1] border-[#9873a1]/70 font-semibold shadow-sm"
                      : "bg-[#120e15] text-[#968a9c] border-[#33293c] hover:text-[#f4eff5] hover:bg-[#1a151f]"
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros por Tipo, Categoria, Status e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-3 border-t border-[#33293c]/60">
          {/* Tipo */}
          <div className="lg:col-span-3 inline-flex rounded-xl bg-[#120e15] border border-[#33293c] p-0.5 text-[11px]">
            {(
              [
                { value: "all", label: "Todos" },
                { value: "entrada", label: "Entradas" },
                { value: "saida", label: "Saídas" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  typeFilter === opt.value
                    ? "bg-[#231c29] text-[#bba0c1] font-semibold shadow-sm"
                    : "text-[#968a9c] hover:text-[#f4eff5]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Categoria */}
          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as "all" | FinancialCategory)
              }
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
            >
              <option value="all">Todas as categorias</option>
              <option value="Receita">Receita</option>
              <option value="Custo Fixo">Custo Fixo</option>
              <option value="Custo Variável">Custo Variável</option>
            </select>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "all" | "confirmed" | "Pendente"
                )
              }
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] px-3 py-2 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="confirmed">Confirmados</option>
              <option value="Pendente">Pendentes</option>
            </select>
          </div>

          {/* Busca */}
          <div className="lg:col-span-4 relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e6375] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar descrição ou trabalho..."
              className="w-full rounded-xl border border-[#33293c] bg-[#120e15] py-2 pl-9 pr-3 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4 Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Entradas Confirmadas */}
        <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#968a9c]">
              Entradas Confirmadas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#162017] border border-[#273829] flex items-center justify-center text-[#9fc193]">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#9fc193] tabular-nums">
            {formatBRL(summary.confirmedIncome)}
          </p>
          <p className="text-[11px] text-[#968a9c] tabular-nums">
            A Receber (Pendente):{" "}
            <span className="text-[#ffb066] font-medium">
              {formatBRL(summary.pendingIncome)}
            </span>
          </p>
        </div>

        {/* Saídas Pagas */}
        <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#968a9c]">
              Saídas Pagas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#261514] border border-[#4a2420] flex items-center justify-center text-[#e06b63]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#e06b63] tabular-nums">
            {formatBRL(summary.paidExpenses)}
          </p>
          <p className="text-[11px] text-[#968a9c] tabular-nums">
            A Pagar (Pendente):{" "}
            <span className="text-[#ffb066] font-medium">
              {formatBRL(summary.pendingExpenses)}
            </span>
          </p>
        </div>

        {/* Saldo Líquido (Lucro) */}
        <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#968a9c]">
              Saldo Líquido (Lucro)
            </span>
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                summary.netBalance >= 0
                  ? "bg-[#162017] border-[#273829] text-[#9fc193]"
                  : "bg-[#261514] border-[#4a2420] text-[#e06b63]"
              }`}
            >
              {summary.netBalance >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold tabular-nums ${
              summary.netBalance >= 0 ? "text-[#9fc193]" : "text-[#e06b63]"
            }`}
          >
            {formatBRL(summary.netBalance)}
          </p>
          <p className="text-[11px] text-[#968a9c] tabular-nums">
            Projetado (com pendentes):{" "}
            <span className="text-[#bba0c1] font-medium">
              {formatBRL(summary.projectedBalance)}
            </span>
          </p>
        </div>

        {/* Margem Líquida */}
        <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#968a9c]">
              Margem Líquida
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#bba0c1]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#f4eff5] tabular-nums">
            {summary.netMargin.toFixed(1)}%
          </p>
          <p className="text-[11px] text-[#968a9c] tabular-nums truncate">
            Fixo: {formatBRL(summary.paidFixedCosts)} • Var:{" "}
            {formatBRL(summary.paidVariableCosts)}
          </p>
        </div>
      </div>

      {/* Card: Cálculo de Lucro & Divisão dos Pilares */}
      <div className="rounded-2xl border border-[#33293c] bg-[#16121b] p-5 shadow-lg space-y-4">
        <div className="h-1 bg-gradient-to-r from-[#9873a1] to-[#bba0c1] rounded-full w-full -mt-1" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
              Cálculo de Lucro &amp; Divisão dos Pilares — {periodLabel}
            </h2>
            <p className="text-[11px] text-[#968a9c] mt-0.5">
              {summary.netBalance > 0
                ? `Distribuição automática aplicada sobre o saldo líquido positivo de ${formatBRL(
                    summary.netBalance
                  )}.`
                : "Os pilares serão distribuídos automaticamente assim que o saldo líquido confirmado do período ficar positivo."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsPillarsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#120e15] hover:bg-[#231c29] text-xs font-medium text-[#bba0c1] hover:text-[#f4eff5] transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#9873a1]" />
              <span>Editar %</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                copiedWhatsApp
                  ? "bg-[#162017] border-[#273829] text-[#9fc193]"
                  : "bg-[#120e15] border-[#33293c] hover:bg-[#231c29] text-[#f4eff5]"
              }`}
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#9fc193]" />
                  <span>Copiar Resumo WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Barra de proporção visual */}
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-[#120e15] border border-[#33293c] flex">
          {pillarDivision.map((pillar) => (
            <div
              key={pillar.id}
              style={{
                width: `${pillar.percentage}%`,
                backgroundColor: pillar.color,
              }}
              title={`${pillar.name}: ${pillar.percentage}%`}
              className="h-full transition-all duration-300"
            />
          ))}
        </div>

        {/* Cards individuais dos Pilares */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pillarDivision.map((pillar) => (
            <div
              key={pillar.id}
              className="rounded-xl border border-[#33293c] bg-[#120e15] p-3.5 space-y-1.5 hover:border-[#9873a1]/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: pillar.color }}
                  />
                  <span className="text-xs font-medium text-[#d1c8d4] truncate">
                    {pillar.name}
                  </span>
                </div>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#231c29] text-[#bba0c1] tabular-nums shrink-0">
                  {pillar.percentage}%
                </span>
              </div>
              <p className="text-lg font-bold text-[#f4eff5] tabular-nums">
                {formatBRL(pillar.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico Mensal (Entradas vs Saídas) & Composição de Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Gráfico Mensal */}
        <div className="lg:col-span-8 rounded-2xl border border-[#33293c] bg-[#16121b] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#9873a1]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
                Entradas vs. Saídas ({selectedYear})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#968a9c]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#9fc193]" />
                Entradas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#e06b63]" />
                Saídas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-44 pt-4 border-b border-[#33293c]/60 pb-2">
            {monthlySeries.map((pt) => {
              const totalInMonth = pt.confirmedIncome + pt.pendingIncome;
              const totalOutMonth = pt.paidExpenses + pt.pendingExpenses;
              const inHeight = Math.max(
                totalInMonth > 0 ? 6 : 0,
                Math.round((totalInMonth / maxMonthlyValue) * 100)
              );
              const outHeight = Math.max(
                totalOutMonth > 0 ? 6 : 0,
                Math.round((totalOutMonth / maxMonthlyValue) * 100)
              );
              const isActive = selectedMonth === pt.monthIndex;

              return (
                <button
                  key={pt.monthIndex}
                  type="button"
                  onClick={() =>
                    setSelectedMonth(isActive ? "all" : pt.monthIndex)
                  }
                  className={`group flex flex-col items-center justify-end h-full gap-1.5 rounded-lg px-0.5 py-1 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#231c29]/80 ring-1 ring-[#9873a1]/60"
                      : "hover:bg-[#1a151f]"
                  }`}
                  title={`${pt.fullLabel}: Entradas ${formatBRL(
                    totalInMonth
                  )} | Saídas ${formatBRL(totalOutMonth)}`}
                >
                  <div className="flex items-end justify-center gap-0.5 sm:gap-1 w-full flex-1">
                    <div
                      className="w-2 sm:w-2.5 rounded-t bg-[#9fc193]/85 group-hover:bg-[#9fc193] transition-all duration-300"
                      style={{ height: `${inHeight}%` }}
                    />
                    <div
                      className="w-2 sm:w-2.5 rounded-t bg-[#e06b63]/85 group-hover:bg-[#e06b63] transition-all duration-300"
                      style={{ height: `${outHeight}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? "text-[#bba0c1] font-bold" : "text-[#968a9c]"
                    }`}
                  >
                    {pt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#6e6375]">
            Dica: toque em qualquer mês no gráfico para filtrar rapidamente o painel.
          </p>
        </div>

        {/* Composição de Custos */}
        <div className="lg:col-span-4 rounded-2xl border border-[#33293c] bg-[#16121b] p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#9873a1]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
                Composição de Saídas
              </h3>
            </div>

            <div className="space-y-3">
              {/* Custo Fixo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#d1c8d4] font-medium">Custo Fixo</span>
                  <span className="text-[#bba0c1] font-semibold tabular-nums">
                    {formatBRL(summary.totalFixedCosts)} ({fixedPercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#120e15] border border-[#33293c] overflow-hidden">
                  <div
                    className="h-full bg-[#9873a1] transition-all duration-300"
                    style={{ width: `${fixedPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6e6375] tabular-nums">
                  Pago: {formatBRL(summary.paidFixedCosts)}
                </p>
              </div>

              {/* Custo Variável */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#d1c8d4] font-medium">Custo Variável</span>
                  <span className="text-[#e06b63] font-semibold tabular-nums">
                    {formatBRL(summary.totalVariableCosts)} ({variablePercent.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#120e15] border border-[#33293c] overflow-hidden">
                  <div
                    className="h-full bg-[#e06b63] transition-all duration-300"
                    style={{ width: `${variablePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6e6375] tabular-nums">
                  Pago: {formatBRL(summary.paidVariableCosts)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-3 flex items-center justify-between text-xs">
            <span className="text-[#968a9c]">Total de Saídas (Período)</span>
            <span className="font-bold text-[#f4eff5] tabular-nums">
              {formatBRL(summary.totalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Fluxo de Caixa */}
      <div className="rounded-2xl border border-[#33293c] bg-[#16121b] shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#33293c] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f4eff5]">
              Fluxo de Caixa — {periodLabel}
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#231c29] border border-[#33293c] text-[#bba0c1] tabular-nums">
              {filteredTransactions.length}
            </span>
          </div>
          <span className="text-[11px] text-[#6e6375] hidden sm:inline">
            Clique no badge de status para confirmar recebimento/pagamento em 1 clique
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-2.5">
            <Wallet className="w-7 h-7 text-[#6e6375] mx-auto" />
            <p className="text-xs sm:text-sm font-medium text-[#f4eff5]">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditingTx(null);
                  setIsTxModalOpen(true);
                }}
                className="text-xs text-[#9873a1] hover:underline font-medium cursor-pointer"
              >
                + Adicionar lançamento
              </button>
              <span className="text-[#33293c]">•</span>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="text-xs text-[#9fc193] hover:underline font-medium cursor-pointer"
              >
                Importar planilha .xlsx
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#33293c] bg-[#120e15] text-[10px] uppercase tracking-wider text-[#968a9c]">
                  <th className="py-3 px-4 font-semibold">Data</th>
                  <th className="py-3 px-4 font-semibold">Descrição</th>
                  <th className="py-3 px-4 font-semibold">Categoria</th>
                  <th className="py-3 px-4 font-semibold text-right">Entrada (R$)</th>
                  <th className="py-3 px-4 font-semibold text-right">Saída (R$)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#33293c]/60 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#1a151f]/80 transition-colors group"
                  >
                    <td className="py-3 px-4 tabular-nums text-[#968a9c] whitespace-nowrap">
                      {formatFinanceDateDisplay(tx.date)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-[#f4eff5]">
                          {tx.description}
                        </span>
                        {tx.event && (
                          <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded bg-[#231c29] border border-[#33293c] text-[10px] text-[#bba0c1]">
                            <Film className="w-2.5 h-2.5 text-[#9873a1]" />
                            <span>
                              {tx.event.title}
                              {tx.event.client?.name ? ` • ${tx.event.client.name}` : ""}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          tx.category === "Receita"
                            ? "bg-[#162017]/60 text-[#9fc193] border-[#273829]"
                            : tx.category === "Custo Fixo"
                            ? "bg-[#231c29] text-[#bba0c1] border-[#33293c]"
                            : "bg-[#211a14]/80 text-[#d48970] border-[#4a2420]"
                        }`}
                      >
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-semibold text-[#9fc193]">
                      {tx.type === "entrada" ? formatBRL(Number(tx.amount)) : "—"}
                    </td>

                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap font-semibold text-[#e06b63]">
                      {tx.type === "saida" ? formatBRL(Number(tx.amount)) : "—"}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(tx)}
                        title="Clique para alternar entre Pendente e Confirmado"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer active:scale-95 ${
                          tx.status === "Pendente"
                            ? "bg-[#211a14] text-[#ffb066] border-[#ff9e3b]/30 hover:border-[#ff9e3b]/70"
                            : tx.status === "Recebido"
                            ? "bg-[#162017] text-[#9fc193] border-[#273829] hover:border-[#9fc193]/60"
                            : "bg-[#231c29] text-[#bba0c1] border-[#33293c] hover:border-[#9873a1]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === "Pendente"
                              ? "bg-[#ffb066]"
                              : tx.status === "Recebido"
                              ? "bg-[#9fc193]"
                              : "bg-[#bba0c1]"
                          }`}
                        />
                        <span>{tx.status}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setIsTxModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors cursor-pointer"
                          title="Editar lançamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateNextMonth(tx)}
                          disabled={duplicatingId === tx.id}
                          className="p-1.5 rounded-lg text-[#968a9c] hover:text-[#bba0c1] hover:bg-[#231c29] transition-colors cursor-pointer disabled:opacity-40"
                          title="Duplicar para o próximo mês"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeletingTx({
                              id: tx.id,
                              description: tx.description,
                            })
                          }
                          className="p-1.5 rounded-lg text-[#968a9c] hover:text-[#e06b63] hover:bg-[#261514] transition-colors cursor-pointer"
                          title="Excluir lançamento"
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
        )}
      </div>

      {/* Modais Lazy-Loaded */}
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
              for (const item of savedItems) {
                byId.set(item.id, item);
              }
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
          title="Excluir Lançamento"
          description={`Tem certeza que deseja excluir "${deletingTx.description}" do fluxo de caixa?`}
          confirmLabel="Sim, Excluir"
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
