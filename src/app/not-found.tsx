import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] flex flex-col items-center justify-center p-6 text-center space-y-4 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <Image
        src="/logo.png"
        alt="OrganizaAry"
        width={72}
        height={72}
        className="w-18 h-18 object-contain drop-shadow-sm select-none"
      />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[#f4eff5] tracking-tight">
          Página não encontrada (404)
        </h2>
        <p className="text-xs text-[#968a9c] max-w-xs">
          O link solicitado não existe ou foi realocado.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9873a1] hover:bg-[#bba0c1] text-[#120e15] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Ir para o Início</span>
      </Link>
    </div>
  );
}
