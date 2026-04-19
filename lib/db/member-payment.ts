import type { PoolClient } from "pg";
import { queryOne } from "@/lib/db/db";

export type ResolvedMemberPayment = {
  payment_mode: string | null;
  bank_id: number | null;
};

async function bankRowForGym(
  client: PoolClient | null,
  bankId: number,
  gymId: number | null
): Promise<{ id: number } | null> {
  const sql = `SELECT id FROM banks WHERE id = $1 AND ($2::int IS NULL OR gym_id = $2) LIMIT 1`;
  if (client) {
    const r = await client.query<{ id: number }>(sql, [bankId, gymId]);
    return r.rows[0] ?? null;
  }
  return queryOne<{ id: number }>(sql, [bankId, gymId]);
}

/**
 * When unpaid: clears payment_mode and bank_id.
 * When paid: payment_mode required (cash | bank); bank_id required for bank mode and must belong to gym.
 */
export async function resolveMemberPaymentFields(
  paymentStatus: string,
  paymentModeInput: unknown,
  bankIdInput: unknown,
  memberGymId: number | null,
  client: PoolClient | null = null
): Promise<{ ok: true; value: ResolvedMemberPayment } | { ok: false; error: string }> {
  if (paymentStatus !== "paid") {
    return { ok: true, value: { payment_mode: null, bank_id: null } };
  }

  const modeRaw =
    paymentModeInput != null && String(paymentModeInput).trim()
      ? String(paymentModeInput).trim().toLowerCase()
      : "";
  if (!modeRaw || !["cash", "bank"].includes(modeRaw)) {
    return { ok: false, error: "Payment mode is required when payment status is paid (cash or bank)" };
  }

  if (modeRaw === "cash") {
    return { ok: true, value: { payment_mode: "cash", bank_id: null } };
  }

  const bankIdNum =
    bankIdInput != null && String(bankIdInput).trim() !== "" ? parseInt(String(bankIdInput), 10) : NaN;
  if (!Number.isFinite(bankIdNum) || bankIdNum <= 0) {
    return { ok: false, error: "Bank is required when payment mode is bank" };
  }

  const row = await bankRowForGym(client, bankIdNum, memberGymId);
  if (!row) {
    return { ok: false, error: "Selected bank is not valid for this gym" };
  }

  return { ok: true, value: { payment_mode: "bank", bank_id: bankIdNum } };
}
