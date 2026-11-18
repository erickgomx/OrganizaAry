"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  Wallet,
  Calendar,
  Film,
  ChevronDown,
  Split,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  createTransactionAction,
  createInstallmentTransactionsAction,
  updateTransactionAction,
  TransactionInput,
} from "@/actions/finance";
import {
  FinancialCategory,
  FinancialStatus,
  FinancialTransactionType,
  FinancialTransactionWithEvent,
} from "@/types/database";
import {
  addMonthsToIsoDate,
  getDefaultCategoryForType,
} from "@/lib/finance/calculations";
import {
  formatBRL,
  formatCurrencyInput,
  handleFormKeyDownEnterToNextField,
  parseCurrencyInput,
} from "@/lib/utils";

export interface SimpleEventOption {
  id: string;
  title: string;
  clientName?: string | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: FinancialTransactionWithEvent | null;
  events: SimpleEventOption[];
  defaultDate?: string;
  onSuccess?: (saved: FinancialTransactionWithEvent[]) => void;
}

interface InstallmentDraft {
  label: string;
  date: string;
  amount: number;
  status: FinancialStatus;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMoneyForInput(val: number): string {
  if (!val || val <= 0) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

function buildInstallmentDrafts(params: {
  baseDescription: string;
  baseDate: string;
  totalAmount: number;
  count: number;
  amountMode: "split_total" | "per_installment";
  firstStatus: FinancialStatus;
}): InstallmentDraft[] {
  const { baseDescription, baseDate, totalAmount, count, amountMode, firstStatus } = params;
  const cleanTitle = baseDescription.trim() || "Parcela";
  const drafts: InstallmentDraft[] = [];

  if (amountMode === "per_installment") {
    for (let i = 0; i < count; i++) {
      drafts.push({
        label: `${cleanTitle} ${i + 1}/${count}`,
        date: addMonthsToIsoDate(baseDate, i),
        amount: Math.round(totalAmount * 100) / 100,
        status: i === 0 ? firstStatus : "Pendente",
      });
    }
    return drafts;
  }

  const baseUnit = Math.floor((totalAmount / count) * 100) / 100;
  let allocated = 0;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const partAmount = isLast
      ? Math.round((totalAmount - allocated) * 100) / 100
      : baseUnit;
    allocated += partAmount;

    drafts.push({
      label: `${cleanTitle} ${i + 1}/${count}`,
      date: addMonthsToIsoDate(baseDate, i),
      amount: Math.max(0, partAmount),
      status: i === 0 ? firstStatus : "Pendente",
    });
  }

  return drafts;
}

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  events,
  defaultDate,
  onSuccess,
}: TransactionModalProps) {
  const isEditing = Boolean(transaction);

  const initialDate = transaction?.date?.slice(0, 10) || defaultDate || getTodayIso();
  const initialType: FinancialTransactionType = transaction?.type || "entrada";

  const [type, setType] = useState<FinancialTransactionType>(initialType);
  const [description, setDescription] = useState(transaction?.description || "");
  const [category, setCategory] = useState<FinancialCategory>(
    transaction?.category || getDefaultCategoryForType(initialType)
  );
  const [amount, setAmount] = useState<number>(
    transaction?.amount !== undefined ? Number(transaction.amount) : 0
  );
  const [displayAmount, setDisplayAmount] = useState<string>(
    formatMoneyForInput(transaction?.amount !== undefined ? Number(transaction.amount) : 0)
  );
  const [date, setDate] = useState<string>(initialDate);
  const [status, setStatus] = useState<FinancialStatus>(
    transaction?.status || (initialType === "entrada" ? "Recebido" : "Pago")
  );
  const [eventId, setEventId] = useState<string>(transaction?.event_id || "");

  // Parcelamento (apenas criação)
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [amountMode, setAmountMode] = useState<"split_total" | "per_installment">("split_total");
  const [customDrafts, setCustomDrafts] = useState<InstallmentDraft[] | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronização ao abrir/trocar transação (padrão do EventModal)
  const currentKey = isOpen
    ? `${transaction?.id || "new"}-${defaultDate || ""}`
    : "closed";
  const [prevKey, setPrevKey] = useState<string>(currentKey);

  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (isOpen) {
      const nextType: FinancialTransactionType = transaction?.type || "entrada";
      const nextAmount = transaction?.amount !== undefined ? Number(transaction.amount) : 0;
      setType(nextType);
      setDescription(transaction?.description || "");
      setCategory(transaction?.category || getDefaultCategoryForType(nextType));
      setAmount(nextAmount);
      setDisplayAmount(formatMoneyForInput(nextAmount));
      setDate(transaction?.date?.slice(0, 10) || defaultDate || getTodayIso());
      setStatus(transaction?.status || (nextType === "entrada" ? "Recebido" : "Pago"));
      setEventId(transaction?.event_id || "");
      setEnableInstallments(false);
      setInstallmentsCount(2);
      setAmountMode("split_total");
      setCustomDrafts(null);
      setError(null);
    }
  }

  if (!isOpen) return null;

  const generatedDrafts = enableInstallments
    ? customDrafts ??
      buildInstallmentDrafts({
        baseDescription: description,
        baseDate: date,
        totalAmount: amount,
        count: installmentsCount,
        amountMode,
        firstStatus: status,
      })
    : [];

  const handleTypeChange = (nextType: FinancialTransactionType) => {
    setType(nextType);
    if (nextType === "entrada") {
      setCategory("Receita");
      setStatus((prev) => (prev === "Pendente" ? "Pendente" : "Recebido"));
    } else {
      setCategory((prev) => (prev === "Custo Fixo" ? "Custo Fixo" : "Custo Variável"));
      setStatus((prev) => (prev === "Pendente" ? "Pendente" : "Pago"));
    }
    setCustomDrafts(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setDisplayAmount(formatted);
    setAmount(parseCurrencyInput(formatted));
    setCustomDrafts(null);
  };

  const handleAmountBlur = () => {
    if (!displayAmount) return;
    const num = parseCurrencyInput(displayAmount);
    setDisplayAmount(num > 0 ? formatMoneyForInput(num) : "0,00");
  };

  const handleInstallmentCountChange = (nextCount: number) => {
    const clamped = Math.max(2, Math.min(12, nextCount));
    setInstallmentsCount(clamped);
    setCustomDrafts(null);
  };

  const handleEditDraft = (
    idx: number,
    patch: Partial<InstallmentDraft>
  ) => {
    const base = [...generatedDrafts];
    base[idx] = { ...base[idx], ...patch };
    setCustomDrafts(base);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && transaction) {
        const payload: Partial<TransactionInput> = {
          date,
          description,
          type,
          category,
          amount,
          status,
          eventId: eventId || null,
        };
        const res = await updateTransactionAction(transaction.id, payload);
        if (res.error) throw new Error(res.error);
        if (res.data) onSuccess?.([res.data]);
        onClose();
        return;
      }

      if (enableInstallments) {
        const inputs: TransactionInput[] = generatedDrafts.map((d) => ({
          date: d.date,
          description: d.label,
          type,
          category,
          amount: d.amount,
          status: d.status,
          eventId: eventId || null,
        }));
        const res = await createInstallmentTransactionsAction(inputs);
        if (res.error) throw new Error(res.error);
        if (res.data) onSuccess?.(res.data);
        onClose();
        return;
      }

      const payload: TransactionInput = {
        date,
        description,
        type,
        category,
        amount,
        status,
        eventId: eventId || null,
      };
      const res = await createTransactionAction(payload);
      if (res.error) throw new Error(res.error);
      if (res.data) onSuccess?.([res.data]);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar lançamento.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#9873a1]" />
            {isEditing ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/20 p-3 text-xs text-red-300 border border-red-900/30">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDownEnterToNextField}
          className="flex flex-col gap-4"
        >
          {/* Seletor Entrada / Saída */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#120e15] border border-[#33293c]">
            <button
              type="button"
              onClick={() => handleTypeChange("entrada")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                type === "entrada"
                  ? "bg-[#162017] text-[#9fc193] border border-[#273829] shadow-sm"
                  : "text-[#968a9c] hover:text-[#f4eff5]"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Entrada (Receita)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("saida")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                type === "saida"
                  ? "bg-[#261514] text-[#e06b63] border border-[#4a2420] shadow-sm"
                  : "text-[#968a9c] hover:text-[#f4eff5]"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Saída (Custo)</span>
            </button>
          </div>

          {/* Descrição */}
          <div>
            <label
              htmlFor="tx-description"
              className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
            >
              Descrição *
            </label>
            <input
              id="tx-description"
              type="text"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setCustomDrafts(null);
              }}
              placeholder={
                type === "entrada"
                  ? "Ex: Casamento Joelma, Ensaio Gestante Ana"
                  : "Ex: Aluguel Estúdio, Taxa MEI, Nubank"
              }
              className="w-full min-h-[42px] rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 px-3.5 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-amount"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                {enableInstallments && amountMode === "per_installment"
                  ? "Valor por Parcela *"
                  : "Valor (R$) *"}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#9873a1] pointer-events-none select-none">
                  R$
                </span>
                <input
                  id="tx-amount"
                  type="text"
                  inputMode="decimal"
                  required
                  value={displayAmount}
                  onChange={handleAmountChange}
                  onBlur={handleAmountBlur}
                  onFocus={(e) => e.target.select()}
                  placeholder="0,00"
                  className="w-full min-h-[42px] rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-3.5 text-xs text-[#f4eff5] placeholder-[#6e6375] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                {enableInstallments ? "Data da 1ª Parcela *" : "Data *"}
              </label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6e6375] pointer-events-none shrink-0" />
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setCustomDrafts(null);
                  }}
                  className="w-full min-h-[42px] rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-3.5 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Categoria e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-category"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Categoria
              </label>
              <div className="relative flex items-center">
                <select
                  id="tx-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FinancialCategory)}
                  disabled={type === "entrada"}
                  className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-3.5 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors disabled:opacity-75"
                >
                  {type === "entrada" ? (
                    <option value="Receita" className="bg-[#1a151f] text-[#f4eff5]">
                      Receita
                    </option>
                  ) : (
                    <>
                      <option value="Custo Fixo" className="bg-[#1a151f] text-[#f4eff5]">
                        Custo Fixo
                      </option>
                      <option value="Custo Variável" className="bg-[#1a151f] text-[#f4eff5]">
                        Custo Variável
                      </option>
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              </div>
            </div>

            <div>
              <label
                htmlFor="tx-status"
                className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
              >
                Status
              </label>
              <div className="relative flex items-center">
                <select
                  id="tx-status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as FinancialStatus);
                    setCustomDrafts(null);
                  }}
                  className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-3.5 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
                >
                  {type === "entrada" ? (
                    <option value="Recebido" className="bg-[#1a151f] text-[#f4eff5]">
                      Recebido
                    </option>
                  ) : (
                    <option value="Pago" className="bg-[#1a151f] text-[#f4eff5]">
                      Pago
                    </option>
                  )}
                  <option value="Pendente" className="bg-[#1a151f] text-[#f4eff5]">
                    Pendente
                  </option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              </div>
            </div>
          </div>

          {/* Vínculo opcional com Trabalho */}
          <div>
            <label
              htmlFor="tx-event"
              className="block text-[11px] font-medium text-[#968a9c] uppercase tracking-wider mb-1.5"
            >
              Trabalho Vinculado (Opcional)
            </label>
            <div className="relative flex items-center">
              <Film className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
              <select
                id="tx-event"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full min-h-[42px] appearance-none rounded-xl border border-[#33293c] bg-[#120e15] py-2.5 pl-10 pr-10 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none focus:ring-1 focus:ring-[#9873a1]/20 transition-colors"
              >
                <option value="" className="bg-[#1a151f] text-[#f4eff5]">
                  Sem vínculo com trabalho específico
                </option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-[#1a151f] text-[#f4eff5]">
                    {ev.title} {ev.clientName ? `(${ev.clientName})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e6375] pointer-events-none shrink-0" />
            </div>
          </div>

          {/* Atalho de Parcelamento (apenas ao criar) */}
          {!isEditing && (
            <div className="rounded-xl border border-[#33293c] bg-[#120e15] p-3.5 space-y-3">
              <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                <span className="flex items-center gap-2 text-xs font-medium text-[#f4eff5]">
                  <Split className="w-3.5 h-3.5 text-[#9873a1]" />
                  <span>Dividir em parcelas (ex: 1/2 e 2/2)</span>
                </span>
                <input
                  type="checkbox"
                  checked={enableInstallments}
                  onChange={(e) => {
                    setEnableInstallments(e.target.checked);
                    setCustomDrafts(null);
                  }}
                  className="h-4 w-4 rounded border-[#33293c] bg-[#1a151f] accent-[#9873a1] cursor-pointer"
                />
              </label>

              {enableInstallments && (
                <div className="space-y-3 pt-2 border-t border-[#33293c]/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] text-[#968a9c] mb-1">
                        Número de parcelas
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[2, 3, 4, 6].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleInstallmentCountChange(n)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                              installmentsCount === n
                                ? "bg-[#231c29] border-[#9873a1] text-[#bba0c1]"
                                : "bg-[#1a151f] border-[#33293c] text-[#968a9c] hover:text-[#f4eff5]"
                            }`}
                          >
                            {n}x
                          </button>
                        ))}
                        <input
                          type="number"
                          min={2}
                          max={12}
                          value={installmentsCount}
                          onChange={(e) => handleInstallmentCountChange(Number(e.target.value) || 2)}
                          className="w-12 rounded-lg border border-[#33293c] bg-[#1a151f] py-1 px-2 text-[11px] text-[#f4eff5] text-center tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] text-[#968a9c] mb-1">
                        Base de cálculo
                      </span>
                      <div className="grid grid-cols-2 gap-1 bg-[#1a151f] p-0.5 rounded-lg border border-[#33293c]">
                        <button
                          type="button"
                          onClick={() => {
                            setAmountMode("split_total");
                            setCustomDrafts(null);
                          }}
                          className={`py-1 rounded-md text-[10px] font-medium transition-colors ${
                            amountMode === "split_total"
                              ? "bg-[#231c29] text-[#bba0c1]"
                              : "text-[#6e6375] hover:text-[#f4eff5]"
                          }`}
                        >
                          Dividir total
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAmountMode("per_installment");
                            setCustomDrafts(null);
                          }}
                          className={`py-1 rounded-md text-[10px] font-medium transition-colors ${
                            amountMode === "per_installment"
                              ? "bg-[#231c29] text-[#bba0c1]"
                              : "text-[#6e6375] hover:text-[#f4eff5]"
                          }`}
                        >
                          Por parcela
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Prévia editável das parcelas */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {generatedDrafts.map((draft, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1.5 items-center rounded-lg border border-[#33293c]/80 bg-[#1a151f] p-2 text-[11px]"
                      >
                        <input
                          type="text"
                          value={draft.label}
                          onChange={(e) => handleEditDraft(idx, { label: e.target.value })}
                          className="col-span-5 rounded border border-[#33293c] bg-[#120e15] px-2 py-1 text-[11px] text-[#f4eff5]"
                        />
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(e) => handleEditDraft(idx, { date: e.target.value })}
                          className="col-span-4 rounded border border-[#33293c] bg-[#120e15] px-1.5 py-1 text-[10px] text-[#f4eff5] [color-scheme:dark]"
                        />
                        <div className="col-span-3 text-right font-semibold text-[#bba0c1] tabular-nums">
                          {formatBRL(draft.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#33293c]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isEditing
                  ? "Salvar Alterações"
                  : enableInstallments
                  ? `Criar ${installmentsCount} Parcelas`
                  : "Salvar Lançamento"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
