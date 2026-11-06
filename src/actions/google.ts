"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "./events";
import { syncEventToGoogleCalendar } from "@/lib/google/calendar";
import { createGoogleMeetForEvent } from "@/lib/google/meet";

export type GoogleSyncResult =
  | { success: true; googleEventId: string; htmlLink?: string | null }
  | { success: false; error: string; requiresAuth?: boolean };

export type GoogleMeetResult =
  | { success: true; meetLink: string }
  | { success: false; error: string; requiresAuth?: boolean };

export async function getGoogleStatusAction(): Promise<{
  isConnected: boolean;
  email?: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { isConnected: false };

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, google_access_token, email")
      .eq("id", user.id)
      .single();

    return {
      isConnected: Boolean(profile?.google_refresh_token || profile?.google_access_token),
      email: profile?.email || user.email,
    };
  } catch {
    return { isConnected: false };
  }
}

export async function syncCalendarAction(eventId: string): Promise<GoogleSyncResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Não autenticado." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, google_access_token")
      .eq("id", user.id)
      .single();

    if (!profile?.google_refresh_token && !profile?.google_access_token) {
      return {
        success: false,
        error: "Google Agenda desconectado. Conecte sua conta do Google na barra superior para sincronizar.",
        requiresAuth: true,
      };
    }

    const event = await getEventById(eventId);
    if (!event) {
      return { success: false, error: "Captação não encontrada." };
    }

    const result = await syncEventToGoogleCalendar(user.id, event);

    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true, ...result };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao sincronizar com Google Calendar. Verifique se concedeu acesso offline ao Google.";
    return { success: false, error: message };
  }
}

export async function generateMeetAction(eventId: string): Promise<GoogleMeetResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Não autenticado." };
    }

    const event = await getEventById(eventId);
    if (!event) {
      return { success: false, error: "Captação não encontrada." };
    }

    const meetLink = await createGoogleMeetForEvent(user.id, event);

    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true, meetLink };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao gerar link do Google Meet. Verifique suas permissões do Google.";
    return { success: false, error: message };
  }
}
