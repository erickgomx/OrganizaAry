"use client";

import { useState } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MessageCircle,
  LayoutDashboard,
  Users,
  CheckSquare,
  Sparkles,
  BookOpen,
  Cloud,
  Lightbulb,
  ArrowRight,
  Check,
} from "lucide-react";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "guide" | "instructions";
}

type InstructionSection = "dashboard" | "events" | "clients" | "tasks" | "google" | "tips";

export function UserGuideModal({ isOpen, onClose, defaultTab = "guide" }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"guide" | "instructions">(defaultTab);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSection, setSelectedSection] = useState<InstructionSection>("dashboard");

  if (!isOpen) return null;

  // Initial step-by-step onboarding carousel steps
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
            <div className="p-3 rounded-xl bg-[#231c29] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">📅 Agenda de Ensaios</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Saiba exatamente quem você vai fotografar, onde e quando.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#231c29] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">✅ Tarefas de Pós-Produção</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Um checklist simples de edição, culling e prazos de entrega.
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
      title: "Google Calendar & Meet Integrados",
      subtitle: "Sua agenda e reuniões sincronizadas sem esforço",
      icon: Cloud,
      content: (
        <div className="space-y-3 text-xs text-[#968a9c] leading-relaxed">
          <p>
            As integrações funcionam de forma silenciosa para economizar o seu tempo:
          </p>
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-lg bg-[#231c29] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">🗓️ Google Calendar</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Seus ensaios agendados aparecem automaticamente no seu calendário do celular.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#231c29] border border-[#33293c]">
              <p className="font-medium text-[#f4eff5]">🎥 Google Meet</p>
              <p className="text-[11px] text-[#6e6375] mt-0.5">
                Gere links de videoconferência em 1 clique para reuniões de alinhamento com clientes.
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
    try {
      localStorage.setItem("organizaary_tutorial_completed", "true");
    } catch {
      // Storage safety
    }
    onClose();
  };

  // Detailed Module Guides for "Instruções Extras"
  const instructionSections = [
    {
      id: "dashboard" as InstructionSection,
      label: "Início",
      icon: LayoutDashboard,
      badge: "Visão Geral",
      title: "Painel Inicial (Dashboard)",
      subtitle: "Sua central de comando diária com visão panorâmica de todo o trabalho.",
      description:
        "O Início foi projetado para que você nunca precise adivinhar o que fazer a seguir. Em segundos você sabe quais ensaios estão agendados para a semana, quantas entregas estão pendentes e a saúde das suas integrações.",
      highlights: [
        {
          title: "Contadores em Tempo Real",
          desc: "Veja rapidamente o total de trabalhos do mês atual, tarefas na fila de edição e clientes cadastrados.",
        },
        {
          title: "Próximos Trabalhos",
          desc: "Lista cronológica dos próximos ensaios ou gravações marcadas, com acesso rápido aos detalhes e ao WhatsApp do cliente.",
        },
        {
          title: "Atalhos Rápidos",
          desc: "Botões de ação imediata para criar um novo trabalho ou cadastrar um cliente sem trocar de tela.",
        },
        {
          title: "Indicador de Conexão Google",
          desc: "Mostra se seu Google Calendar e Meet estão conectados e operando normalmente.",
        },
      ],
      stepByStep: [
        "Abra o Início logo ao começar seu dia de trabalho.",
        "Confira o horário e local do próximo trabalho agendado.",
        "Verifique quantas tarefas de pós-produção esperam por você antes de aceitar novos prazos.",
      ],
      tip: "Use o Início todas as manhãs como seu café da manhã de planejamento!",
    },
    {
      id: "events" as InstructionSection,
      label: "Trabalhos",
      icon: Calendar,
      badge: "Ensaios & Eventos",
      title: "Gestão de Trabalhos & Ensaios",
      subtitle: "O coração da sua produtora: crie, monitore status e acerte entregas com facilidade.",
      description:
        "Cada ensaio, cobertura de casamento, evento corporativo ou gravação de vídeo é um 'Trabalho'. Aqui você centraliza todas as datas, clientes, valores e links dos arquivos.",
      highlights: [
        {
          title: "Criação Simples e Completa",
          desc: "Selecione o cliente, defina tipo de trabalho (Ensaio, Casamento, 15 Anos, Corporativo), data, horário e valor.",
        },
        {
          title: "🗓️ Google Calendar Instantâneo",
          desc: "O ensaio entra na hora no calendário do seu celular, com lembrete e detalhes do local.",
        },
        {
          title: "🎥 Reuniões no Google Meet",
          desc: "Gere links de videochamada com um clique para reuniões de alinhamento ou apresentação de fotos.",
        },
        {
          title: "Ciclo de Status Claro",
          desc: "Acompanhe: Agendado ➔ Confirmado ➔ Realizado ➔ Em Edição ➔ Concluído.",
        },
      ],
      stepByStep: [
        "Clique no botão '+ Novo Trabalho' na página de Trabalhos ou no Início.",
        "Selecione o cliente (se for novo, você pode cadastrá-lo na hora).",
        "Preencha data, horário, localização e o valor combinado.",
        "Após salvar, seu ensaio já estará sincronizado na agenda e pronto para você chamar o cliente no WhatsApp!",
      ],
      tip: "Assim que terminar a captação, mude o status para 'Em Edição' para acompanhar o prazo de entrega nas Tarefas.",
    },
    {
      id: "clients" as InstructionSection,
      label: "Clientes",
      icon: Users,
      badge: "Relacionamento",
      title: "Carteira de Clientes & Contatos",
      subtitle: "Gestão humanizada e prática de contatos, sem burocracia.",
      description:
        "Tenha na ponta dos dedos todas as informações de quem contrata você: telefone, e-mail, observações especiais e o histórico de todos os trabalhos já realizados.",
      highlights: [
        {
          title: "💬 WhatsApp Direto em 1 Toque",
          desc: "Nunca mais precise salvar o número na agenda do telefone! Basta clicar no ícone do WhatsApp para abrir a conversa instantaneamente.",
        },
        {
          title: "Notas e Briefing Personalizado",
          desc: "Guarde detalhes importantes da família, preferências de fotos, estilo de edição favorito ou referências.",
        },
        {
          title: "Histórico Unificado",
          desc: "Ao abrir o perfil do cliente, veja tudo o que você já fotografou ou filmou para ele ao longo dos anos.",
        },
      ],
      stepByStep: [
        "Acesse 'Clientes' no menu superior e clique em '+ Novo Cliente'.",
        "Insira nome, telefone com DDD e e-mail.",
        "Adicione notas úteis no campo de observações (ex: 'Prefere fotos no pôr do sol').",
        "Pronto! Agora você pode vinculá-lo aos Trabalhos e chamá-lo no WhatsApp sempre que precisar.",
      ],
      tip: "Sempre cadastre o telefone com DDD (ex: 11 99999-9999) para o link do WhatsApp funcionar perfeito no celular e no computador.",
    },
    {
      id: "tasks" as InstructionSection,
      label: "Tarefas",
      icon: CheckSquare,
      badge: "Pós-Produção",
      title: "Quadro de Tarefas (Kanban)",
      subtitle: "Acompanhe cada etapa da pós-produção do backup à entrega final.",
      description:
        "O Quadro Kanban organiza visualmente tudo o que você precisa fazer. Arraste os cartões entre as colunas conforme você avança na edição das fotos e vídeos.",
      highlights: [
        {
          title: "4 Colunas Estratégicas",
          desc: "A Fazer (backup e preparo) ➔ Em Andamento (seleção e cor) ➔ Aguardando Aprovação (galeria com cliente) ➔ Concluído.",
        },
        {
          title: "Prioridades com Cores Claras",
          desc: "Defina como Urgente (vermelho), Alta, Média ou Baixa para saber onde focar primeiro.",
        },
        {
          title: "Vínculo com Trabalhos",
          desc: "Cada tarefa pode ser conectada ao ensaio e cliente correspondente, evitando confusão.",
        },
      ],
      stepByStep: [
        "Crie uma tarefa sempre que tiver uma etapa a cumprir (ex: 'Tratar 30 fotos no Lightroom').",
        "Defina o prazo de entrega para manter o cliente informado.",
        "Mova a tarefa para 'Em Andamento' quando começar a trabalhar nela.",
        "Ao enviar a galeria final ou fotos aprovadas, arraste para 'Concluído'.",
      ],
      tip: "Divida projetos grandes em tarefas menores: 'Fazer Backup' ➔ 'Fazer Seleção' ➔ 'Tratar Cores' ➔ 'Exportar e Enviar'. Fica muito mais leve!",
    },
    {
      id: "google" as InstructionSection,
      label: "Google",
      icon: Cloud,
      badge: "Automações",
      title: "Google Calendar & Google Meet",
      subtitle: "Compromissos na Agenda e salas virtuais no Meet sem trabalho manual.",
      description:
        "O OrganizaAry integra-se de forma nativa e segura aos serviços do Google Workspace para que você mantenha sua agenda e reuniões sempre organizadas.",
      highlights: [
        {
          title: "Sincronização na Agenda do Celular",
          desc: "Todo ensaio cadastrado sincroniza com o Google Calendar do seu smartphone, com notificações e horários automáticos.",
        },
        {
          title: "Videochamadas com 1 Clique",
          desc: "Cria links do Google Meet para reuniões de alinhamento e briefing com clientes sem precisar abrir o navegador.",
        },
      ],
      stepByStep: [
        "Ao fazer login com o Google, conceda as permissões de calendário solicitadas.",
        "Confira o selo 'Google Sincronizado' no topo da barra de navegação.",
        "Se aparecer 'Google Pendente', basta sair e entrar de novo para renovar a autorização de forma rápida.",
      ],
      tip: "A sincronização com o Google Calendar evita choque de datas e mantém seus horários de captação sempre visíveis no celular.",
    },
    {
      id: "tips" as InstructionSection,
      label: "Dicas de Ouro",
      icon: Lightbulb,
      badge: "Boas Práticas",
      title: "Dicas de Ouro para sua Produtora",
      subtitle: "Recomendações práticas para elevar o padrão do seu fluxo de trabalho.",
      description:
        "Pequenos hábitos no dia a dia evitam surpresas desagradáveis e garantem a melhor experiência possível tanto para você quanto para os seus clientes.",
      highlights: [
        {
          title: "1. Confirmação Prévia no WhatsApp",
          desc: "Use o botão de WhatsApp 1 dia antes do ensaio para confirmar horário, clima, local e tirar dúvidas de figurino.",
        },
        {
          title: "2. Briefing e Expectativas Claras",
          desc: "Use as anotações do cadastro de clientes para registrar referências visuais e paletas de cores que o cliente prefere.",
        },
        {
          title: "3. WhatsApp com Mensagens Ágeis",
          desc: "Cadastre o telefone sempre com DDD para iniciar conversas com um toque sem precisar salvar contatos na agenda.",
        },
        {
          title: "4. Prazos Realistas",
          desc: "Sempre adicione 2 ou 3 dias de folga no prazo final da entrega para imprevistos de render ou aprovação.",
        },
      ],
      stepByStep: [
        "Cadastre o cliente com antecedência e notas de briefing.",
        "Crie o trabalho para sincronizar na agenda do celular.",
        "Execute a captação e mantenha o status atualizado até a entrega final.",
      ],
      tip: "Você pode consultar este guia e as instruções extras sempre que quiser clicando em 'Guia & Instruções' no topo da tela!",
    },
  ];

  const currentInstruction = instructionSections.find((s) => s.id === selectedSection) || instructionSections[0];
  const InstructionIcon = currentInstruction.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full transition-all duration-200 rounded-2xl border border-[#33293c] bg-[#1a151f] shadow-2xl flex flex-col ${
          activeTab === "instructions" ? "max-w-2xl max-h-[90vh]" : "max-w-md max-h-[85vh]"
        }`}
      >
        {/* Top Header with Tab Switcher & Close */}
        <div className="flex items-center justify-between border-b border-[#33293c] px-5 py-3.5 bg-[#231c29]/70 rounded-t-2xl">
          {/* Main Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#120e15] border border-[#33293c]">
            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "guide"
                  ? "bg-[#9873a1] text-[#120e15] font-semibold shadow-sm"
                  : "text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#1a151f]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Guia Inicial</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("instructions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "instructions"
                  ? "bg-[#9873a1] text-[#120e15] font-semibold shadow-sm"
                  : "text-[#968a9c] hover:text-[#f4eff5] hover:bg-[#1a151f]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Instruções Extras</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] border border-transparent hover:border-[#33293c] transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: GUIA INICIAL (Passo a passo rápido de 3 etapas)   */}
        {/* ======================================================== */}
        {activeTab === "guide" && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            {/* Step header */}
            <div className="flex items-center gap-3 pb-2 border-b border-[#33293c]">
              <div className="w-10 h-10 rounded-xl bg-[#231c29] border border-[#33293c] flex items-center justify-center text-[#bba0c1]">
                <StepIcon className="w-5 h-5 text-[#9873a1]" />
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

            {/* Step body */}
            <div className="min-h-[190px] flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-[#968a9c] mb-3 font-medium">
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
                        ? "w-6 bg-[#9873a1]"
                        : "w-2 bg-[#33293c] hover:bg-[#968a9c]"
                    }`}
                    title={`Passo ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Step Navigation Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#33293c]">
              <button
                type="button"
                onClick={() => setActiveTab("instructions")}
                className="inline-flex items-center gap-1 text-xs text-[#9873a1] hover:text-[#bba0c1] transition-colors font-medium"
              >
                <span>Ver Instruções Extras</span>
                <ArrowRight className="w-3 h-3" />
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
        )}

        {/* ======================================================== */}
        {/* TAB 2: INSTRUÇÕES EXTRAS (Detalhamento de cada parte)    */}
        {/* ======================================================== */}
        {activeTab === "instructions" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Section Pills Navigation */}
            <div className="px-5 pt-3 pb-2 border-b border-[#33293c] bg-[#16111a]/50">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {instructionSections.map((sec) => {
                  const SecIcon = sec.icon;
                  const isSelected = sec.id === selectedSection;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSection(sec.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                        isSelected
                          ? "bg-[#231c29] text-[#bba0c1] border border-[#9873a1]/40 shadow-sm"
                          : "text-[#968a9c] hover:bg-[#231c29]/60 hover:text-[#f4eff5] border border-transparent"
                      }`}
                    >
                      <SecIcon className={`w-3.5 h-3.5 ${isSelected ? "text-[#9873a1]" : "text-[#6e6375]"}`} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instruction Detail Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Header of selected section */}
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#231c29] border border-[#33293c] flex items-center justify-center shrink-0">
                  <InstructionIcon className="w-5 h-5 text-[#9873a1]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#231c29] text-[#9873a1] border border-[#33293c]">
                      {currentInstruction.badge}
                    </span>
                    <h3 className="text-base font-semibold text-[#f4eff5] tracking-tight">
                      {currentInstruction.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#968a9c] font-medium leading-relaxed">
                    {currentInstruction.subtitle}
                  </p>
                </div>
              </div>

              {/* General Description */}
              <div className="p-3.5 rounded-xl bg-[#231c29]/70 border border-[#33293c] text-xs text-[#968a9c] leading-relaxed">
                {currentInstruction.description}
              </div>

              {/* Highlights & Features */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9873a1] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Principais Recursos & Automações</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentInstruction.highlights.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#1a151f] border border-[#33293c] space-y-1 hover:border-[#9873a1]/30 transition-colors"
                    >
                      <p className="text-xs font-semibold text-[#f4eff5]">{item.title}</p>
                      <p className="text-[11px] text-[#968a9c] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step by Step Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f4eff5] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#9fc193]" />
                  <span>Como Usar no Dia a Dia</span>
                </h4>
                <div className="space-y-1.5">
                  {currentInstruction.stepByStep.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2 rounded-lg bg-[#231c29]/50 border border-[#33293c]/60 text-xs text-[#968a9c]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#1a151f] border border-[#33293c] text-[10px] font-bold text-[#bba0c1] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-snug pt-0.5">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Golden Pro-Tip */}
              <div className="p-3.5 rounded-xl bg-[#231c29] border border-[#9873a1]/30 flex items-start gap-3 text-xs">
                <Lightbulb className="w-4 h-4 text-[#bba0c1] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#bba0c1] font-semibold block mb-0.5">Dica de Ouro:</strong>
                  <span className="text-[#968a9c]">{currentInstruction.tip}</span>
                </div>
              </div>
            </div>

            {/* Footer with quick action */}
            <div className="px-5 py-3 border-t border-[#33293c] bg-[#231c29]/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className="text-xs text-[#968a9c] hover:text-[#f4eff5] transition-colors"
              >
                Voltar para o Guia Rápido
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
              >
                Entendido, Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
