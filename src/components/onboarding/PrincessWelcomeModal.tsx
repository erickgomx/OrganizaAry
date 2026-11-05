"use client";

import { useEffect } from "react";
import { Heart, Sparkles, X } from "lucide-react";

interface PrincessWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrincessWelcomeModal({ isOpen, onClose }: PrincessWelcomeModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="princess-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Background click dismiss */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Romantic Glow Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(244,114,182,0.15)_0%,_rgba(152,115,161,0.10)_45%,_transparent_70%)] pointer-events-none" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-3xl border border-rose-400/30 bg-[#1a151f] p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(244,114,182,0.25)] space-y-6 text-center z-10 animate-in zoom-in-95 duration-200">
        {/* Top Dismiss Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          title="Fechar mensagem"
          aria-label="Fechar mensagem"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Romantic Glowing Icon Badge */}
        <div className="flex justify-center pt-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-[#9873a1]/25 to-pink-500/20 border border-rose-300/35 flex items-center justify-center shadow-inner">
              <Heart className="w-8 h-8 text-rose-400 fill-rose-400 animate-pulse" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[#1a151f] border border-rose-400/40 text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Modal Header */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-rose-300/90 block">
            ✨ Mensagem Especial do seu Príncipe ✨
          </span>
          <h2
            id="princess-modal-title"
            className="text-lg sm:text-xl font-semibold text-[#f4eff5] tracking-tight"
          >
            Bem-vinda, Minha Princesa!
          </h2>
        </div>

        {/* The Exact Romantic Quote Card */}
        <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#231c29]/95 to-[#1a151f] border border-[#9873a1]/30 shadow-inner overflow-hidden text-left sm:text-center">
          <Heart className="absolute -right-6 -bottom-6 w-28 h-28 text-rose-500/5 rotate-12 pointer-events-none" />

          <p className="relative z-10 text-sm sm:text-base text-[#f4eff5] font-medium leading-relaxed italic select-text">
            &ldquo;Para minha princesa se organizar mais do que já é organizada, desenvolvido com carinho pelo seu principe. Xingulingo &lt;3&rdquo;
          </p>

          <div className="mt-4 pt-3 border-t border-[#33293c]/80 flex items-center justify-center gap-2 text-[11px] font-medium text-rose-300/80">
            <span className="w-6 h-px bg-rose-400/40" />
            <span>Feito com todo o amor do mundo</span>
            <span className="w-6 h-px bg-rose-400/40" />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-rose-500 via-[#9873a1] to-[#bba0c1] hover:from-rose-400 hover:via-[#a981b3] hover:to-[#cbb3d0] text-[#120e15] font-semibold text-xs sm:text-sm shadow-lg shadow-rose-950/40 transition-all active:scale-[0.98]"
          >
            <span>Acessar o OrganizaAry</span>
            <Heart className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
