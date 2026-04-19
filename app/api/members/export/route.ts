import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope } from "@/lib/services/authorization";
import type { IMemberRow } from "@/types";

const SORT_FIELDS = {
  memberId: "m.member_id",
  name: "m.name",
  email: "m.email",
  phone: "m.phone",
  membershipType: "m.membership_type",
  joinDate: "m.join_date",
  expiryDate: "m.expiry_date",
  status: "m.status",
  paymentStatus: "m.payment_status",
  paymentAmount: "m.payment_amount",
  paymentMode: "m.payment_mode",
  bankName: "b.bank_name",
  gymId: "m.gym_id",
} as const;

function toCsvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** GET /api/members/export - Export members CSV using active table query params */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_EXPORT);
  if ("error" in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const includeGymId = authz.isSuperAdmin;
    const search = searchParams.get("search");
    const scope = resolveRequestedGymScope(authz, searchParams.get("gymId"));
    if (scope.error) return scope.error;

    const sortByRaw = searchParams.get("sortBy") ?? "joinDate";
    const sortOrderRaw = searchParams.get("sortOrder") ?? "desc";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : "joinDate") as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === "asc" ? "ASC" : "DESC";

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 1000);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(m.name ILIKE $${paramIndex} OR m.email ILIKE $${paramIndex} OR m.member_id ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (scope.gymId != null) {
      conditions.push(`m.gym_id = $${paramIndex}`);
      sqlParams.push(scope.gymId);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, m.id DESC`;

    const rows = await query<IMemberRow>(
      `SELECT m.id, m.member_id, m.name, m.email, m.phone, m.membership_type, m.join_date, m.expiry_date,
              m.status, m.payment_status, m.payment_mode, m.payment_amount, m.bank_id, b.bank_name AS bank_name, m.gym_id
       FROM members m
       LEFT JOIN banks b ON m.bank_id = b.id
       ${whereSql}
       ORDER BY ${orderBySql}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...sqlParams, limitNum, offset]
    );

    const headers = [
      "memberId",
      "name",
      "email",
      "phone",
      "membershipType",
      "joinDate",
      "expiryDate",
      "status",
      "paymentStatus",
      "paymentMode",
      "bankId",
      "bankName",
      "paymentAmount",
      ...(includeGymId ? ["gymId"] : []),
    ];

    const csvLines = rows.map((row) =>
      [
        row.member_id,
        row.name,
        row.email,
        row.phone,
        row.membership_type,
        row.join_date,
        row.expiry_date,
        row.status,
        row.payment_status,
        row.payment_mode ?? "",
        row.bank_id ?? "",
        row.bank_name ?? "",
        row.payment_amount,
        ...(includeGymId ? [row.gym_id] : []),
      ]
        .map(toCsvCell)
        .join(",")
    );

    const csv = `${headers.join(",")}\n${csvLines.join("\n")}\n`;
    const fileName = `members-export-p${pageNum}-l${limitNum}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Export members error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export members" },
      { status: 500 }
    );
  }
}
