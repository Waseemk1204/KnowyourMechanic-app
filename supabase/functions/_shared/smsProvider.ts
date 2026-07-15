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
  const flowId = requireEnv("MSG91_SERVICE_OTP_FLOW_ID");
  const otpVariableName = Deno.env.get("MSG91_OTP_VAR") ?? "otp";

  const recipient: Record<string, string> = {
    mobiles: `91${nationalPhone}`,
    [otpVariableName]: otp
  };

  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      template_id: flowId,
      short_url: "0",
      recipients: [recipient]
    })
  });

  if (!response.ok) {
    throw new Error(`MSG91 request failed with status ${response.status}.`);
  }

  let messageId: string | null = null;
  try {
    const body = await response.json();
    messageId = typeof body?.request_id === "string" ? body.request_id : null;
  } catch {
    messageId = null;
  }

  return { provider: "msg91", messageId };
}
