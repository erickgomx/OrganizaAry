"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Client, Event } from "@/types/database";

export interface ClientInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ClientWithStats extends Client {
  eventsCount: number;
  totalRevenue: number;
  completedRevenue: number;
}

export async function getClients(): Promise<ClientWithStats[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (clientsError) {
    console.error("Erro ao buscar clientes:", clientsError);
    return [];
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("client_id, price, status")
    .eq("user_id", user.id);

  if (eventsError) {
    console.error("Erro ao buscar eventos dos clientes:", eventsError);
  }

  const eventsByClient = (events || []).reduce<Record<string, { count: number; total: number; completed: number }>>(
    (acc, ev) => {
      if (!acc[ev.client_id]) {
        acc[ev.client_id] = { count: 0, total: 0, completed: 0 };
      }
      const price = Number(ev.price) || 0;
      acc[ev.client_id].count += 1;
      acc[ev.client_id].total += price;
      if (ev.status === "finished") {
        acc[ev.client_id].completed += price;
      }
      return acc;
    },
    {}
  );

  return clients.map((client) => {
    const stats = eventsByClient[client.id] || { count: 0, total: 0, completed: 0 };
    return {
      ...client,
      eventsCount: stats.count,
      totalRevenue: stats.total,
      completedRevenue: stats.completed,
    };
  });
}

export async function getClientById(id: string): Promise<{
  client: Client;
  events: Event[];
  stats: {
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    eventsCount: number;
  };
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return null;
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("client_id", id)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (eventsError) {
    console.error("Erro ao carregar eventos do cliente:", eventsError);
  }

  const clientEvents = events || [];

  let totalRevenue = 0;
  let completedRevenue = 0;
  let pendingRevenue = 0;

  for (const ev of clientEvents) {
    const price = Number(ev.price) || 0;
    totalRevenue += price;
    if (ev.status === "finished") {
      completedRevenue += price;
    } else {
      pendingRevenue += price;
    }
  }

  return {
    client,
    events: clientEvents,
    stats: {
      totalRevenue,
      completedRevenue,
      pendingRevenue,
      eventsCount: clientEvents.length,
    },
  };
}

export async function createClientAction(input: ClientInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.name.trim()) {
    return { error: "O nome do cliente é obrigatório." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { data };
}

export async function updateClientAction(id: string, input: ClientInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.name.trim()) {
    return { error: "O nome do cliente é obrigatório." };
  }

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { success: true };
}
