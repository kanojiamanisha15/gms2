import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import type { IMembershipPlanRow } from "@/types";

type ImportPlanRowInput = {
  name?: string;
  price?: number | string;
  duration?: string;
  features?: string | null;
  status?: "active" | "inactive" | string;
  gymId?: number | null;
};

export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_IMPORT);
  if ("error" in authz) return authz.error;

  try {
    const body = (await request.json()) as { rows?: ImportPlanRowInput[] };
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
        const price = Number(row.price);
        const duration = typeof row.duration === "string" ? row.duration.trim() : "";
        const features = row.features != null ? String(row.features).trim() || null : null;
        const status = row.status === "inactive" ? "inactive" : "active";
        const rawGymIdMissing = row.gymId == null || String(row.gymId).trim() === "";
        const scope = resolveRequestedGymScope(authz, row.gymId);
        const gymId = scope.error ? undefined : scope.gymId;

        if (!name) {
          errors.push({ rowNumber, message: "Plan name is required" });
          continue;
        }
        if (Number.isNaN(price) || price < 0) {
          errors.push({ rowNumber, message: "Price must be greater than or equal to 0" });
          continue;
        }
        if (!duration) {
          errors.push({ rowNumber, message: "Duration is required" });
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

        const inserted = await client.query<IMembershipPlanRow>(
          `INSERT INTO membership_plans (name, price, duration_days, features, status, gym_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [name, price, duration, features, status, gymId ?? null]
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
      error: importedCount === 0 ? "No membership plans were imported. Fix errors and retry." : undefined,
    });
  } catch (error) {
    console.error("Import membership plans error:", error);
    return NextResponse.json({ success: false, error: "Failed to import membership plans" }, { status: 500 });
  }
}
