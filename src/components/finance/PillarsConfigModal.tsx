"use client";

import { useState } from "react";
import { X, Loader2, Sliders, Plus, Trash2, RotateCcw } from "lucide-react";
import { ProfitPillarRule } from "@/types/database";
import { DEFAULT_PILLAR_RULES } from "@/lib/finance/calculations";
import { updatePillarRulesAction } from "@/actions/finance";

interface PillarsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pillars: ProfitPillarRule[];
  onSuccess?: (updated: ProfitPillarRule[]) => void;
}

interface EditablePillar {
  name: string;
  percentage: number;
  color: string;
}

const PRESET_COLORS = [
  "#9873a1",
  "#7c9eb2",
  "#9fc193",
  "#e09f67",
  "#bba0c1",
  "#d48970",
  "#68b5a0",
];

export function PillarsConfigModal({
  isOpen,
  onClose,
  pillars,
  onSuccess,
}: PillarsConfigModalProps) {
  const [items, setItems] = useState<EditablePillar[]>(() =>
    pillars.map((p) => ({
      name: p.name,
      percentage: Number(p.percentage),
      color: p.color,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentKey = isOpen ? pillars.map((p) => `${p.id}-${p.percentage}`).join("|") : "closed";
  const [prevKey, setPrevKey] = useState(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (isOpen) {
      setItems(
        pillars.map((p) => ({
          name: p.name,
          percentage: Number(p.percentage),
          color: p.color,
        }))
      );
      setError(null);
    }
  }

  if (!isOpen) return null;

  const totalPct = items.reduce((acc, item) => acc + (Number(item.percentage) || 0), 0);
  const isTotalValid = Math.abs(totalPct - 100) <= 0.05;

  const handleUpdateItem = (index: number, patch: Partial<EditablePillar>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleAddPillar = () => {
    const remaining = Math.max(0, Math.round((100 - totalPct) * 100) / 100);
    setItems((prev) => [
      ...prev,
      {
        name: "Novo Pilar",
        percentage: remaining,
        color: PRESET_COLORS[prev.length % PRESET_COLORS.length],
      },
    ]);
  };

  const handleRemovePillar = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRestoreDefaults = () => {
    setItems(
      DEFAULT_PILLAR_RULES.map((r) => ({
        name: r.name,
        percentage: r.percentage,
        color: r.color,
      }))
    );
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTotalValid) {
      setError("A soma dos percentuais deve fechar exatamente em 100%.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await updatePillarRulesAction(
        items.map((item, index) => ({
          name: item.name,
          percentage: Number(item.percentage),
          sort_order: index + 1,
          color: item.color,
        }))
      );

      if (res.error) throw new Error(res.error);
      if (res.data) onSuccess?.(res.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar regras dos pilares.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <h3 className="text-sm font-semibold text-[#f4eff5] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#9873a1]" />
            Editar Percentuais dos Pilares
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
          <div className="rounded-lg bg-[#261514] p-3 text-xs text-[#e06b63] border border-[#4a2420]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-[#33293c] bg-[#120e15] p-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    {PRESET_COLORS.slice(0, 4).map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => handleUpdateItem(index, { color: hex })}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          item.color === hex ? "scale-125 ring-2 ring-[#f4eff5]" : "opacity-60 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: hex }}
                        title="Cor do pilar"
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                    placeholder="Nome do pilar"
                    className="flex-1 min-w-0 rounded-lg border border-[#33293c] bg-[#1a151f] px-2.5 py-1.5 text-xs text-[#f4eff5] focus:border-[#9873a1]/60 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <div className="relative w-24">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={item.percentage}
                      onChange={(e) =>
                        handleUpdateItem(index, { percentage: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-[#33293c] bg-[#1a151f] py-1.5 pl-2.5 pr-6 text-xs text-right text-[#f4eff5] tabular-nums focus:border-[#9873a1]/60 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#968a9c]">
                      %
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePillar(index)}
                    disabled={items.length <= 1}
                    className="p-1.5 rounded-lg text-[#6e6375] hover:text-[#e06b63] hover:bg-[#261514] transition-colors disabled:opacity-30"
                    title="Remover pilar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPillar}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#33293c] bg-[#120e15] hover:bg-[#231c29] text-[11px] text-[#bba0c1] font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Pilar</span>
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#33293c] bg-[#120e15] hover:bg-[#231c29] text-[11px] text-[#968a9c] hover:text-[#f4eff5] transition-colors"
                title="Restaurar padrão 20/20/30/30"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Padrão (20/20/30/30)</span>
              </button>
            </div>

            <div
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums border ${
                isTotalValid
                  ? "bg-[#162017] text-[#9fc193] border-[#273829]"
                  : "bg-[#261514] text-[#e06b63] border-[#4a2420]"
              }`}
            >
              Total: {totalPct.toFixed(1)}%
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#33293c]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isTotalValid}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Salvar Regras</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
