import { Metadata } from "next";
import Image from "next/image";
import { Calendar, Film, CheckSquare } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Login | OrganizaAry",
  description: "Acesso à plataforma OrganizaAry - EAREC Produtora Audiovisual.",
};

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0e0d0c] text-[#f6f4ef] px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      {/* Subtle atmospheric ambient glow matching logo warmth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,169,126,0.06)_0%,_transparent_65%)] pointer-events-none" />

      {/* Header / Brand */}
      <header className="relative z-10 flex items-center justify-between max-w-sm w-full mx-auto">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="OrganizaAry"
            width={40}
            height={40}
            className="w-10 h-10 object-contain drop-shadow-sm"
            priority
          />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#f6f4ef]">
              OrganizaAry
            </h1>
            <p className="text-[11px] text-[#8e887f]">EAREC Produtora Audiovisual</p>
          </div>
        </div>
      </header>

      {/* Central Login Card */}
      <main className="relative z-10 max-w-sm w-full mx-auto my-auto py-6">
        <div className="rounded-2xl border border-[#272420] bg-[#161513]/90 p-6 sm:p-7 backdrop-blur-sm shadow-xl space-y-6">
          {/* Logo Emblem & Heading */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Image
              src="/logo.png"
              alt="OrganizaAry Logo"
              width={112}
              height={112}
              className="w-28 h-28 object-contain drop-shadow-md select-none"
              priority
            />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[#f6f4ef] tracking-tight">
                Painel Operacional
              </h2>
              <p className="text-xs text-[#9d978d] leading-relaxed">
                Gestão simplificada de ensaios, clientes e pós-produção.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 text-xs text-red-300">
              {error === "auth_callback_failed"
                ? "Não foi possível concluir a autenticação com o Google. Tente novamente."
                : "Erro na autenticação. Por favor, tente novamente."}
            </div>
          )}

          {/* Single Sign-On Button */}
          <div className="pt-1">
            <GoogleSignInButton />
          </div>

          {/* Módulos Integrados */}
          <div className="pt-4 border-t border-[#23201c] space-y-2">
            <p className="text-[10px] uppercase font-medium tracking-wider text-[#736e65]">
              Módulos Integrados
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-[#9d978d]">
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a1917] border border-[#272420]">
                <Calendar className="w-3.5 h-3.5 text-[#c8a97e] mb-1" />
                <span>Agenda</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a1917] border border-[#272420]">
                <Film className="w-3.5 h-3.5 text-[#c8a97e] mb-1" />
                <span>Captação</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a1917] border border-[#272420]">
                <CheckSquare className="w-3.5 h-3.5 text-[#c8a97e] mb-1" />
                <span>Edição</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-sm w-full mx-auto text-center">
        <p className="text-[11px] text-[#736e65]">
          &copy; {new Date().getFullYear()} EAREC Produtora Audiovisual &bull; Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
