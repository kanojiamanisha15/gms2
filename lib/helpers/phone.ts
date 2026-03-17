/**
 * Normalize phone to Indian format: +919537667404 (no spaces).
 * Accepts: "+91 9537667404", "9537667404", "919537667404", etc.
 */
export function normalizePhoneToIndia(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const s = String(phone).replace(/\s/g, "").trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const tenDigits = digits.length === 10 ? digits : digits.slice(-10);
  return `+91${tenDigits}`;
}
