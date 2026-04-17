import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import { insertNotification } from "@/lib/db/notifications";
import type { IBankData, IBankRow, ICreateBankData } from "@/types";

const SORT_FIELDS = {
  bankName: "bank_name",
  accountNumber: "account_number",
  ifscCode: "ifsc_code",
  accountHolderName: "account_holder_name",
  branchName: "branch_name",
  accountType: "account_type",
  upiId: "upi_id",
  gymId: "gym_id",
} as const;

function mapBankRowToResponse(row: IBankRow): IBankData {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    accountHolderName: row.account_holder_name,
    branchName: row.branch_name,
    accountType: row.account_type,
    upiId: row.upi_id,
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.BANKS_READ);
  if ("error" in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const scope = resolveRequestedGymScope(authz, searchParams.get("gymId"));
    if (scope.error) return scope.error;
    const sortByRaw = searchParams.get("sortBy") ?? "bankName";
    const sortOrderRaw = searchParams.get("sortOrder") ?? "asc";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : "bankName") as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === "desc" ? "DESC" : "ASC";

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(bank_name ILIKE $${paramIndex} OR account_number ILIKE $${paramIndex} OR ifsc_code ILIKE $${paramIndex} OR account_holder_name ILIKE $${paramIndex} OR branch_name ILIKE $${paramIndex} OR upi_id ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (scope.gymId != null) {
      conditions.push(`gym_id = $${paramIndex}`);
      sqlParams.push(scope.gymId);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, id DESC`;

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM banks${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? "0", 10);
    const totalPages = Math.ceil(total / limitNum);

    const rows = await query<IBankRow>(
      `SELECT id, bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id, created_at, updated_at
       FROM banks
       ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...sqlParams, limitNum, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        banks: rows.map(mapBankRowToResponse),
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get banks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.BANKS_ADD);
  if ("error" in authz) return authz.error;

  try {
    const body = (await request.json()) as ICreateBankData;
    const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
    const accountNumber = body.accountNumber != null ? (String(body.accountNumber).trim() || null) : null;
    const ifscCode = body.ifscCode != null ? (String(body.ifscCode).trim().toUpperCase() || null) : null;
    const accountHolderName = typeof body.accountHolderName === "string" ? body.accountHolderName.trim() : "";
    const branchName = typeof body.branchName === "string" ? body.branchName.trim() : "";
    const accountType = typeof body.accountType === "string" ? body.accountType.trim().toLowerCase() : "";
    const upiId = body.upiId != null ? (String(body.upiId).trim() || null) : null;
    const scope = resolveRequestedGymScope(authz, body.gymId);
    if (scope.error) return scope.error;
    const gymId = scope.gymId;

    if (!bankName) {
      return NextResponse.json({ success: false, error: "Bank name is required" }, { status: 400 });
    }
    if (!accountHolderName) {
      return NextResponse.json({ success: false, error: "Account holder name is required" }, { status: 400 });
    }
    if (!branchName) {
      return NextResponse.json({ success: false, error: "Branch name is required" }, { status: 400 });
    }
    if (!["savings", "current", "salary", "other"].includes(accountType)) {
      return NextResponse.json({ success: false, error: "Account type is required" }, { status: 400 });
    }
    if (authz.isSuperAdmin && gymId == null) {
      return NextResponse.json({ success: false, error: "Gym is required for super admin" }, { status: 400 });
    }

    const row = await queryOne<IBankRow>(
      `INSERT INTO banks (bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id, created_at, updated_at`,
      [bankName, accountNumber, ifscCode, accountHolderName, branchName, accountType, upiId, gymId]
    );

    if (!row) {
      return NextResponse.json({ success: false, error: "Failed to create bank" }, { status: 500 });
    }

    await insertNotification(
      "Bank Added",
      `${bankName} bank account has been added.`,
      "info"
    );

    return NextResponse.json({
      success: true,
      data: { bank: mapBankRowToResponse(row) },
    });
  } catch (error) {
    console.error("Add bank error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create bank" },
      { status: 500 }
    );
  }
}
