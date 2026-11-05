import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientById } from "@/actions/clients";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { ClientProfileView } from "@/components/clients/ClientProfileView";

interface ClientProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientProfilePageProps) {
  const { id } = await params;
  const data = await getClientById(id);
  if (!data) return { title: "Cliente não encontrado | OrganizaAry" };

  return {
    title: `${data.client.name} (Visão 360º) | OrganizaAry`,
    description: `Perfil completo de ${data.client.name}, faturamento acumulado e histórico de captações.`,
  };
}

export default async function ClientProfilePage({ params }: ClientProfilePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const clientData = await getClientById(id);

  if (!clientData) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20 md:pb-10">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <ClientProfileView
          client={clientData.client}
          events={clientData.events}
          stats={clientData.stats}
        />
      </main>
    </div>
  );
}
