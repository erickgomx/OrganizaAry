import { google } from "googleapis";
import { getAuthenticatedGoogleClient } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { EventWithClientInfo } from "@/actions/events";

/**
 * Creates a dynamic Google Meet link via Google Calendar API with conferenceData
 * for an event briefing, saving the link into the event record.
 */
export async function createGoogleMeetForEvent(
  userId: string,
  event: EventWithClientInfo
): Promise<string> {
  const auth = await getAuthenticatedGoogleClient(userId);
  const calendar = google.calendar({ version: "v3", auth });
  const supabase = await createClient();

  const startDate = new Date(event.date);
  const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour meeting

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: `[Briefing Meet] ${event.title} - ${event.client.name}`,
      description: `Reunião online de alinhamento e briefing fotográfico/audiovisual.\nCliente: ${event.client.name}\nOrganizaAry PRO.`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${event.id}-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });

  const meetLink =
    res.data.hangoutLink ||
    res.data.conferenceData?.entryPoints?.[0]?.uri ||
    res.data.htmlLink ||
    null;

  if (!meetLink) {
    throw new Error("Não foi possível gerar o link do Google Meet.");
  }

  // Persist meet_link to Supabase
  await supabase
    .from("events")
    .update({ meet_link: meetLink })
    .eq("id", event.id);

  return meetLink;
}
