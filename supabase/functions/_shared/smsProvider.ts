// Single SMS provider interface. Swap the implementation (e.g. Fast2SMS) here
// without touching callers. Today this is MSG91's flow API.

export type SmsSendResult = {
  provider: string;
  messageId: string | null;
};

export function normalizeIndianPhone(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const national = digits.length > 10 ? digits.slice(-10) : digits;
  if (national.length !== 10) {
    throw new Error("Invalid phone number.");
  }
  return national;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

// Sends a transactional OTP SMS. Provider credentials live only in Edge secrets.
export async function sendServiceOtpSms(
  nationalPhone: string,
  otp: string
): Promise<SmsSendResult> {
  const authKey = requireEnv("MSG91_AUTH_KEY");
  const templateId = requireEnv("MSG91_SERVICE_OTP_TEMPLATE_ID");

  // MSG91 v5 Send OTP API. We generate the OTP ourselves and pass it as `otp`
  // (the template's ##OTP## placeholder); MSG91 only delivers it.
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", `91${nationalPhone}`);
  url.searchParams.set("otp", otp);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      authkey: authKey,
      "content-type": "application/json"
    }
  });

  const body = await response.json().catch(() => null);

  // MSG91 returns HTTP 200 with { type: "error", message } on logical failures,
  // so check the payload, not just the status code.
  if (!response.ok || body?.type === "error") {
    const detail = body?.message ?? `status ${response.status}`;
    throw new Error(`MSG91 send failed: ${detail}`);
  }

  const messageId = typeof body?.request_id === "string" ? body.request_id : null;
  return { provider: "msg91", messageId };
}
