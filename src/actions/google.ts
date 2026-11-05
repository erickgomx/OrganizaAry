"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "./events";
import { syncEventToGoogleCalendar } from "@/lib/google/calendar";
import { createGoogleMeetForEvent } from "@/lib/google/meet";
import { createGoogleDriveFoldersForEvent } from "@/lib/google/drive";

export type GoogleSyncResult =
  | { success: true; googleEventId: string; htmlLink?: string | null }
  | { success: false; error: string };

export type GoogleMeetResult =
  | { success: true; meetLink: string }
  | { success: false; error: string };

export type GoogleDriveResult =
  | { success: true; folderId: string; folderUrl: string }
  | { success: false; error: string };

export async function syncCalendarAction(eventId: string): Promise<GoogleSyncResult> {
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

export async function createDriveFoldersAction(eventId: string): Promise<GoogleDriveResult> {
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

    const result = await createGoogleDriveFoldersForEvent(user.id, event);

    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true, ...result };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao gerar pastas no Google Drive. Verifique se o escopo de Drive foi concedido.";
    return { success: false, error: message };
  }
}
