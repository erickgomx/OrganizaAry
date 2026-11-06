"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
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
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  const supabase = await createClient();

  // Parallel fetch: clients and events simultaneously
  const [clientsRes, eventsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("events")
      .select("client_id, price, status")
      .eq("user_id", user.id),
  ]);

  if (clientsRes.error) {
    console.error("Erro ao buscar clientes:", clientsRes.error);
    return [];
  }

  if (eventsRes.error) {
    console.error("Erro ao buscar eventos dos clientes:", eventsRes.error);
  }

  const clients = clientsRes.data || [];
  const events = eventsRes.data || [];

  const eventsByClient = events.reduce<Record<string, { count: number; total: number; completed: number }>>(
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

export const getClientById = cache(async (id: string): Promise<{
  client: Client;
  events: Event[];
  stats: {
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    eventsCount: number;
  };
} | null> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  const supabase = await createClient();

  // Run client and its events concurrently
  const [clientRes, eventsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("events")
      .select("*")
      .eq("client_id", id)
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  if (clientRes.error || !clientRes.data) {
    return null;
  }

  if (eventsRes.error) {
    console.error("Erro ao carregar eventos do cliente:", eventsRes.error);
  }

  const client = clientRes.data;
  const clientEvents = eventsRes.data || [];

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
});

export async function createClientAction(input: ClientInput) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.name.trim()) {
    return { error: "O nome do cliente é obrigatório." };
  }

  const supabase = await createClient();
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
  revalidatePath("/events");
  return { data };
}

export async function updateClientAction(id: string, input: ClientInput) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.name.trim()) {
    return { error: "O nome do cliente é obrigatório." };
  }

  const supabase = await createClient();
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
  revalidatePath("/events");
  return { data };
}

export async function deleteClientAction(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const supabase = await createClient();
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
  revalidatePath("/events");
  return { success: true };
}
