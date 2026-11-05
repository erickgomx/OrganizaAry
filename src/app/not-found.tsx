import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center p-2 shadow-inner">
        <Image
          src="/logo.png"
          alt="OrganizaAry"
          width={64}
          height={64}
          className="w-full h-full object-contain"
        />
      </div>
      <h2 className="text-xl font-bold text-white">Página não encontrada (404)</h2>
      <p className="text-xs text-neutral-400 max-w-sm">
        O link solicitado não foi encontrado ou foi movido.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Ir para o Início</span>
      </Link>
    </div>
  );
}
