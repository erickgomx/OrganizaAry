"use server";

import { revalidatePath } from "next/cache";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "./events";
import { syncEventToGoogleCalendar, deleteGoogleCalendarEvent } from "@/lib/google/calendar";
import { createGoogleMeetForEvent } from "@/lib/google/meet";
import { getAuthenticatedGoogleClient } from "@/lib/google/auth";

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
      .maybeSingle();

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
      .maybeSingle();

    if (!profile?.google_refresh_token && !profile?.google_access_token) {
      return {
        success: false,
        error: "Google Agenda não conectado.",
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token, google_access_token")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.google_refresh_token && !profile?.google_access_token) {
      return {
        success: false,
        error: "Google Meet não conectado.",
        requiresAuth: true,
      };
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

export async function removeFromCalendarAction(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
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

    // Se o evento possuir ID da agenda do Google, tenta remover lá
    if (event.google_event_id) {
      await deleteGoogleCalendarEvent(user.id, event.google_event_id);
    }

    // Desvincula na tabela 'events' do Supabase
    const { error: updateError } = await supabase
      .from("events")
      .update({ google_event_id: null })
      .eq("id", eventId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/events");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao desvincular evento da Google Agenda.";
    return { success: false, error: message };
  }
}

export interface GoogleDiagnosticInfo {
  authenticated: boolean;
  userEmail?: string;
  hasProfileRecord: boolean;
  profileError?: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt?: string | null;
  hasClientIdEnv: boolean;
  hasClientSecretEnv: boolean;
  calendarApiStatus: "ok" | "error" | "not_connected";
  calendarApiMessage: string;
  solutionSteps: string[];
}

export async function diagnoseGoogleIntegrationAction(): Promise<GoogleDiagnosticInfo> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return {
        authenticated: false,
        hasProfileRecord: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        hasClientIdEnv: Boolean(process.env.GOOGLE_CLIENT_ID),
        hasClientSecretEnv: Boolean(process.env.GOOGLE_CLIENT_SECRET),
        calendarApiStatus: "not_connected",
        calendarApiMessage: "Usuário não está autenticado na plataforma.",
        solutionSteps: ["Faça login na plataforma com o botão 'Entrar com Google'."],
      };
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, google_access_token, google_refresh_token, token_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
    const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);

    if (profileErr) {
      const isMissingColumn =
        profileErr.message?.includes("google_access_token") ||
        profileErr.message?.includes("column");

      return {
        authenticated: true,
        userEmail: user.email,
        hasProfileRecord: false,
        profileError: profileErr.message,
        hasAccessToken: false,
        hasRefreshToken: false,
        hasClientIdEnv: hasClientId,
        hasClientSecretEnv: hasClientSecret,
        calendarApiStatus: "error",
        calendarApiMessage: isMissingColumn
          ? "As colunas para salvar os tokens do Google não existem na tabela 'profiles' do seu Supabase."
          : `Erro ao consultar perfil no Supabase: ${profileErr.message}`,
        solutionSteps: [
          "Abra o Supabase Dashboard > SQL Editor.",
          "Execute o script SQL fornecido para criar as colunas e políticas de segurança.",
          "Depois, clique em 'Conectar Agenda' no OrganizaAry.",
        ],
      };
    }

    if (!profile) {
      return {
        authenticated: true,
        userEmail: user.email,
        hasProfileRecord: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        hasClientIdEnv: hasClientId,
        hasClientSecretEnv: hasClientSecret,
        calendarApiStatus: "error",
        calendarApiMessage:
          "O seu usuário ainda não possui registro na tabela 'profiles' do Supabase.",
        solutionSteps: [
          "Abra o Supabase Dashboard > SQL Editor.",
          "Execute o script de sincronização para criar o registro do seu perfil a partir de auth.users.",
          "Depois, clique em 'Conectar Agenda' na barra superior do OrganizaAry.",
        ],
      };
    }

    const hasAccessToken = Boolean(profile?.google_access_token);
    const hasRefreshToken = Boolean(profile?.google_refresh_token);

    if (!hasAccessToken && !hasRefreshToken) {
      return {
        authenticated: true,
        userEmail: user.email,
        hasProfileRecord: true,
        hasAccessToken: false,
        hasRefreshToken: false,
        hasClientIdEnv: hasClientId,
        hasClientSecretEnv: hasClientSecret,
        calendarApiStatus: "not_connected",
        calendarApiMessage:
          "Os tokens do Google NÃO estão gravados no seu perfil. O Google não concedeu ou o Supabase não salvou as permissões de calendário.",
        solutionSteps: [
          "Verifique se no Google Cloud Console > APIs e Serviços > 'Tela de consentimento OAuth' > 'Escopos', você adicionou o escopo '.../auth/calendar' ou '.../auth/calendar.events'.",
          "No Google Cloud Console, certifique-se de que a 'Google Calendar API' está Ativada na Biblioteca de APIs.",
          "Clique em 'Conectar Agenda' no topo do OrganizaAry e confirme todas as permissões solicitadas na tela do Google.",
        ],
      };
    }

    // Se temos tokens, fazemos um teste real na Google Calendar API
    try {
      const auth = await getAuthenticatedGoogleClient(user.id);
      const calendar = google.calendar({ version: "v3", auth });
      const testRes = await calendar.calendarList.list({ maxResults: 1 });

      const calendarTitle = testRes.data.items?.[0]?.summary || "Principal";

      return {
        authenticated: true,
        userEmail: user.email,
        hasProfileRecord: true,
        hasAccessToken,
        hasRefreshToken,
        tokenExpiresAt: profile?.token_expires_at,
        hasClientIdEnv: hasClientId,
        hasClientSecretEnv: hasClientSecret,
        calendarApiStatus: "ok",
        calendarApiMessage: `Google Calendar conectado e autenticado com sucesso! Agenda identificada: "${calendarTitle}".`,
        solutionSteps: ["Tudo pronto! Seus ensaios já podem ser sincronizados normalmente."],
      };
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
      const isApiDisabled =
        msg.includes("Google Calendar API has not been used") ||
        msg.includes("disabled") ||
        msg.includes("accessNotConfigured");

      const isInsufficientPermission =
        msg.includes("insufficient") ||
        msg.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT");

      const isInvalidGrant =
        msg.includes("invalid_grant") || msg.includes("Token has been expired or revoked");

      const errorSteps: string[] = [];

      if (isApiDisabled) {
        errorSteps.push(
          "A Google Calendar API está DESATIVADA no Google Cloud.",
          "Acesse: Google Cloud Console > APIs e Serviços > Biblioteca.",
          "Pesquise 'Google Calendar API' e clique no botão azul 'Ativar' (Enable)."
        );
      } else if (isInsufficientPermission) {
        errorSteps.push(
          "Permissão de calendário não concedida na conta Google.",
          "Acesse: Google Cloud Console > APIs e Serviços > Tela de consentimento OAuth > Escopos.",
          "Clique em 'Adicionar ou remover escopos' e marque '.../auth/calendar' e '.../auth/calendar.events'.",
          "Depois, clique em 'Conectar Agenda' na barra superior do OrganizaAry e aprove o acesso."
        );
      } else if (isInvalidGrant) {
        errorSteps.push(
          "O token do Google expirou ou foi revogado.",
          "Clique em 'Conectar Agenda' na barra superior para renovar o acesso."
        );
      } else if (!hasClientId || !hasClientSecret) {
        errorSteps.push(
          "As variáveis GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não foram configuradas nas variáveis de ambiente da Vercel.",
          "Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel para permitir renovação automática dos tokens."
        );
      } else {
        errorSteps.push(`Erro retornado pelo Google: ${msg}`);
      }

      return {
        authenticated: true,
        userEmail: user.email,
        hasProfileRecord: true,
        hasAccessToken,
        hasRefreshToken,
        tokenExpiresAt: profile?.token_expires_at,
        hasClientIdEnv: hasClientId,
        hasClientSecretEnv: hasClientSecret,
        calendarApiStatus: "error",
        calendarApiMessage: `Falha ao consultar Google Calendar: ${msg}`,
        solutionSteps: errorSteps,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      authenticated: false,
      hasProfileRecord: false,
      hasAccessToken: false,
      hasRefreshToken: false,
      hasClientIdEnv: false,
      hasClientSecretEnv: false,
      calendarApiStatus: "error",
      calendarApiMessage: `Erro inesperado: ${msg}`,
      solutionSteps: ["Tente novamente ou verifique as configurações."],
    };
  }
}
