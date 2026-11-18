"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  Database,
  FinancialCategory,
  FinancialStatus,
  FinancialTransactionType,
  FinancialTransactionWithEvent,
  ProfitPillarRule,
} from "@/types/database";
import {
  DEFAULT_PILLAR_RULES,
  getToggledStatus,
} from "@/lib/finance/calculations";

export type FinancialTransactionInsert =
  Database["public"]["Tables"]["financial_transactions"]["Insert"];
export type FinancialTransactionUpdate =
  Database["public"]["Tables"]["financial_transactions"]["Update"];

export interface TransactionInput {
  date: string; // YYYY-MM-DD
  description: string;
  type: FinancialTransactionType;
  category: FinancialCategory;
  amount: number;
  status: FinancialStatus;
  eventId?: string | null;
}

export interface PillarRuleInput {
  id?: string;
  name: string;
  percentage: number;
  sort_order: number;
  color: string;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the table|relation .* does not exist/i.test(msg)
  );
}

function normalizeDateOnly(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTransactionSemantics(input: {
  type: FinancialTransactionType;
  category: FinancialCategory;
  status: FinancialStatus;
}): {
  type: FinancialTransactionType;
  category: FinancialCategory;
  status: FinancialStatus;
} {
  if (input.type === "entrada") {
    return {
      type: "entrada",
      category: "Receita",
      status: input.status === "Recebido" ? "Recebido" : "Pendente",
    };
  }
  return {
    type: "saida",
    category: input.category === "Custo Fixo" ? "Custo Fixo" : "Custo Variável",
    status: input.status === "Pago" ? "Pago" : "Pendente",
  };
}

function buildFallbackPillars(userId: string): ProfitPillarRule[] {
  const now = new Date().toISOString();
  return DEFAULT_PILLAR_RULES.map((rule, idx) => ({
    id: `default-pillar-${idx + 1}`,
    user_id: userId,
    name: rule.name,
    percentage: rule.percentage,
    sort_order: rule.sort_order,
    color: rule.color,
    created_at: now,
    updated_at: now,
  }));
}

export async function getFinancialDataAction(): Promise<{
  transactions: FinancialTransactionWithEvent[];
  pillars: ProfitPillarRule[];
  schemaMissing: boolean;
  error?: string;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      transactions: [],
      pillars: [],
      schemaMissing: false,
      error: "Não autenticado.",
    };
  }

  const supabase = await createClient();

  const [txRes, pillarsRes] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("*, event:events(id, title, client:clients(id, name))")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profit_pillar_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (isMissingTableError(txRes.error) || isMissingTableError(pillarsRes.error)) {
    return {
      transactions: [],
      pillars: buildFallbackPillars(user.id),
      schemaMissing: true,
    };
  }

  if (txRes.error) {
    return {
      transactions: [],
      pillars: buildFallbackPillars(user.id),
      schemaMissing: false,
      error: txRes.error.message,
    };
  }

  let pillars = (pillarsRes.data || []) as ProfitPillarRule[];

  // Seed automático (fallback): se o usuário ainda não tem regras, cria as 4 regras padrão (20/20/30/30)
  if (!pillarsRes.error && pillars.length === 0) {
    const seedPayload = DEFAULT_PILLAR_RULES.map((rule) => ({
      user_id: user.id,
      name: rule.name,
      percentage: rule.percentage,
      sort_order: rule.sort_order,
      color: rule.color,
    }));

    const { data: seeded, error: seedError } = await supabase
      .from("profit_pillar_rules")
      .insert(seedPayload)
      .select("*")
      .order("sort_order", { ascending: true });

    if (!seedError && seeded) {
      pillars = seeded as ProfitPillarRule[];
    } else {
      pillars = buildFallbackPillars(user.id);
    }
  }

  return {
    transactions: (txRes.data || []) as unknown as FinancialTransactionWithEvent[],
    pillars,
    schemaMissing: false,
  };
}

export async function getMonthTransactionsForDashboard(
  year: number,
  month: number
): Promise<{
  transactions: FinancialTransactionWithEvent[];
  schemaMissing: boolean;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { transactions: [], schemaMissing: false };
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*, event:events(id, title, client:clients(id, name))")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (isMissingTableError(error)) {
    return { transactions: [], schemaMissing: true };
  }

  if (error) {
    return { transactions: [], schemaMissing: false };
  }

  return {
    transactions: (data || []) as unknown as FinancialTransactionWithEvent[],
    schemaMissing: false,
  };
}

export async function createTransactionAction(input: TransactionInput) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const description = input.description?.trim();
  if (!description) {
    return { error: "A descrição do lançamento é obrigatória." };
  }

  const dateOnly = normalizeDateOnly(input.date);
  if (!dateOnly) {
    return { error: "Informe uma data válida para o lançamento." };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Informe um valor válido maior ou igual a zero." };
  }

  const supabase = await createClient();

  if (input.eventId) {
    const { data: eventOwner, error: eventErr } = await supabase
      .from("events")
      .select("id")
      .eq("id", input.eventId)
      .eq("user_id", user.id)
      .single();

    if (eventErr || !eventOwner) {
      return { error: "Trabalho vinculado não encontrado ou inválido." };
    }
  }

  const semantics = normalizeTransactionSemantics({
    type: input.type,
    category: input.category,
    status: input.status,
  });

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      user_id: user.id,
      event_id: input.eventId || null,
      date: dateOnly,
      description,
      type: semantics.type,
      category: semantics.category,
      amount: Math.round(amount * 100) / 100,
      status: semantics.status,
    })
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { data: data as unknown as FinancialTransactionWithEvent };
}

export async function createInstallmentTransactionsAction(inputs: TransactionInput[]) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!inputs.length) {
    return { error: "Nenhum lançamento informado." };
  }

  const supabase = await createClient();

  // Valida eventIds únicos (BOLA/IDOR)
  const uniqueEventIds = Array.from(
    new Set(inputs.map((i) => i.eventId).filter((v): v is string => Boolean(v)))
  );
  if (uniqueEventIds.length > 0) {
    const { data: validEvents } = await supabase
      .from("events")
      .select("id")
      .in("id", uniqueEventIds)
      .eq("user_id", user.id);

    if (!validEvents || validEvents.length !== uniqueEventIds.length) {
      return { error: "Trabalho vinculado não encontrado ou inválido." };
    }
  }

  const rows: FinancialTransactionInsert[] = [];
  for (const item of inputs) {
    const description = item.description?.trim();
    const dateOnly = normalizeDateOnly(item.date);
    const amount = Number(item.amount);
    if (!description || !dateOnly || !Number.isFinite(amount) || amount < 0) {
      return { error: "Preencha descrição, data e valor válidos para todas as parcelas." };
    }
    const semantics = normalizeTransactionSemantics({
      type: item.type,
      category: item.category,
      status: item.status,
    });
    rows.push({
      user_id: user.id,
      event_id: item.eventId || null,
      date: dateOnly,
      description,
      type: semantics.type,
      category: semantics.category,
      amount: Math.round(amount * 100) / 100,
      status: semantics.status,
    });
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert(rows)
    .select("*, event:events(id, title, client:clients(id, name))");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { data: (data || []) as unknown as FinancialTransactionWithEvent[] };
}

export async function updateTransactionAction(
  id: string,
  input: Partial<TransactionInput>
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !existing) {
    return { error: "Lançamento não encontrado." };
  }

  const nextType = input.type ?? existing.type;
  const nextCategory = input.category ?? existing.category;
  const nextStatus = input.status ?? existing.status;

  const semantics = normalizeTransactionSemantics({
    type: nextType,
    category: nextCategory,
    status: nextStatus,
  });

  const payload: FinancialTransactionUpdate = {
    type: semantics.type,
    category: semantics.category,
    status: semantics.status,
  };

  if (input.description !== undefined) {
    const trimmed = input.description.trim();
    if (!trimmed) return { error: "A descrição do lançamento é obrigatória." };
    payload.description = trimmed;
  }

  if (input.date !== undefined) {
    const dateOnly = normalizeDateOnly(input.date);
    if (!dateOnly) return { error: "Data inválida." };
    payload.date = dateOnly;
  }

  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "Valor inválido." };
    }
    payload.amount = Math.round(amount * 100) / 100;
  }

  if (input.eventId !== undefined) {
    if (input.eventId) {
      const { data: eventOwner, error: eventErr } = await supabase
        .from("events")
        .select("id")
        .eq("id", input.eventId)
        .eq("user_id", user.id)
        .single();

      if (eventErr || !eventOwner) {
        return { error: "Trabalho vinculado não encontrado ou inválido." };
      }
      payload.event_id = input.eventId;
    } else {
      payload.event_id = null;
    }
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  return { data: data as unknown as FinancialTransactionWithEvent };
}

export async function toggleTransactionStatusAction(
  id: string,
  currentStatus: FinancialStatus,
  type: FinancialTransactionType
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const nextStatus = getToggledStatus(currentStatus, type);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ status: nextStatus })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { data: data as unknown as FinancialTransactionWithEvent };
}

export async function deleteTransactionAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function bulkImportTransactionsAction(items: TransactionInput[]) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!items || items.length === 0) {
    return { error: "Nenhum lançamento válido selecionado para importação." };
  }

  const rows: FinancialTransactionInsert[] = [];
  for (const item of items) {
    const description = item.description?.trim();
    const dateOnly = normalizeDateOnly(item.date);
    const amount = Number(item.amount);
    if (!description || !dateOnly || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    const semantics = normalizeTransactionSemantics({
      type: item.type,
      category: item.category,
      status: item.status,
    });
    rows.push({
      user_id: user.id,
      event_id: null,
      date: dateOnly,
      description,
      type: semantics.type,
      category: semantics.category,
      amount: Math.round(amount * 100) / 100,
      status: semantics.status,
    });
  }

  if (rows.length === 0) {
    return { error: "Nenhum lançamento válido encontrado na planilha." };
  }

  const supabase = await createClient();
  const insertedAll: FinancialTransactionWithEvent[] = [];
  const chunkSize = 200;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert(chunk)
      .select("*, event:events(id, title, client:clients(id, name))");

    if (error) {
      return { error: error.message };
    }
    if (data) {
      insertedAll.push(...(data as unknown as FinancialTransactionWithEvent[]));
    }
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { data: insertedAll, count: insertedAll.length };
}

export async function updatePillarRulesAction(rules: PillarRuleInput[]) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!rules || rules.length === 0) {
    return { error: "Configure ao menos 1 pilar de divisão." };
  }

  const cleaned = rules.map((r, index) => ({
    name: r.name.trim(),
    percentage: Math.round((Number(r.percentage) || 0) * 100) / 100,
    sort_order: Number.isFinite(Number(r.sort_order)) ? Number(r.sort_order) : index + 1,
    color: r.color?.trim() || "#9873a1",
  }));

  if (cleaned.some((r) => !r.name)) {
    return { error: "Todos os pilares devem possuir um nome." };
  }

  if (cleaned.some((r) => r.percentage < 0 || r.percentage > 100)) {
    return { error: "Os percentuais devem estar entre 0% e 100%." };
  }

  const totalPercentage = cleaned.reduce((acc, r) => acc + r.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.05) {
    return {
      error: `A soma dos pilares deve ser exatamente 100% (atualmente: ${totalPercentage.toFixed(1)}%).`,
    };
  }

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("profit_pillar_rules")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const insertPayload = cleaned.map((r) => ({
    user_id: user.id,
    name: r.name,
    percentage: r.percentage,
    sort_order: r.sort_order,
    color: r.color,
  }));

  const { data, error: insertError } = await supabase
    .from("profit_pillar_rules")
    .insert(insertPayload)
    .select("*")
    .order("sort_order", { ascending: true });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
  return { data: (data || []) as ProfitPillarRule[] };
}
