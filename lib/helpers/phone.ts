/**
 * Normalize phone to Indian format: +919537667404 (no spaces).
 * Accepts: "+91 9537667404", "9537667404", "919537667404", etc.
 */
export function normalizePhoneToIndia(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  const s = String(phone).replace(/\s/g, "").trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, "");

  let tenDigits: string | null = null;
  if (digits.length === 10) {
    tenDigits = digits;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    tenDigits = digits.slice(2);
  }

  if (!tenDigits) return null;

  // Indian mobile numbers start with 6-9 and have exactly 10 digits.
  if (!/^[6-9]\d{9}$/.test(tenDigits)) return null;

  return `+91${tenDigits}`;
}
