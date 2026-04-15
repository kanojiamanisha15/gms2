import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import type { IExpenseRow } from "@/types";

const SORT_FIELDS = {
  category: "category",
  description: "description",
  vendor: "vendor",
  amount: "amount",
  date: "date",
  status: "status",
  gymId: "gym_id",
} as const;

function toCsvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_EXPORT);
  if ("error" in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const includeGymId = authz.isSuperAdmin && (authz.payload.gymId == null);
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const scope = resolveRequestedGymScope(authz, searchParams.get("gymId"));
    if (scope.error) return scope.error;
    const sortByRaw = searchParams.get("sortBy") ?? "date";
    const sortOrderRaw = searchParams.get("sortOrder") ?? "desc";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : "date") as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === "asc" ? "ASC" : "DESC";
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 1000);
    const offset = (pageNum - 1) * limitNum;
    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(category ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR vendor ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }
    if (startDate?.trim()) {
      conditions.push(`date >= $${paramIndex}::date`);
      sqlParams.push(startDate.trim());
      paramIndex++;
    }
    if (endDate?.trim()) {
      conditions.push(`date <= $${paramIndex}::date`);
      sqlParams.push(endDate.trim());
      paramIndex++;
    }
    if (scope.gymId != null) {
      conditions.push(`gym_id = $${paramIndex}`);
      sqlParams.push(scope.gymId);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, id DESC`;
    const rows = await query<IExpenseRow>(
      `SELECT id, category, description, amount, date, status, vendor, gym_id
       FROM expenses
       ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...sqlParams, limitNum, offset]
    );

    const headers = [
      "category",
      "description",
      "vendor",
      "amount",
      "date",
      "status",
      ...(includeGymId ? ["gymId"] : []),
    ];
    const csvLines = rows.map((row) =>
      [
        row.category,
        row.description,
        row.vendor,
        row.amount,
        row.date,
        row.status,
        ...(includeGymId ? [row.gym_id] : []),
      ]
        .map(toCsvCell)
        .join(",")
    );
    const csv = `${headers.join(",")}\n${csvLines.join("\n")}\n`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="expenses-export-p${pageNum}-l${limitNum}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export expenses error:", error);
    return NextResponse.json({ success: false, error: "Failed to export expenses" }, { status: 500 });
  }
}
