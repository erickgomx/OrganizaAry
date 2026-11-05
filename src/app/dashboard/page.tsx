import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { EventWithClientInfo } from "@/actions/events";
import { TaskWithDetails } from "@/actions/tasks";

export const metadata = {
  title: "Início | OrganizaAry",
  description: "Visão simples e direta dos seus ensaios e tarefas de edição.",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch concurrently
  const [profileRes, clientsRes, eventsRes, tasksRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, google_refresh_token")
      .eq("id", user.id)
      .single(),
    supabase.from("clients").select("id, name, phone").eq("user_id", user.id),
    supabase
      .from("events")
      .select("*, client:clients(*)")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("tasks")
      .select("*, event:events(title, client:clients(name))")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const rawProfile = profileRes.data;
  const profile = rawProfile
    ? {
        id: rawProfile.id,
        email: rawProfile.email,
        full_name: rawProfile.full_name,
        avatar_url: rawProfile.avatar_url,
        hasGoogleSync: Boolean(rawProfile.google_refresh_token),
      }
    : null;
  const clients = (clientsRes.data || []) as { id: string; name: string; phone?: string | null }[];
  const events = (eventsRes.data || []) as unknown as EventWithClientInfo[];
  const tasks = (tasksRes.data || []) as unknown as TaskWithDetails[];

  const userName = profile?.full_name || user.email?.split("@")[0] || "Fotógrafo(a)";

  return (
    <div className="min-h-screen bg-[#120e15] text-[#f4eff5] pb-20 md:pb-12 selection:bg-[#9873a1]/20 selection:text-[#bba0c1]">
      <AppNavbar profile={profile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <DashboardOverview
          events={events}
          tasks={tasks}
          clients={clients}
          userName={userName}
        />
      </main>
    </div>
  );
}
