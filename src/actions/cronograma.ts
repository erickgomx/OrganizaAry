"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import {
  PostFormat,
  PostItem,
  PostStatus,
  SocialNetwork,
} from "@/types/cronograma";
import { Database } from "@/types/database";

export type SocialPostInsert = Database["public"]["Tables"]["social_posts"]["Insert"];
export type SocialPostUpdate = Database["public"]["Tables"]["social_posts"]["Update"];

export interface SchedulePostInput {
  clientId?: string | null;
  scheduledDate: string;
  scheduledTime: string;
  socialNetwork: SocialNetwork;
  format: PostFormat;
  theme: string;
  caption: string;
  status: PostStatus;
}

interface SocialPostJoinedRow {
  id: string;
  client_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  social_network: SocialNetwork;
  format: PostFormat;
  theme: string;
  caption: string;
  status: PostStatus;
  client?: { name?: string | null } | null;
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the table|relation .* does not exist/i.test(msg)
  );
}

function mapRowToPostItem(row: SocialPostJoinedRow): PostItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client?.name || null,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    socialNetwork: row.social_network,
    format: row.format,
    theme: row.theme,
    caption: row.caption,
    status: row.status,
  };
}

export async function getSchedulePostsAction(): Promise<{
  posts: PostItem[];
  schemaMissing: boolean;
  error?: string;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { posts: [], schemaMissing: false, error: "Não autenticado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_posts")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  if (isMissingTableError(error)) {
    return { posts: [], schemaMissing: true };
  }

  if (error) {
    return { posts: [], schemaMissing: false, error: error.message };
  }

  const rows = (data || []) as unknown as SocialPostJoinedRow[];
  return {
    posts: rows.map(mapRowToPostItem),
    schemaMissing: false,
  };
}

export async function createSchedulePostAction(input: SchedulePostInput) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const theme = input.theme?.trim();
  if (!theme) {
    return { error: "O tema / título da postagem é obrigatório." };
  }

  if (!input.scheduledDate) {
    return { error: "Informe a data da postagem." };
  }

  const supabase = await createClient();

  if (input.clientId) {
    const { data: clientOwner, error: clientErr } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("user_id", user.id)
      .single();

    if (clientErr || !clientOwner) {
      return { error: "Cliente selecionado não encontrado ou inválido." };
    }
  }

  const payload: SocialPostInsert = {
    user_id: user.id,
    client_id: input.clientId || null,
    scheduled_date: input.scheduledDate.slice(0, 10),
    scheduled_time: input.scheduledTime?.trim() || "18:00",
    social_network: input.socialNetwork,
    format: input.format,
    theme,
    caption: input.caption?.trim() || "",
    status: input.status,
  };

  const { data, error } = await supabase
    .from("social_posts")
    .insert(payload)
    .select("*, client:clients(name)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cronograma");
  return { data: mapRowToPostItem(data as unknown as SocialPostJoinedRow) };
}

export async function updateSchedulePostAction(
  id: string,
  input: Partial<SchedulePostInput>
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const supabase = await createClient();
  const payload: SocialPostUpdate = {};

  if (input.clientId !== undefined) {
    if (input.clientId) {
      const { data: clientOwner, error: clientErr } = await supabase
        .from("clients")
        .select("id")
        .eq("id", input.clientId)
        .eq("user_id", user.id)
        .single();

      if (clientErr || !clientOwner) {
        return { error: "Cliente selecionado não encontrado ou inválido." };
      }
      payload.client_id = input.clientId;
    } else {
      payload.client_id = null;
    }
  }

  if (input.scheduledDate !== undefined) {
    payload.scheduled_date = input.scheduledDate.slice(0, 10);
  }
  if (input.scheduledTime !== undefined) {
    payload.scheduled_time = input.scheduledTime.trim() || "18:00";
  }
  if (input.socialNetwork !== undefined) {
    payload.social_network = input.socialNetwork;
  }
  if (input.format !== undefined) {
    payload.format = input.format;
  }
  if (input.theme !== undefined) {
    const trimmed = input.theme.trim();
    if (!trimmed) return { error: "O tema / título é obrigatório." };
    payload.theme = trimmed;
  }
  if (input.caption !== undefined) {
    payload.caption = input.caption.trim();
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }

  const { data, error } = await supabase
    .from("social_posts")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, client:clients(name)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cronograma");
  return { data: mapRowToPostItem(data as unknown as SocialPostJoinedRow) };
}

export async function deleteSchedulePostAction(id: string) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Não autenticado." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cronograma");
  return { success: true };
}
