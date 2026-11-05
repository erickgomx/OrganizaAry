"use client";

import { useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MessageCircle,
  FolderCheck,
} from "lucide-react";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      stepLabel: "1 de 3",
      title: "Seus Trabalhos em um só lugar",
      subtitle: "Simplicidade para sua rotina de fotografia e vídeo",
      icon: Calendar,
      content: (
        <div className="space-y-3 text-xs text-[#968a9c] leading-relaxed">
          <p>
            O <strong className="text-[#f4eff5]">OrganizaAry</strong> reúne apenas o que você realmente precisa no seu dia:
          </p>
          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-xl bg-[#1a151f] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">📅 Agenda de Ensaios</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Saiba exatamente quem você vai fotografar, onde e quando.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1a151f] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">✂️ Fila de Edição</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Um checklist simples das fotos e vídeos que faltam entregar.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepLabel: "2 de 3",
      title: "WhatsApp em 1 Toque",
      subtitle: "Comunicação direta com seus clientes",
      icon: MessageCircle,
      content: (
        <div className="space-y-3 text-xs text-[#968a9c] leading-relaxed">
          <p>
            Esqueça ter que salvar o número do cliente na agenda do seu telefone para mandar uma mensagem:
          </p>
          <div className="p-3 rounded-xl bg-[#162017] border border-[#273829] space-y-1">
            <p className="font-medium text-[#9fc193]">Conversa Imediata</p>
            <p className="text-[11px] text-[#968a9c]">
              Ao lado do nome de cada cliente ou ensaio, basta clicar no botão de WhatsApp para abrir a conversa na hora.
            </p>
          </div>
          <p className="text-[11px] text-[#6e6375]">
            Você também pode registrar notas rápidas de briefing no cadastro de cada cliente.
          </p>
        </div>
      ),
    },
    {
      stepLabel: "3 de 3",
      title: "Google no Piloto Automático",
      subtitle: "Pastas e agenda criadas sem esforço",
      icon: FolderCheck,
      content: (
        <div className="space-y-3 text-xs text-[#968a9c] leading-relaxed">
          <p>
            As integrações funcionam de forma silenciosa para economizar o seu tempo:
          </p>
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-lg bg-[#1a151f] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">📁 Pastas no Google Drive</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Criadas automaticamente com a estrutura <code className="text-[#9873a1]">[RAWs]</code> e <code className="text-[#9873a1]">[Entregas]</code>.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#1a151f] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">🗓️ Google Calendar</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Seus ensaios agendados aparecem automaticamente no seu calendário.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("organizaary_tutorial_completed", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#33293c] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#bba0c1]">
              <StepIcon className="w-4 h-4 text-[#9873a1]" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9873a1] block">
                {current.stepLabel}
              </span>
              <h3 className="text-sm font-semibold text-[#f4eff5] tracking-tight">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
            title="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="min-h-[190px] flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-[#968a9c] mb-3 font-medium">
              {current.subtitle}
            </p>
            {current.content}
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-3">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-[#9873a1]"
                    : "w-2 bg-[#33293c] hover:bg-[#33293c]"
                }`}
                title={`Passo ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#33293c]">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-[#6e6375] hover:text-[#f4eff5] transition-colors font-medium"
          >
            Pular
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <span>{currentStep === steps.length - 1 ? "Começar a Usar" : "Próximo"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
