// FCM HTTP v1 sender for Supabase Edge (Deno). Mints a short-lived Google OAuth
// access token from the service-account JSON (stored in the FCM_SERVICE_ACCOUNT
// secret) and sends notification+data messages. Reports UNREGISTERED tokens so
// the caller can deactivate dead devices and fall back to WhatsApp.

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) => base64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(claim)}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${base64url(new Uint8Array(sig))}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) {
    throw new Error(`FCM auth failed: ${j ? JSON.stringify(j) : res.status}`);
  }
  cachedToken = { token: j.access_token, exp: now + (j.expires_in ?? 3600) };
  return j.access_token;
}

export type FcmResult = { token: string; ok: boolean; unregistered: boolean; error?: string };

// Send one message per token (v1 has no multicast). Data values must be strings.
export async function sendFcm(
  tokens: string[],
  notification: { title: string; body: string },
  data: Record<string, string>,
): Promise<FcmResult[]> {
  const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!saRaw) throw new Error("FCM_SERVICE_ACCOUNT is not configured.");
  const sa = JSON.parse(saRaw) as ServiceAccount;
  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const out: FcmResult[] = [];
  for (const token of tokens) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: { token, notification, data, android: { priority: "high" } },
        }),
      });
      if (res.ok) {
        out.push({ token, ok: true, unregistered: false });
        continue;
      }
      const err = await res.json().catch(() => null);
      const status: string | undefined = err?.error?.status;
      const detailCode: string | undefined = err?.error?.details?.find?.((d: any) => d.errorCode)?.errorCode;
      const unregistered = detailCode === "UNREGISTERED" || status === "NOT_FOUND" || res.status === 404;
      out.push({ token, ok: false, unregistered, error: err?.error?.message ?? `status ${res.status}` });
    } catch (e) {
      out.push({ token, ok: false, unregistered: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
