"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Sim, Remover",
  cancelLabel = "Cancelar",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl border border-[#2d2822] bg-[#161513] p-5 shadow-2xl space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#261514] border border-[#4a2420] text-[#e06b63] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#f6f4ef] leading-snug">
              {title}
            </h3>
            <p className="text-xs text-[#8e887f] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#23201c]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl border border-[#26231f] bg-[#181715] text-[#8e887f] hover:text-[#f6f4ef] text-xs font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#c95f54] hover:bg-[#d96e63] text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
