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

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, google_refresh_token")
    .eq("id", user.id)
    .single();

  const profile = rawProfile
    ? {
        id: rawProfile.id,
        email: rawProfile.email,
        full_name: rawProfile.full_name,
        avatar_url: rawProfile.avatar_url,
        hasGoogleSync: Boolean(rawProfile.google_refresh_token),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-20 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
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
