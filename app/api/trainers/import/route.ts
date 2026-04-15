import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import { normalizePhoneToIndia } from "@/lib/helpers";
import type { ITrainerRow } from "@/types";

type ImportTrainerRowInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  role?: "Trainer" | "Staff" | string;
  hireDate?: string;
  status?: "active" | "inactive" | string;
  gymId?: number | null;
};

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_IMPORT);
  if ("error" in authz) return authz.error;

  try {
    const body = (await request.json()) as { rows?: ImportTrainerRowInput[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No rows provided for import" }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();
    const errors: Array<{ rowNumber: number; message: string }> = [];
    let importedCount = 0;

    try {
      await client.query("BEGIN");
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 2;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const email = row.email != null ? String(row.email).trim() : "";
        const phone = normalizePhoneToIndia(row.phone != null ? String(row.phone).trim() : null);
        const role = row.role === "Staff" ? "Staff" : "Trainer";
        const status = row.status === "inactive" ? "inactive" : "active";
        const hireDate = row.hireDate != null ? String(row.hireDate).trim() : "";
        const rawGymIdMissing = row.gymId == null || String(row.gymId).trim() === "";
        const scope = resolveRequestedGymScope(authz, row.gymId);
        const gymId = scope.error ? undefined : scope.gymId;

        if (!name) {
          errors.push({ rowNumber, message: "Name is required" });
          continue;
        }
        if (!email || !EMAIL_REGEX.test(email)) {
          errors.push({ rowNumber, message: "Valid email is required" });
          continue;
        }
        if (!phone) {
          errors.push({ rowNumber, message: "Valid phone is required" });
          continue;
        }
        if (!hireDate) {
          errors.push({ rowNumber, message: "Hire date is required" });
          continue;
        }
        if (scope.error) {
          errors.push({ rowNumber, message: "Forbidden Gym Id in import row" });
          continue;
        }
        if (authz.isSuperAdmin && authz.payload.gymId == null && rawGymIdMissing) {
          errors.push({ rowNumber, message: "Gym Id is missing" });
          continue;
        }

        const inserted = await client.query<ITrainerRow>(
          `INSERT INTO trainers (name, email, phone, role, hire_date, status, gym_id)
           VALUES ($1, $2, $3, $4, $5::date, $6, $7)
           RETURNING id`,
          [name, email, phone, role, hireDate, status, gymId ?? null]
        );
        if (inserted.rows[0]) importedCount++;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: importedCount > 0,
      data: {
        totalRows: rows.length,
        importedCount,
        failedCount: errors.length,
        errors,
      },
      error: importedCount === 0 ? "No trainers were imported. Fix errors and retry." : undefined,
    });
  } catch (error) {
    console.error("Import trainers error:", error);
    return NextResponse.json({ success: false, error: "Failed to import trainers" }, { status: 500 });
  }
}
