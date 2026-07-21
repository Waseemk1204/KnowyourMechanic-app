// MSG91 WhatsApp template sender (Deno). Uses the same MSG91_AUTH_KEY as SMS.
// "Meta Price is Your Price" — no reseller markup. Template names + the
// integrated WhatsApp number come from Edge secrets so nothing is hard-coded.

export type WhatsappResult = { messageId: string | null };

export async function sendWhatsappTemplate(opts: {
  nationalPhone: string;      // 10-digit
  templateName: string;
  bodyVars: string[];         // fills body_1, body_2, ... in order
  langCode?: string;
}): Promise<WhatsappResult> {
  const authKey = Deno.env.get("MSG91_AUTH_KEY");
  const integratedNumber = Deno.env.get("MSG91_WHATSAPP_NUMBER");
  const namespace = Deno.env.get("MSG91_WA_NAMESPACE") || undefined;
  if (!authKey) throw new Error("MSG91_AUTH_KEY is not configured.");
  if (!integratedNumber) throw new Error("MSG91_WHATSAPP_NUMBER is not configured.");

  const components: Record<string, { type: string; value: string }> = {};
  opts.bodyVars.forEach((v, i) => { components[`body_${i + 1}`] = { type: "text", value: v }; });

  const body = {
    integrated_number: integratedNumber,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: opts.templateName,
        language: { code: opts.langCode || "en", policy: "deterministic" },
        ...(namespace ? { namespace } : {}),
        to_and_components: [
          { to: [`91${opts.nationalPhone}`], components },
        ],
      },
    },
  };

  const res = await fetch("https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
    method: "POST",
    headers: { authkey: authKey, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || j?.type === "error") {
    throw new Error(`WhatsApp send failed: ${j?.message ?? `status ${res.status}`}`);
  }
  return { messageId: typeof j?.request_id === "string" ? j.request_id : null };
}
