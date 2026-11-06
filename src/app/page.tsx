import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function RootPage() {
  try {
    const user = await getAuthenticatedUser();

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }
}
