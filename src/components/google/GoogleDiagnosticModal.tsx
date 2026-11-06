"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Key,
  Database as DatabaseIcon,
  Server,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  diagnoseGoogleIntegrationAction,
  GoogleDiagnosticInfo,
} from "@/actions/google";
import { createClient } from "@/lib/supabase/client";

interface GoogleDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleDiagnosticModal({
  isOpen,
  onClose,
}: GoogleDiagnosticModalProps) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<GoogleDiagnosticInfo | null>(null);
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await diagnoseGoogleIntegrationAction();
      setInfo(res);
    } catch {
      // Falha genérica
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      diagnoseGoogleIntegrationAction()
        .then((res) => {
          if (isMounted) {
            setInfo(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleReauthorize = async () => {
    try {
      setIsReauthorizing(true);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            window.location.pathname
          )}`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          scopes: [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "openid",
          ].join(" "),
        },
      });

      if (error) {
        alert(`Erro ao solicitar consentimento: ${error.message}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert("Falha ao abrir consentimento do Google.");
    } finally {
      setIsReauthorizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#33293c] bg-[#1a151f] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-[#f4eff5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#33293c] pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#9873a1]" />
            <h3 className="text-sm font-semibold text-[#f4eff5]">
              Diagnóstico de Integração com o Google
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-[#6e6375] hover:text-[#f4eff5] hover:bg-[#231c29] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-7 h-7 text-[#9873a1] animate-spin" />
            <p className="text-xs text-[#968a9c]">
              Testando credenciais, tokens e conexão com a API do Google...
            </p>
          </div>
        ) : !info ? (
          <div className="text-center py-8 text-xs text-red-300">
            Não foi possível executar o diagnóstico.
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Status Geral */}
            <div
              className={`px-3 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                info.calendarApiStatus === "ok"
                  ? "bg-[#162017]/80 border-[#273829] text-[#9fc193]"
                  : info.calendarApiStatus === "not_connected"
                  ? "bg-[#211a14]/80 border-[#382b21] text-[#ffb066]"
                  : "bg-red-950/20 border-red-900/30 text-red-300"
              }`}
            >
              {info.calendarApiStatus === "ok" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#82af74]" />
              ) : info.calendarApiStatus === "not_connected" ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#ffb066]" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs leading-tight">{info.calendarApiMessage}</p>
                {info.userEmail && (
                  <p className="text-[10px] opacity-70">
                    Conta: {info.userEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Checklist de Diagnóstico */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-semibold text-[#6e6375] tracking-wider">
                Verificação de Componentes
              </p>

              {/* 1. Supabase Profiles */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#120e15] border border-[#33293c]">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="w-3.5 h-3.5 text-[#9873a1]" />
                  <span>Tabela & Colunas Supabase</span>
                </div>
                {info.hasProfileRecord ? (
                  <span className="text-[#9fc193] font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> OK
                  </span>
                ) : (
                  <span className="text-red-400 font-medium flex items-center gap-1 text-[11px]">
                    <XCircle className="w-3 h-3" /> Falha nas Colunas
                  </span>
                )}
              </div>

              {/* 2. Tokens */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#120e15] border border-[#33293c]">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[#9873a1]" />
                  <span>Tokens OAuth do Google</span>
                </div>
                {info.hasAccessToken || info.hasRefreshToken ? (
                  <span className="text-[#9fc193] font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Gravados no Banco
                  </span>
                ) : (
                  <span className="text-[#ffb066] font-medium flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" /> Ausentes
                  </span>
                )}
              </div>

              {/* 3. Variáveis de Servidor */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#120e15] border border-[#33293c]">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-[#9873a1]" />
                  <span>Variáveis Vercel (Client ID & Secret)</span>
                </div>
                {info.hasClientIdEnv && info.hasClientSecretEnv ? (
                  <span className="text-[#9fc193] font-medium flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> Configuradas
                  </span>
                ) : (
                  <span className="text-[#ffb066] font-medium flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3 h-3" /> Opcional / Pendente
                  </span>
                )}
              </div>
            </div>

            {/* Solução recomendada */}
            {info.solutionSteps && info.solutionSteps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#33293c]">
                <p className="text-[10px] uppercase font-semibold text-[#9873a1] tracking-wider">
                  Como Resolver
                </p>
                <div className="p-3 rounded-xl bg-[#120e15] border border-[#33293c] space-y-1.5 text-[11px] text-[#968a9c]">
                  {info.solutionSteps.map((step, idx) => (
                    <p key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#bba0c1] font-semibold">{idx + 1}.</span>
                      <span className="text-[#f4eff5]">{step}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#33293c]">
              <button
                type="button"
                onClick={runDiagnostic}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#33293c] bg-[#1a151f] text-[#968a9c] hover:text-[#f4eff5] text-xs transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-testar</span>
              </button>

              <button
                type="button"
                onClick={handleReauthorize}
                disabled={isReauthorizing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isReauthorizing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>Conectar / Autorizar Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
