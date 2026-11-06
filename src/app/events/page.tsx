import { redirect } from "next/navigation";
import { getAuthenticatedUser, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getEvents } from "@/actions/events";
import { getClients } from "@/actions/clients";
import { getTasks } from "@/actions/tasks";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { EventsView } from "@/components/events/EventsView";

export const metadata = {
  title: "Trabalhos | OrganizaAry",
  description: "Agenda de ensaios e tarefas em um fluxo unificado e simples.",
};

export default async function EventsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // All 4 fetches run in parallel with zero waterfall
  const [profile, events, clients, tasks] = await Promise.all([
    getAuthenticatedProfile(user.id),
    getEvents(),
    getClients(),
    getTasks(),
  ]);

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-20 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <AppNavbar profile={profile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <EventsView
          initialEvents={events}
          initialTasks={tasks}
          clients={clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        />
      </main>
    </div>
  );
}
