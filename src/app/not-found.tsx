import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0e0d0c] text-[#f6f4ef] flex flex-col items-center justify-center p-6 text-center space-y-4 selection:bg-[#c8a97e]/20 selection:text-[#dfba88]">
      <div className="w-16 h-16 rounded-2xl bg-[#161513] border border-[#2d2822] flex items-center justify-center p-2.5 shadow-sm">
        <Image
          src="/logo.png"
          alt="OrganizaAry"
          width={64}
          height={64}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[#f6f4ef] tracking-tight">
          Página não encontrada (404)
        </h2>
        <p className="text-xs text-[#8e887f] max-w-xs">
          O link solicitado não existe ou foi realocado.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#dfba88] text-[#121110] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Ir para o Início</span>
      </Link>
    </div>
  );
}
