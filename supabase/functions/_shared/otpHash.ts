// One place that defines how a service OTP is hashed. The pepper is a server
// secret (never stored in the DB); the salt is per-row. A leaked service_otps
// table therefore cannot be brute-forced offline without the pepper, and online
// guessing is bounded by attempt_count / max_attempts.

export function randomOtpSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

export async function hashServiceOtp(otp: string, salt: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${salt}:${otp}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
