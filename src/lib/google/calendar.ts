import { google } from "googleapis";
import { getAuthenticatedGoogleClient } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { EventWithClientInfo } from "@/actions/events";

/**
 * Syncs an event with Google Calendar API using the authenticated user's credentials.
 * Automatically inserts a new event or updates an existing calendar event.
 */
export async function syncEventToGoogleCalendar(
  userId: string,
  event: EventWithClientInfo
): Promise<{ googleEventId: string; htmlLink?: string | null }> {
  const auth = await getAuthenticatedGoogleClient(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const supabase = await createClient();

  const parsedDate = new Date(event.date);
  const startDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours default duration

  const clientName = event.client?.name || "Cliente";
  const clientPhone = event.client?.phone || "Não informado";
  const clientEmail = event.client?.email || "Não informado";

  const eventPayload = {
    summary: `[OrganizaAry] ${event.title} - ${clientName}`,
    description: [
      `Captação / Evento Fotográfico gerenciado via OrganizaAry.`,
      `Cliente: ${clientName}`,
      `Telefone: ${clientPhone}`,
      `E-mail: ${clientEmail}`,
      `Valor: R$ ${Number(event.price || 0).toFixed(2)}`,
      `Status atual: ${event.status}`,
      event.notes ? `\nBriefing & Notas:\n${event.notes}` : "",
    ].join("\n"),
    location: event.location || undefined,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "America/Sao_Paulo",
    },
  };

  if (event.google_event_id) {
    try {
      const res = await calendar.events.patch({
        calendarId: "primary",
        eventId: event.google_event_id,
        requestBody: eventPayload,
      });

      return {
        googleEventId: event.google_event_id,
        htmlLink: res.data.htmlLink,
      };
    } catch (err: unknown) {
      console.warn("Evento anterior não encontrado no Google Calendar. Criando novo...", err);
    }
  }

  // Insert brand new event
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventPayload,
  });

  const newGoogleId = res.data.id!;

  // Persist google_event_id in Supabase
  await supabase
    .from("events")
    .update({ google_event_id: newGoogleId })
    .eq("id", event.id);

  return {
    googleEventId: newGoogleId,
    htmlLink: res.data.htmlLink,
  };
}

/**
 * Removes an event from Google Calendar when deleted in OrganizaAry.
 */
export async function deleteGoogleCalendarEvent(
  userId: string,
  googleEventId: string
): Promise<boolean> {
  try {
    const auth = await getAuthenticatedGoogleClient(userId);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });

    return true;
  } catch (err: unknown) {
    // Se o evento já foi excluído manualmente na agenda (404/410), ignora
    console.warn("Aviso ao remover evento do Google Calendar:", err);
    return false;
  }
}
