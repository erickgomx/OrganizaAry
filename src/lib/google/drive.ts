import { google } from "googleapis";
import { getAuthenticatedGoogleClient } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { EventWithClientInfo } from "@/actions/events";

/**
 * Creates structured Google Drive folders for an event:
 * Format: "[YYYY/MM] - [Cliente] - [Evento]"
 * Inside:
 *   ├── RAWs
 *   └── Entregas
 *
 * Saves drive_folder_id and drive_folder_url in the events table.
 */
export async function createGoogleDriveFoldersForEvent(
  userId: string,
  event: EventWithClientInfo
): Promise<{ folderId: string; folderUrl: string }> {
  const auth = await getAuthenticatedGoogleClient(userId);
  const drive = google.drive({ version: "v3", auth });
  const supabase = await createClient();

  const eventDate = new Date(event.date);
  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, "0");

  const rootFolderName = `[${year}/${month}] - [${event.client.name}] - [${event.title}]`;

  // 1. Create Root Event Folder
  const rootFolderRes = await drive.files.create({
    requestBody: {
      name: rootFolderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name, webViewLink",
  });

  const rootFolderId = rootFolderRes.data.id;
  const webViewLink = rootFolderRes.data.webViewLink;

  if (!rootFolderId) {
    throw new Error("Falha ao criar pasta principal no Google Drive.");
  }

  // 2. Create subfolder: RAWs
  await drive.files.create({
    requestBody: {
      name: "RAWs",
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });

  // 3. Create subfolder: Entregas
  await drive.files.create({
    requestBody: {
      name: "Entregas",
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });

  const folderUrl = webViewLink || `https://drive.google.com/drive/folders/${rootFolderId}`;

  // Persist into Supabase events table
  await supabase
    .from("events")
    .update({
      drive_folder_id: rootFolderId,
      drive_folder_url: folderUrl,
    })
    .eq("id", event.id);

  return {
    folderId: rootFolderId,
    folderUrl,
  };
}
