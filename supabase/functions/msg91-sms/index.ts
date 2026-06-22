import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type SmsHookPayload = {
  user?: {
    phone?: string | null;
  };
  sms?: {
    otp?: string | null;
  };
};

function jsonResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const nationalNumber = digits.length > 10 ? digits.slice(-10) : digits;

  if (nationalNumber.length !== 10) {
    throw new Error("Invalid phone number.");
  }

  return `+91${nationalNumber}`;
}

function toMsg91Mobile(phone: string) {
  return phone.replace("+", "");
}

async function verifySupabaseHook(req: Request, rawBody: string) {
  const hookSecret = requireEnv("AUTH_HOOK_SECRET");
  const webhook = new Webhook(hookSecret);

  webhook.verify(rawBody, {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? ""
  });
}

function extractOtpPayload(rawBody: string) {
  const payload = JSON.parse(rawBody) as SmsHookPayload;
  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;

  if (!phone || !otp) {
    throw new Error("Missing phone or OTP in Supabase SMS hook payload.");
  }

  return {
    phone: normalizeIndianPhone(phone),
    otp
  };
}

async function sendMsg91Otp(phone: string, otp: string) {
  const authKey = requireEnv("MSG91_AUTH_KEY");
  const flowId = requireEnv("MSG91_FLOW_ID");
  const otpVariableName = Deno.env.get("MSG91_OTP_VAR") ?? "otp";

  const recipient: Record<string, string> = {
    mobiles: toMsg91Mobile(phone),
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
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, "Method not allowed.");
  }

  let rawBody = "";

  try {
    rawBody = await req.text();
    await verifySupabaseHook(req, rawBody);
  } catch {
    return jsonResponse(401, "Invalid Supabase hook signature.");
  }

  try {
    const { phone, otp } = extractOtpPayload(rawBody);
    await sendMsg91Otp(phone, otp);
    return new Response(null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS hook failed.";
    return jsonResponse(500, message);
  }
});
