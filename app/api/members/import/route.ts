import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import { insertNotification } from "@/lib/db/notifications";
import { generateMemberId } from "@/lib/utils/member-id";
import { normalizePhoneToIndia } from "@/lib/helpers";
import type { IMemberData, IMemberRow } from "@/types";
import { resolveMemberPaymentFields } from "@/lib/db/member-payment";

type ImportMemberRowInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  membershipType?: string;
  joinDate?: string;
  expiryDate?: string | null;
  status?: "active" | "inactive" | "expired" | string;
  paymentStatus?: "paid" | "unpaid" | string;
  paymentMode?: string | null;
  bankId?: number | string | null;
  paymentAmount?: number | string | null;
  gymId?: number | null;
};

type ImportError = {
  rowNumber: number;
  message: string;
};

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function mapMemberRowToResponse(row: IMemberRow): IMemberData {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    membershipType: row.membership_type,
    joinDate: row.join_date,
    expiryDate: row.expiry_date,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMode: row.payment_mode ?? null,
    paymentAmount: parseFloat(row.payment_amount ?? "0"),
    bankId: row.bank_id ?? null,
    bankName: row.bank_name ?? null,
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function parseDate(raw: unknown): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function parseNumber(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** POST /api/members/import - Bulk import members from validated rows */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_IMPORT);
  if ("error" in authz) return authz.error;

  try {
    const body = (await request.json()) as { rows?: ImportMemberRowInput[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No rows provided for import" },
        { status: 400 }
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Import limit exceeded. Maximum 5000 rows per upload." },
        { status: 400 }
      );
    }

    const pool = getPool();
    const client = await pool.connect();
    const insertedMembers: IMemberData[] = [];
    const errors: ImportError[] = [];
    let importedCount = 0;

    try {
      await client.query("BEGIN");

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 2;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const membershipType =
          typeof row.membershipType === "string" ? row.membershipType.trim() : "";
        const email = row.email != null ? String(row.email).trim() || null : null;
        const phoneRaw = row.phone != null ? String(row.phone).trim() || null : null;
        const phone = normalizePhoneToIndia(phoneRaw);
        const joinDate = parseDate(row.joinDate);
        const expiryDate = parseDate(row.expiryDate);
        const status = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
        const paymentStatus =
          typeof row.paymentStatus === "string" ? row.paymentStatus.trim().toLowerCase() : "";
        const paymentAmount = parseNumber(row.paymentAmount);
        const rawGymIdMissing = row.gymId == null || String(row.gymId).trim() === "";
        const scope = resolveRequestedGymScope(authz, row.gymId);
        const gymId = scope.error ? undefined : scope.gymId;

        if (!name) {
          errors.push({ rowNumber, message: "Name is required" });
          continue;
        }
        if (name.length < 2) {
          errors.push({ rowNumber, message: "Name must be at least 2 characters" });
          continue;
        }
        if (!membershipType) {
          errors.push({ rowNumber, message: "Membership type is required" });
          continue;
        }
        if (!email) {
          errors.push({ rowNumber, message: "Email is required" });
          continue;
        }
        if (!EMAIL_REGEX.test(email)) {
          errors.push({ rowNumber, message: "Email is invalid" });
          continue;
        }
        if (!phone) {
          errors.push({ rowNumber, message: "Valid phone is required" });
          continue;
        }
        if (!joinDate) {
          errors.push({ rowNumber, message: "Valid joinDate is required" });
          continue;
        }
        if (!expiryDate) {
          errors.push({ rowNumber, message: "Valid expiryDate is required" });
          continue;
        }
        if (new Date(expiryDate).getTime() < new Date(joinDate).getTime()) {
          errors.push({ rowNumber, message: "Expiry date cannot be before join date" });
          continue;
        }
        if (!["active", "inactive", "expired"].includes(status)) {
          errors.push({ rowNumber, message: "Status must be active, inactive, or expired" });
          continue;
        }
        if (!["paid", "unpaid"].includes(paymentStatus)) {
          errors.push({ rowNumber, message: "Payment status must be paid or unpaid" });
          continue;
        }
        if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
          errors.push({ rowNumber, message: "Payment amount must be a non-negative number" });
          continue;
        }
        if (scope.error) {
          errors.push({ rowNumber, message: "Forbidden Gym Id in import row" });
          continue;
        }
        if (authz.isSuperAdmin && rawGymIdMissing) {
          errors.push({ rowNumber, message: "Gym Id is missing" });
          continue;
        }

        const paymentResolved = await resolveMemberPaymentFields(
          paymentStatus,
          row.paymentMode,
          row.bankId,
          gymId ?? null,
          client
        );
        if (!paymentResolved.ok) {
          errors.push({ rowNumber, message: paymentResolved.error });
          continue;
        }

        const planResult = await client.query<{ id: number }>(
          `SELECT id
           FROM membership_plans
           WHERE LOWER(name) = LOWER($1)
             AND status = 'active'
             AND (
               ($2::int IS NULL AND gym_id IS NULL)
               OR gym_id = $2
             )
           LIMIT 1`,
          [membershipType, gymId ?? null]
        );
        if (!planResult.rows[0]) {
          errors.push({
            rowNumber,
            message: `Membership type "${membershipType}" is not available for the selected gym`,
          });
          continue;
        }

        const countResult = await client.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM members
           WHERE TO_CHAR(join_date, 'YYYY-MM') = TO_CHAR($1::date, 'YYYY-MM')`,
          [joinDate]
        );
        const sequentialNumber = parseInt(countResult.rows[0]?.count ?? "0", 10) + 1;
        const memberId = generateMemberId(joinDate, sequentialNumber);

        const inserted = await client.query<IMemberRow>(
          `INSERT INTO members (
             member_id, name, email, phone, membership_type,
             join_date, expiry_date, status, payment_status, payment_mode, payment_amount, bank_id, gym_id
           )
           VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13)
           RETURNING id, member_id, name, email, phone, membership_type,
                     join_date, expiry_date, status, payment_status, payment_mode, payment_amount, bank_id, gym_id,
                     created_at, updated_at`,
          [
            memberId,
            name,
            email,
            phone,
            membershipType,
            joinDate,
            expiryDate,
            status,
            paymentStatus,
            paymentResolved.value.payment_mode,
            paymentAmount,
            paymentResolved.value.bank_id,
            gymId ?? null,
          ]
        );

        if (inserted.rows[0]) {
          importedCount += 1;
          insertedMembers.push(mapMemberRowToResponse(inserted.rows[0]));
        } else {
          errors.push({ rowNumber, message: "Failed to insert row" });
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (importedCount > 0) {
      await insertNotification(
        "Members Imported",
        `${importedCount} members imported successfully.`,
        "success"
      );
    }

    return NextResponse.json({
      success: importedCount > 0,
      data: {
        totalRows: rows.length,
        importedCount,
        failedCount: errors.length,
        members: insertedMembers,
        errors,
      },
      error:
        importedCount === 0
          ? "No members were imported. Fix the row errors and try again."
          : undefined,
    });
  } catch (error) {
    console.error("Import members error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import members" },
      { status: 500 }
    );
  }
}
