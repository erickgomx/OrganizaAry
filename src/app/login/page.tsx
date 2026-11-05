import { Metadata } from "next";
import Image from "next/image";
import { Film, Calendar, CheckSquare, Sparkles } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Login | OrganizaAry",
  description: "Painel de controle para gestão de fluxo de trabalho audiovisual e fotográfico.",
};

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-neutral-950 text-neutral-100 overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Background cinematic aura & subtle golden warm glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-neutral-950 to-neutral-950 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <header className="relative z-10 flex items-center justify-between max-w-md w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md p-1 overflow-hidden">
            <Image
              src="/logo.png"
              alt="OrganizaAry Logo"
              width={44}
              height={44}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              OrganizaAry
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-amber-300 border border-amber-900/40">
                PRO
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Gestão Fotográfica & Audiovisual</p>
          </div>
        </div>
      </header>

      {/* Central Login Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Logo Brand Emblem */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative w-20 h-20 rounded-3xl bg-neutral-900/90 border border-neutral-800 p-2 shadow-inner flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="OrganizaAry Logo"
                width={72}
                height={72}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
                Painel Operacional
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Centralize clientes, agendamento de ensaios, pós-produção e integração Google Workspace.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-3.5 text-xs text-red-300">
              {error === "auth_callback_failed"
                ? "Falha na sincronização com o Google. Por favor, tente novamente."
                : "Não foi possível concluir o login. Verifique sua conexão e tente novamente."}
            </div>
          )}

          {/* Single Sign-On Button */}
          <div className="pt-1">
            <GoogleSignInButton />
          </div>

          {/* Quick value props / Feature pills */}
          <div className="pt-4 border-t border-neutral-800/80">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Recursos Integrados
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/40">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/40">
                <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Google Drive RAW</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/40">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Kanban Pós-Prod</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950/40 border border-neutral-800/40">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>CRM 360º</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-md w-full mx-auto text-center text-xs text-neutral-600">
        <p>OrganizaAry • Exclusivo para gestão de fotografia e audiovisual.</p>
      </footer>
    </div>
  );
}
