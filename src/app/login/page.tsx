import { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";

export const metadata: Metadata = {
  title: "Login | Organiza Ary",
  description: "Acesso à plataforma Organiza Ary - EAREC Produtora Audiovisual.",
};

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  return <LoginView error={error} />;
}
