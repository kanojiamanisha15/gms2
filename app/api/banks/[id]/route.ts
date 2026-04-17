import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/db";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from "@/lib/services/authorization";
import { insertNotification } from "@/lib/db/notifications";
import type { IUpdateBankData, IBankData, IBankRow } from "@/types";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.BANKS_UPDATE);
  if ("error" in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const bankId = parseInt(id, 10);

    if (!id || isNaN(bankId)) {
      return NextResponse.json(
        { success: false, error: "Bank ID is required" },
        { status: 400 }
      );
    }

    const row = await queryOne<IBankRow>(
      `SELECT id, bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id, created_at, updated_at
       FROM banks
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [bankId, scope.gymId]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Bank not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { bank: mapBankRowToResponse(row) },
    });
  } catch (error) {
    console.error("Get bank by ID error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bank" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.BANKS_UPDATE);
  if ("error" in authz) return authz.error;

  try {
    const baseScope = resolveGymScope(authz, null);
    if (baseScope.error) return baseScope.error;
    const { id } = await params;
    const bankId = parseInt(id, 10);

    if (!id || isNaN(bankId)) {
      return NextResponse.json(
        { success: false, error: "Bank ID is required" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as IUpdateBankData;
    const bankName = body.bankName != null ? String(body.bankName).trim() : undefined;
    const accountNumber = body.accountNumber != null ? (String(body.accountNumber).trim() || null) : undefined;
    const ifscCode = body.ifscCode != null ? (String(body.ifscCode).trim().toUpperCase() || null) : undefined;
    const accountHolderName = body.accountHolderName != null ? String(body.accountHolderName).trim() : undefined;
    const branchName = body.branchName != null ? String(body.branchName).trim() : undefined;
    const accountType = body.accountType != null ? String(body.accountType).trim().toLowerCase() : undefined;
    const upiId = body.upiId != null ? (String(body.upiId).trim() || null) : undefined;
    const writeScope = resolveRequestedGymScope(authz, body.gymId, { allowUndefined: true });
    if (writeScope.error) return writeScope.error;
    const gymId = writeScope.gymId;

    if (accountType != null && !["savings", "current", "salary", "other"].includes(accountType)) {
      return NextResponse.json(
        { success: false, error: "Account type must be savings, current, salary, or other" },
        { status: 400 }
      );
    }

    const existing = await queryOne<IBankRow>(
      `SELECT id, bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id, created_at, updated_at
       FROM banks
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [bankId, baseScope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bank not found" },
        { status: 404 }
      );
    }

    if (authz.isSuperAdmin) {
      const effectiveGymId = gymId !== undefined ? gymId : existing.gym_id;
      if (effectiveGymId == null) {
        return NextResponse.json(
          { success: false, error: "Gym is required for super admin" },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (bankName !== undefined) {
      if (!bankName) {
        return NextResponse.json(
          { success: false, error: "Bank name is required" },
          { status: 400 }
        );
      }
      updates.push(`bank_name = $${paramIndex}`);
      values.push(bankName);
      paramIndex++;
    }
    if (accountNumber !== undefined) {
      updates.push(`account_number = $${paramIndex}`);
      values.push(accountNumber);
      paramIndex++;
    }
    if (ifscCode !== undefined) {
      updates.push(`ifsc_code = $${paramIndex}`);
      values.push(ifscCode);
      paramIndex++;
    }
    if (accountHolderName !== undefined) {
      if (!accountHolderName) {
        return NextResponse.json(
          { success: false, error: "Account holder name is required" },
          { status: 400 }
        );
      }
      updates.push(`account_holder_name = $${paramIndex}`);
      values.push(accountHolderName);
      paramIndex++;
    }
    if (branchName !== undefined) {
      if (!branchName) {
        return NextResponse.json(
          { success: false, error: "Branch name is required" },
          { status: 400 }
        );
      }
      updates.push(`branch_name = $${paramIndex}`);
      values.push(branchName);
      paramIndex++;
    }
    if (accountType !== undefined) {
      updates.push(`account_type = $${paramIndex}`);
      values.push(accountType);
      paramIndex++;
    }
    if (upiId !== undefined) {
      updates.push(`upi_id = $${paramIndex}`);
      values.push(upiId);
      paramIndex++;
    }
    if (gymId !== undefined) {
      updates.push(`gym_id = $${paramIndex}`);
      values.push(gymId);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        data: { bank: mapBankRowToResponse(existing) },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(bankId);

    const row = await queryOne<IBankRow>(
      `UPDATE banks
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING id, bank_name, account_number, ifsc_code, account_holder_name, branch_name, account_type, upi_id, gym_id, created_at, updated_at`,
      values
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Failed to update bank" },
        { status: 500 }
      );
    }

    await insertNotification(
      "Bank Updated",
      `${row.bank_name} bank details have been updated.`,
      "info"
    );

    return NextResponse.json({
      success: true,
      data: { bank: mapBankRowToResponse(row) },
    });
  } catch (error) {
    console.error("Update bank error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update bank" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.BANKS_DELETE);
  if ("error" in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const bankId = parseInt(id, 10);

    if (!id || isNaN(bankId)) {
      return NextResponse.json(
        { success: false, error: "Bank ID is required" },
        { status: 400 }
      );
    }

    const existing = await queryOne<IBankRow>(
      `SELECT id, bank_name FROM banks
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [bankId, scope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bank not found" },
        { status: 404 }
      );
    }

    await query(
      `DELETE FROM banks
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [bankId, scope.gymId]
    );

    await insertNotification(
      "Bank Deleted",
      `${existing.bank_name} bank details have been removed.`,
      "info"
    );

    return NextResponse.json({
      success: true,
      data: { message: "Bank deleted successfully" },
    });
  } catch (error) {
    console.error("Delete bank error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete bank" },
      { status: 500 }
    );
  }
}
