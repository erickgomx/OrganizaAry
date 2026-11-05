"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Calendar,
  CheckSquare,
  Sparkles,
  FolderOpen,
  Video,
  CheckCircle2,
  BookOpen,
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
      stepLabel: "Passo 1 de 4",
      title: "Bem-vindo(a) ao OrganizaAry",
      subtitle: "Sua central operacional de fotografia e audiovisual",
      icon: Sparkles,
      content: (
        <div className="space-y-3.5 text-xs text-[#9d978d] leading-relaxed">
          <p>
            O <strong className="text-[#f6f4ef]">OrganizaAry</strong> foi projetado especificamente para fotógrafos e videomakers que precisam de agilidade, organização visual e controle de faturamento em um design calmo e intuitivo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <div className="p-3 rounded-xl bg-[#1a1917] border border-[#272420] text-center space-y-1">
              <Users className="w-4 h-4 text-[#c8a97e] mx-auto" />
              <p className="font-medium text-[#f6f4ef]">CRM de Clientes</p>
              <p className="text-[10px] text-[#736e65]">Histórico e WhatsApp direto</p>
            </div>
            <div className="p-3 rounded-xl bg-[#1a1917] border border-[#272420] text-center space-y-1">
              <Calendar className="w-4 h-4 text-[#c8a97e] mx-auto" />
              <p className="font-medium text-[#f6f4ef]">Pipeline & Google</p>
              <p className="text-[10px] text-[#736e65]">Calendar, Drive e Meet</p>
            </div>
            <div className="p-3 rounded-xl bg-[#1a1917] border border-[#272420] text-center space-y-1">
              <CheckSquare className="w-4 h-4 text-[#c8a97e] mx-auto" />
              <p className="font-medium text-[#f6f4ef]">Pós-Produção</p>
              <p className="text-[10px] text-[#736e65]">Kanban com prazos</p>
            </div>
          </div>
          <p className="text-[11px] text-[#736e65] italic">
            Dica: você pode reabrir este tutorial a qualquer momento clicando no botão &quot;Guia&quot; no topo da página.
          </p>
        </div>
      ),
    },
    {
      stepLabel: "Passo 2 de 4",
      title: "CRM 360º de Clientes",
      subtitle: "Relacionamentos duradouros e controle financeiro",
      icon: Users,
      content: (
        <div className="space-y-3.5 text-xs text-[#9d978d] leading-relaxed">
          <p>
            Na aba <strong className="text-[#f6f4ef]">Clientes</strong>, você tem uma visão completa de cada contratante:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Contato Rápido:</strong> Inicie conversas no WhatsApp com uma mensagem formatada ou ligue diretamente em um clique.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Visão 360º:</strong> Acesse a página individual do cliente para consultar o histórico acumulado de captações, valores recebidos e valores pendentes.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Briefing & Notas:</strong> Registre preferências estéticas, restrições e referências no cadastro do cliente.
              </span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      stepLabel: "Passo 3 de 4",
      title: "Pipeline de Eventos & Automação Google",
      subtitle: "Da proposta inicial até a entrega final",
      icon: Calendar,
      content: (
        <div className="space-y-3.5 text-xs text-[#9d978d] leading-relaxed">
          <p>
            O módulo de <strong className="text-[#f6f4ef]">Eventos</strong> organiza suas gravações e ensaios em 5 etapas lógicas:
          </p>
          <div className="flex flex-wrap gap-1.5 py-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#211a12] text-[#d4a359] border border-[#382b1d]">
              1. Orçamento / Proposta
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#161a20] text-[#94a3b8] border border-[#252c38]">
              2. Agendado
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1c1a18] text-[#c8a97e] border border-[#332e27]">
              3. Captação Concluída
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#211714] text-[#d48970] border-[#3b2520]">
              4. Pós-Produção
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#162017] text-[#9fc193] border border-[#273829]">
              5. Finalizado
            </span>
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#181715] border border-[#24211d]">
              <Calendar className="w-3.5 h-3.5 text-[#9fc193] shrink-0" />
              <span><strong className="text-[#f6f4ef]">Google Calendar:</strong> Sincronize a data e hora do ensaio direto na sua agenda.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#181715] border border-[#24211d]">
              <FolderOpen className="w-3.5 h-3.5 text-[#d4a359] shrink-0" />
              <span><strong className="text-[#f6f4ef]">Google Drive:</strong> Crie pastas organizadas (<code className="text-[#c8a97e]">[RAWs]</code> e <code className="text-[#c8a97e]">[Entregas]</code>) com 1 clique.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#181715] border border-[#24211d]">
              <Video className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
              <span><strong className="text-[#f6f4ef]">Google Meet:</strong> Gere links de reuniões para alinhamento de briefing com o cliente.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepLabel: "Passo 4 de 4",
      title: "Kanban de Tarefas & Pós-Produção",
      subtitle: "Curadoria, color grading e exportação sem esquecer prazos",
      icon: CheckSquare,
      content: (
        <div className="space-y-3.5 text-xs text-[#9d978d] leading-relaxed">
          <p>
            No <strong className="text-[#f6f4ef]">Kanban</strong>, controle o progresso técnico das edições através das colunas <strong className="text-[#f6f4ef]">A Fazer</strong>, <strong className="text-[#f6f4ef]">Em Andamento</strong> e <strong className="text-[#f6f4ef]">Concluído</strong>.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Prazos & Alertas:</strong> Tarefas vencidas recebem destaque de atenção em tom terracota suave para evitar atrasos na entrega.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Vínculo com Evento:</strong> Cada tarefa pode ser atrelada ao respectivo ensaio ou evento para clareza da equipe.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#9fc193] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#f6f4ef]">Baixa Automática:</strong> Ao finalizar um evento na tela de Eventos, o sistema sugere marcar automaticamente todas as tarefas vinculadas como concluídas.
              </span>
            </li>
          </ul>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#2d2822] bg-[#161513] p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#23201c] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1c1a18] border border-[#2e2923] flex items-center justify-center text-[#dfba88]">
              <StepIcon className="w-4 h-4 text-[#c8a97e]" />
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c8a97e] block">
                {current.stepLabel}
              </span>
              <h3 className="text-sm font-semibold text-[#f6f4ef] tracking-tight">
                {current.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-[#736e65] hover:text-[#f6f4ef] hover:bg-[#1c1a18] transition-colors"
            title="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="min-h-[220px] flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-[#8e887f] mb-3 font-medium">
              {current.subtitle}
            </p>
            {current.content}
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? "w-6 bg-[#c8a97e]"
                    : "w-2 bg-[#2a2723] hover:bg-[#38332c]"
                }`}
                title={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#23201c]">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-[#736e65] hover:text-[#f6f4ef] transition-colors font-medium"
          >
            Pular Tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#26231f] bg-[#181715] text-[#8e887f] hover:text-[#f6f4ef] text-xs font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <span>{currentStep === steps.length - 1 ? "Entendido, Começar!" : "Próximo"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
