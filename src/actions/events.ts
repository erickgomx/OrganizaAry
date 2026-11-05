"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Event, EventStatus, Client, Database } from "@/types/database";
import { syncEventToGoogleCalendar } from "@/lib/google/calendar";
import { createGoogleDriveFoldersForEvent } from "@/lib/google/drive";

export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export interface EventInput {
  clientId: string;
  title: string;
  date: string;
  location?: string | null;
  status?: EventStatus;
  price?: number;
  notes?: string | null;
}

export type EventWithClientInfo = Event & {
  client: Client;
};

export async function getEvents(statusFilter?: EventStatus): Promise<EventWithClientInfo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  let query = supabase
    .from("events")
    .select("*, client:clients(*)")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as unknown as EventWithClientInfo[];
}

export async function getEventById(id: string): Promise<EventWithClientInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  const { data, error } = await supabase
    .from("events")
    .select("*, client:clients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as EventWithClientInfo;
}

export async function createEventAction(input: EventInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.title.trim()) {
    return { error: "O título da captação é obrigatório." };
  }

  if (!input.clientId) {
    return { error: "Selecione um cliente para o evento." };
  }

  if (!input.date) {
    return { error: "A data e horário são obrigatórios." };
  }

  // Validação BOLA/IDOR: Garantir que o cliente informado pertence ao usuário autenticado
  const { data: clientOwnerCheck, error: clientOwnerError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", input.clientId)
    .eq("user_id", user.id)
    .single();

  if (clientOwnerError || !clientOwnerCheck) {
    return { error: "Cliente selecionado não encontrado ou inválido." };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      client_id: input.clientId,
      title: input.title.trim(),
      date: new Date(input.date).toISOString(),
      location: input.location?.trim() || null,
      status: input.status || "budget_lead",
      price: input.price !== undefined ? Number(input.price) : 0,
      notes: input.notes?.trim() || null,
    })
    .select("*, client:clients(*)")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Automação invisível: Sincroniza silenciosamente com Google Calendar e cria pastas no Drive se conectado
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", user.id)
      .single();

    if (profile?.google_refresh_token) {
      const eventInfo = data as unknown as EventWithClientInfo;
      syncEventToGoogleCalendar(user.id, eventInfo).catch(() => {});
      createGoogleDriveFoldersForEvent(user.id, eventInfo).catch(() => {});
    }
  } catch {
    // Automação não bloqueia a criação
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/clients/${input.clientId}`);
  return { data: data as unknown as EventWithClientInfo };
}

export async function updateEventAction(id: string, input: Partial<EventInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const updatePayload: EventUpdate = {};

  if (input.clientId !== undefined) {
    const { data: clientOwnerCheck, error: clientOwnerError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", input.clientId)
      .eq("user_id", user.id)
      .single();

    if (clientOwnerError || !clientOwnerCheck) {
      return { error: "Cliente selecionado não encontrado ou inválido." };
    }
    updatePayload.client_id = input.clientId;
  }

  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.date !== undefined) updatePayload.date = new Date(input.date).toISOString();
  if (input.location !== undefined) updatePayload.location = input.location?.trim() || null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.price !== undefined) updatePayload.price = Number(input.price);
  if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, client:clients(*)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { data: data as unknown as EventWithClientInfo };
}

export async function updateEventStatusAction(id: string, status: EventStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { data, error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, client:clients(*)")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Automação invisível: ao agendar, sincroniza agenda e drive se ainda não feito
  if (status === "scheduled") {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("google_refresh_token")
        .eq("id", user.id)
        .single();
      if (profile?.google_refresh_token) {
        const ev = data as unknown as EventWithClientInfo;
        syncEventToGoogleCalendar(user.id, ev).catch(() => {});
        createGoogleDriveFoldersForEvent(user.id, ev).catch(() => {});
      }
    } catch {}
  }

  // Automação invisível: ao finalizar evento, baixa automaticamente tarefas vinculadas
  if (status === "finished") {
    try {
      await supabase
        .from("tasks")
        .update({ is_done: true, status: "done" })
        .eq("event_id", id)
        .eq("user_id", user.id);
    } catch {}
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { data: data as unknown as EventWithClientInfo };
}

export async function deleteEventAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { success: true };
}
