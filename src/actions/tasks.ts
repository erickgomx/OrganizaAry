"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Task, TaskPriority, TaskStatus, Database } from "@/types/database";

export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export interface TaskInput {
  title: string;
  description?: string | null;
  eventId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
}

export type TaskWithDetails = Task & {
  event?: {
    id: string;
    title: string;
    client?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

export async function getTasks(eventId?: string): Promise<TaskWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado.");
  }

  let query = supabase
    .from("tasks")
    .select("*, event:events(id, title, client:clients(id, name))")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar tarefas:", error);
    return [];
  }

  return (data as unknown as TaskWithDetails[]) || [];
}

export async function createTaskAction(input: TaskInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  if (!input.title.trim()) {
    return { error: "O título da tarefa é obrigatório." };
  }

  const status = input.status || "todo";
  const isDone = status === "done";

  // Validação BOLA/IDOR: Garantir que a captação vinculada pertence ao usuário autenticado
  if (input.eventId) {
    const { data: eventOwnerCheck, error: eventOwnerError } = await supabase
      .from("events")
      .select("id")
      .eq("id", input.eventId)
      .eq("user_id", user.id)
      .single();

    if (eventOwnerError || !eventOwnerCheck) {
      return { error: "Captação vinculada não encontrada ou inválida." };
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      event_id: input.eventId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || "medium",
      status: status,
      is_done: isDone,
      due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
    })
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { data: data as unknown as TaskWithDetails };
}

export async function updateTaskAction(id: string, input: Partial<TaskInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const payload: TaskUpdate = {};

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.eventId !== undefined) {
    if (input.eventId) {
      const { data: eventOwnerCheck, error: eventOwnerError } = await supabase
        .from("events")
        .select("id")
        .eq("id", input.eventId)
        .eq("user_id", user.id)
        .single();

      if (eventOwnerError || !eventOwnerCheck) {
        return { error: "Captação vinculada não encontrada ou inválida." };
      }
    }
    payload.event_id = input.eventId || null;
  }
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.status !== undefined) {
    payload.status = input.status;
    payload.is_done = input.status === "done";
  }
  if (input.dueDate !== undefined) {
    payload.due_date = input.dueDate ? new Date(input.dueDate).toISOString() : null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { data: data as unknown as TaskWithDetails };
}

export async function updateTaskStatusAction(id: string, status: TaskStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const isDone = status === "done";

  const { data, error } = await supabase
    .from("tasks")
    .update({
      status,
      is_done: isDone,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { data: data as unknown as TaskWithDetails };
}

export async function toggleTaskDoneAction(id: string, currentIsDone: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const nextIsDone = !currentIsDone;
  const nextStatus: TaskStatus = nextIsDone ? "done" : "todo";

  const { data, error } = await supabase
    .from("tasks")
    .update({
      is_done: nextIsDone,
      status: nextStatus,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, event:events(id, title, client:clients(id, name))")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { data: data as unknown as TaskWithDetails };
}

export async function completeAllTasksForEventAction(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      is_done: true,
    })
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTaskAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { success: true };
}
