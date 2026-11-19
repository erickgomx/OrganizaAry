import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification, setVapidDetails } from "web-push";
import { Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cooldown mínimo de 25 min no servidor para evitar rajadas caso o cron dispare antes da hora
const MIN_COOLDOWN_MS = 25 * 60 * 1000;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contato@organizaary.app";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "Chaves VAPID não configuradas" },
      { status: 500 }
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Credenciais do Supabase (service role) não configuradas" },
      { status: 500 }
    );
  }

  setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, last_notified_at");

  if (error) {
    console.error("Erro ao buscar push_subscriptions:", error);
    return NextResponse.json(
      { error: "Erro ao consultar inscrições" },
      { status: 500 }
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, removed: 0 });
  }

  const now = Date.now();
  const eligible = subscriptions.filter((sub) => {
    if (!sub.last_notified_at) return true;
    const lastMs = new Date(sub.last_notified_at).getTime();
    if (!Number.isFinite(lastMs)) return true;
    return now - lastMs >= MIN_COOLDOWN_MS;
  });

  const skipped = subscriptions.length - eligible.length;

  if (eligible.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped, removed: 0 });
  }

  const nowIso = new Date(now).toISOString();
  await supabase
    .from("push_subscriptions")
    .update({ last_notified_at: nowIso, updated_at: nowIso })
    .in(
      "id",
      eligible.map((sub) => sub.id)
    );

  const payload = JSON.stringify({
    title: "Beba agua Ary!",
    body: "Já se passaram 30 minutos. Hora de se hidratar!",
    url: "/dashboard",
    tag: "water-reminder",
  });

  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    eligible.map(async (sub) => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        } else {
          console.error("Erro ao enviar Web Push para", sub.endpoint, err);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    removed: expiredIds.length,
  });
}
