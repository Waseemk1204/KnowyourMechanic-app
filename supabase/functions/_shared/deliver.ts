// Delivery router. Given a service record + a message, decides push vs WhatsApp:
//   - customer has an active device  -> FCM push (record delivery, ack deadline)
//   - no device, or all tokens dead  -> WhatsApp (record delivery, state 'sent'
//     = queued; the Phase-4 worker/sender actually sends it)
// Dead (UNREGISTERED) tokens are deactivated so we stop targeting them.
//
// `admin` is a service-role Supabase client (bypasses RLS).

import { sendFcm } from "./fcm.ts";

const ACK_WINDOW_SECONDS = 45;

export type DeliverParams = {
  serviceRecordId: string;
  recipientProfileId: string | null;
  recipientPhone: string;
  kind: "otp" | "invoice";
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type DeliverResult = { channel: "push" | "whatsapp"; deliveryId: string | null; error?: string };

async function recordDelivery(
  admin: any,
  p: DeliverParams,
  channel: "push" | "whatsapp",
): Promise<string | null> {
  const row: Record<string, unknown> = {
    service_record_id: p.serviceRecordId,
    recipient_profile_id: p.recipientProfileId,
    recipient_phone: p.recipientPhone,
    kind: p.kind,
    channel,
    state: "sent",
  };
  if (channel === "push") {
    row.push_deadline_at = new Date(Date.now() + ACK_WINDOW_SECONDS * 1000).toISOString();
  }
  const { data, error } = await admin.from("notification_deliveries").insert(row).select("id").single();
  if (error) return null;
  return (data as { id: string }).id;
}

export async function routeDelivery(admin: any, p: DeliverParams): Promise<DeliverResult> {
  // Look up the recipient's active push tokens.
  let tokens: string[] = [];
  if (p.recipientProfileId) {
    const { data: devices } = await admin
      .from("user_devices")
      .select("push_token")
      .eq("profile_id", p.recipientProfileId)
      .eq("is_active", true);
    tokens = (devices ?? []).map((d: { push_token: string }) => d.push_token);
  }

  if (tokens.length > 0) {
    const deliveryId = await recordDelivery(admin, p, "push");
    try {
      const results = await sendFcm(
        tokens,
        { title: p.title, body: p.body },
        { ...(p.data ?? {}), kind: p.kind, ...(deliveryId ? { delivery_id: deliveryId } : {}) },
      );
      // Deactivate tokens FCM reports as gone (app uninstalled / token expired).
      const dead = results.filter((r) => r.unregistered).map((r) => r.token);
      if (dead.length > 0) {
        await admin.from("user_devices").update({ is_active: false, updated_at: new Date().toISOString() }).in("push_token", dead);
      }
      if (results.some((r) => r.ok)) {
        return { channel: "push", deliveryId };
      }
      // Every token failed — mark this push delivery failed and fall through to WhatsApp.
      if (deliveryId) {
        await admin.from("notification_deliveries").update({ state: "failed", error: "all tokens failed", updated_at: new Date().toISOString() }).eq("id", deliveryId);
      }
    } catch (e) {
      if (deliveryId) {
        await admin.from("notification_deliveries").update({ state: "failed", error: e instanceof Error ? e.message : String(e), updated_at: new Date().toISOString() }).eq("id", deliveryId);
      }
      // fall through to WhatsApp
    }
  }

  // No reachable device -> queue WhatsApp (Phase 4 sender/worker delivers it).
  const waId = await recordDelivery(admin, p, "whatsapp");
  return { channel: "whatsapp", deliveryId: waId };
}
