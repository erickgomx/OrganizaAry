import {
  FinancialCategory,
  FinancialStatus,
  FinancialTransaction,
  FinancialTransactionType,
} from "@/types/database";
import { formatBRL } from "@/lib/utils";

export interface PillarRuleShape {
  id: string;
  name: string;
  percentage: number;
  sort_order: number;
  color: string;
}

export const DEFAULT_PILLAR_RULES: Omit<PillarRuleShape, "id">[] = [
  {
    name: "Reserva de Emergência",
    percentage: 20,
    sort_order: 1,
    color: "#9873a1",
  },
  {
    name: "Investimento",
    percentage: 20,
    sort_order: 2,
    color: "#7c9eb2",
  },
  {
    name: "Pró-labore Erick",
    percentage: 30,
    sort_order: 3,
    color: "#9fc193",
  },
  {
    name: "Pró-labore Ary",
    percentage: 30,
    sort_order: 4,
    color: "#e09f67",
  },
];

export const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const MONTH_SHORT_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export interface FinancialSummary {
  confirmedIncome: number;
  pendingIncome: number;
  totalIncome: number;
  paidExpenses: number;
  pendingExpenses: number;
  totalExpenses: number;
  paidFixedCosts: number;
  totalFixedCosts: number;
  paidVariableCosts: number;
  totalVariableCosts: number;
  netBalance: number;
  projectedBalance: number;
  netMargin: number;
}

export interface PillarDivisionItem {
  id: string;
  name: string;
  percentage: number;
  color: string;
  sort_order: number;
  amount: number;
}

export interface MonthlySeriesPoint {
  monthIndex: number; // 1..12
  label: string;
  fullLabel: string;
  confirmedIncome: number;
  pendingIncome: number;
  paidExpenses: number;
  pendingExpenses: number;
  fixedCosts: number;
  variableCosts: number;
  netBalance: number;
}

/**
 * Extrai ano, mês (1-12) e dia de uma string YYYY-MM-DD sem deslocamento de fuso horário.
 */
export function extractDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().slice(0, 10);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Formata data YYYY-MM-DD para DD/MM/YYYY de forma segura.
 */
export function formatFinanceDateDisplay(dateStr: string): string {
  const parts = extractDateParts(dateStr);
  if (!parts) return dateStr || "";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
}

/**
 * Formata data YYYY-MM-DD para exibição compacta DD/MM.
 */
export function formatFinanceDateShort(dateStr: string): string {
  const parts = extractDateParts(dateStr);
  if (!parts) return dateStr || "";
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

/**
 * Adiciona N meses a uma data YYYY-MM-DD preservando o dia ou ajustando ao último dia do mês alvo.
 */
export function addMonthsToIsoDate(dateStr: string, monthsToAdd: number): string {
  const parts = extractDateParts(dateStr);
  if (!parts) return dateStr;
  const totalMonths = parts.year * 12 + (parts.month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12; // 0..11
  const lastDayOfTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
  const targetDay = Math.min(parts.day, lastDayOfTargetMonth);

  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/**
 * Filtra transações pelo período (mês específico 1..12 ou "all" para o ano inteiro).
 */
export function filterTransactionsByPeriod<T extends Pick<FinancialTransaction, "date">>(
  transactions: T[],
  month: number | "all",
  year: number
): T[] {
  return transactions.filter((tx) => {
    const parts = extractDateParts(tx.date);
    if (!parts) return false;
    if (parts.year !== year) return false;
    if (month !== "all" && parts.month !== month) return false;
    return true;
  });
}

/**
 * Calcula KPIs consolidados de fluxo de caixa.
 */
export function calculateFinancialSummary(
  transactions: Pick<FinancialTransaction, "type" | "category" | "amount" | "status">[]
): FinancialSummary {
  let confirmedIncome = 0;
  let pendingIncome = 0;
  let paidExpenses = 0;
  let pendingExpenses = 0;
  let paidFixedCosts = 0;
  let totalFixedCosts = 0;
  let paidVariableCosts = 0;
  let totalVariableCosts = 0;

  for (const tx of transactions) {
    const val = Number(tx.amount) || 0;

    if (tx.type === "entrada") {
      if (tx.status === "Recebido") {
        confirmedIncome += val;
      } else {
        pendingIncome += val;
      }
    } else {
      if (tx.status === "Pago") {
        paidExpenses += val;
      } else {
        pendingExpenses += val;
      }

      if (tx.category === "Custo Fixo") {
        totalFixedCosts += val;
        if (tx.status === "Pago") paidFixedCosts += val;
      } else if (tx.category === "Custo Variável") {
        totalVariableCosts += val;
        if (tx.status === "Pago") paidVariableCosts += val;
      }
    }
  }

  const totalIncome = confirmedIncome + pendingIncome;
  const totalExpenses = paidExpenses + pendingExpenses;
  const netBalance = confirmedIncome - paidExpenses;
  const projectedBalance = totalIncome - totalExpenses;
  const netMargin = confirmedIncome > 0 ? (netBalance / confirmedIncome) * 100 : 0;

  return {
    confirmedIncome: roundMoney(confirmedIncome),
    pendingIncome: roundMoney(pendingIncome),
    totalIncome: roundMoney(totalIncome),
    paidExpenses: roundMoney(paidExpenses),
    pendingExpenses: roundMoney(pendingExpenses),
    totalExpenses: roundMoney(totalExpenses),
    paidFixedCosts: roundMoney(paidFixedCosts),
    totalFixedCosts: roundMoney(totalFixedCosts),
    paidVariableCosts: roundMoney(paidVariableCosts),
    totalVariableCosts: roundMoney(totalVariableCosts),
    netBalance: roundMoney(netBalance),
    projectedBalance: roundMoney(projectedBalance),
    netMargin: Number(netMargin.toFixed(1)),
  };
}

/**
 * Calcula a divisão automática do lucro líquido positivo entre os pilares configurados.
 */
export function calculatePillarDivision(
  netBalance: number,
  rules: PillarRuleShape[]
): PillarDivisionItem[] {
  const ordered = [...rules].sort((a, b) => a.sort_order - b.sort_order);
  const distributable = netBalance > 0 ? netBalance : 0;

  return ordered.map((rule) => {
    const pct = Number(rule.percentage) || 0;
    const amount = distributable > 0 ? roundMoney((distributable * pct) / 100) : 0;
    return {
      id: rule.id,
      name: rule.name,
      percentage: pct,
      color: rule.color,
      sort_order: rule.sort_order,
      amount,
    };
  });
}

/**
 * Agrega série mensal de 12 meses para o ano selecionado.
 */
export function calculateMonthlySeries(
  transactions: Pick<FinancialTransaction, "date" | "type" | "category" | "amount" | "status">[],
  year: number
): MonthlySeriesPoint[] {
  const series: MonthlySeriesPoint[] = MONTH_SHORT_PT.map((label, idx) => ({
    monthIndex: idx + 1,
    label,
    fullLabel: MONTH_NAMES_PT[idx],
    confirmedIncome: 0,
    pendingIncome: 0,
    paidExpenses: 0,
    pendingExpenses: 0,
    fixedCosts: 0,
    variableCosts: 0,
    netBalance: 0,
  }));

  for (const tx of transactions) {
    const parts = extractDateParts(tx.date);
    if (!parts || parts.year !== year) continue;
    const bucket = series[parts.month - 1];
    if (!bucket) continue;

    const val = Number(tx.amount) || 0;
    if (tx.type === "entrada") {
      if (tx.status === "Recebido") {
        bucket.confirmedIncome += val;
      } else {
        bucket.pendingIncome += val;
      }
    } else {
      if (tx.status === "Pago") {
        bucket.paidExpenses += val;
      } else {
        bucket.pendingExpenses += val;
      }
      if (tx.category === "Custo Fixo") {
        bucket.fixedCosts += val;
      } else if (tx.category === "Custo Variável") {
        bucket.variableCosts += val;
      }
    }
  }

  return series.map((item) => ({
    ...item,
    confirmedIncome: roundMoney(item.confirmedIncome),
    pendingIncome: roundMoney(item.pendingIncome),
    paidExpenses: roundMoney(item.paidExpenses),
    pendingExpenses: roundMoney(item.pendingExpenses),
    fixedCosts: roundMoney(item.fixedCosts),
    variableCosts: roundMoney(item.variableCosts),
    netBalance: roundMoney(item.confirmedIncome - item.paidExpenses),
  }));
}

/**
 * Normaliza categoria conforme tipo do lançamento.
 */
export function getDefaultCategoryForType(type: FinancialTransactionType): FinancialCategory {
  return type === "entrada" ? "Receita" : "Custo Variável";
}

/**
 * Retorna próximo status ao alternar clique rápido no badge.
 */
export function getToggledStatus(
  currentStatus: FinancialStatus,
  type: FinancialTransactionType
): FinancialStatus {
  if (currentStatus === "Pendente") {
    return type === "entrada" ? "Recebido" : "Pago";
  }
  return "Pendente";
}

/**
 * Gera texto formatado pronto para enviar via WhatsApp com a divisão dos pilares.
 */
export function buildWhatsAppFinancialSummary(params: {
  periodLabel: string;
  summary: FinancialSummary;
  pillars: PillarDivisionItem[];
}): string {
  const { periodLabel, summary, pillars } = params;
  const lines: string[] = [
    `*Resumo Financeiro — ${periodLabel}*`,
    ``,
    `Entradas confirmadas: *${formatBRL(summary.confirmedIncome)}*`,
  ];

  if (summary.pendingIncome > 0) {
    lines.push(`A receber (pendente): ${formatBRL(summary.pendingIncome)}`);
  }

  lines.push(`Saídas pagas: *${formatBRL(summary.paidExpenses)}*`);

  if (summary.pendingExpenses > 0) {
    lines.push(`A pagar (pendente): ${formatBRL(summary.pendingExpenses)}`);
  }

  lines.push(
    `Saldo Líquido (Lucro): *${formatBRL(summary.netBalance)}* (${summary.netMargin.toFixed(1)}%)`
  );

  lines.push(``, `*Divisão dos Pilares:*`);
  for (const pillar of pillars) {
    lines.push(`• ${pillar.name} (${pillar.percentage}%): *${formatBRL(pillar.amount)}*`);
  }

  return lines.join("\n");
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
