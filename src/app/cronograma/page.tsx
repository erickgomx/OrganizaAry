import { redirect } from "next/navigation";
import {
  createClient,
  getAuthenticatedUser,
  getAuthenticatedProfile,
} from "@/lib/supabase/server";
import { getSchedulePostsAction } from "@/actions/cronograma";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { CronogramaOverview } from "@/components/cronograma/CronogramaOverview";

export const metadata = {
  title: "Cronograma | OrganizaAry",
  description: "Gerenciamento e exportação de cronograma de postagens em PDF.",
};

export default async function CronogramaPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const [profile, scheduleData, clientsRes] = await Promise.all([
    getAuthenticatedProfile(user.id),
    getSchedulePostsAction(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  const clients = (clientsRes.data || []) as { id: string; name: string }[];

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-24 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <AppNavbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <CronogramaOverview
          initialPosts={scheduleData.posts}
          clients={clients}
          schemaMissing={scheduleData.schemaMissing}
        />
      </main>
    </div>
  );
}
