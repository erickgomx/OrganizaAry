"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Calendar, Film, CheckSquare } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface LoginViewProps {
  error?: string | string[] | undefined;
}

export function LoginView({ error }: LoginViewProps) {
  const errorMessage = Array.isArray(error) ? error[0] : error;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#120e15] text-[#f4eff5] px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#9873a1]/20 selection:text-[#bba0c1] overflow-hidden">
      {/* Subtle atmospheric ambient glow matching logo warmth */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(152, 115, 161, 0.10)_0%,_transparent_65%)] pointer-events-none"
      />

      {/* Central Login Card */}
      <motion.main
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.75,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative z-10 max-w-sm w-full mx-auto"
      >
        <div className="rounded-2xl border border-[#33293c] bg-[#1a151f]/90 p-6 sm:p-7 backdrop-blur-sm shadow-2xl space-y-6">
          {/* Logo Emblem & Heading */}
          <div className="flex flex-col items-center text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src="/logo.png"
                alt="Organiza Ary Logo"
                width={128}
                height={128}
                className="w-32 h-32 object-contain drop-shadow-md select-none"
                priority
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-1"
            >
              <h1 className="text-xl font-semibold text-[#f4eff5] tracking-tight">
                Organiza Ary
              </h1>
              <p className="text-xs text-[#968a9c] leading-relaxed">
                Gestão simplificada de ensaios, clientes e pós-produção.
              </p>
            </motion.div>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 text-xs text-red-300"
            >
              {errorMessage === "auth_callback_failed"
                ? "Não foi possível concluir a autenticação com o Google. Tente novamente."
                : "Erro na autenticação. Por favor, tente novamente."}
            </motion.div>
          )}

          {/* Single Sign-On Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="pt-1"
          >
            <GoogleSignInButton />
          </motion.div>

          {/* Módulos Integrados */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="pt-4 border-t border-[#33293c] space-y-2"
          >
            <p className="text-[10px] uppercase font-medium tracking-wider text-[#6e6375]">
              Módulos Integrados
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-[#968a9c]">
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a151f] border border-[#33293c] transition-colors hover:border-[#9873a1]/30">
                <Calendar className="w-3.5 h-3.5 text-[#9873a1] mb-1" />
                <span>Agenda</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a151f] border border-[#33293c] transition-colors hover:border-[#9873a1]/30">
                <Film className="w-3.5 h-3.5 text-[#9873a1] mb-1" />
                <span>Captação</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-[#1a151f] border border-[#33293c] transition-colors hover:border-[#9873a1]/30">
                <CheckSquare className="w-3.5 h-3.5 text-[#9873a1] mb-1" />
                <span>Tarefas</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
