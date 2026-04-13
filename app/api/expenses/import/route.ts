import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import type { IExpenseRow } from "@/types";

type ImportExpenseRowInput = {
  category?: string;
  description?: string | null;
  vendor?: string | null;
  amount?: number | string;
  date?: string;
  status?: "paid" | "pending" | "overdue" | string;
  gymId?: number | null;
};

export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_IMPORT);
  if ("error" in authz) return authz.error;

  try {
    const body = (await request.json()) as { rows?: ImportExpenseRowInput[] };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No rows provided for import" }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();
    const errors: Array<{ rowNumber: number; message: string }> = [];
    let importedCount = 0;
    const validStatuses = ["paid", "pending", "overdue"];

    try {
      await client.query("BEGIN");
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 2;
        const category = typeof row.category === "string" ? row.category.trim() : "";
        const description = row.description != null ? String(row.description).trim() || null : null;
        const vendor = row.vendor != null ? String(row.vendor).trim() || null : null;
        const amount = Number(row.amount);
        const date = row.date != null ? String(row.date).trim() : "";
        const status = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
        const rawGymIdMissing = row.gymId == null || String(row.gymId).trim() === "";
        const scope = resolveRequestedGymScope(authz, row.gymId);
        const gymId = scope.error ? undefined : scope.gymId;

        if (!category) {
          errors.push({ rowNumber, message: "Category is required" });
          continue;
        }
        if (!date) {
          errors.push({ rowNumber, message: "Date is required" });
          continue;
        }
        if (!validStatuses.includes(status)) {
          errors.push({ rowNumber, message: "Status must be paid, pending, or overdue" });
          continue;
        }
        if (Number.isNaN(amount) || amount < 0) {
          errors.push({ rowNumber, message: "Amount must be greater than or equal to 0" });
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

        const inserted = await client.query<IExpenseRow>(
          `INSERT INTO expenses (category, description, amount, date, status, vendor, gym_id)
           VALUES ($1, $2, $3, $4::date, $5, $6, $7)
           RETURNING id`,
          [category, description, amount, date, status, vendor, gymId ?? null]
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
      error: importedCount === 0 ? "No expenses were imported. Fix errors and retry." : undefined,
    });
  } catch (error) {
    console.error("Import expenses error:", error);
    return NextResponse.json({ success: false, error: "Failed to import expenses" }, { status: 500 });
  }
}
