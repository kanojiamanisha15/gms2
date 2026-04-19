"use client";

import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useAppSelector } from "@/lib/store";
import { parseCsv, toIsoDate } from "@/lib/utils/csv-import";
import { doImportExpenses, type ImportExpenseRow } from "@/lib/services/expenses";
import {
  EntityImportExportActions,
  type ParsedImportRow,
} from "@/components/ui/entity-import-export-actions";
import { usePermissions } from "@/hooks/use-permissions";

export function ExpensesImportExportActions() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin, currentUser } = usePermissions();
  const includeGymId = isSuperAdmin && (currentUser?.gymId == null);
  const searchInput = useAppSelector((s) => s.expensesTable.searchInput);
  const page = useAppSelector((s) => s.expensesTable.page);
  const limit = useAppSelector((s) => s.expensesTable.limit);
  const sortBy = useAppSelector((s) => s.expensesTable.sortBy);
  const sortOrder = useAppSelector((s) => s.expensesTable.sortOrder);
  const startDate = useAppSelector((s) => s.expensesTable.startDate);
  const endDate = useAppSelector((s) => s.expensesTable.endDate);

  const parseRows = (csvContent: string): ParsedImportRow<ImportExpenseRow>[] => {
    const { headers, rows } = parseCsv(csvContent);
    if (headers.length === 0 || rows.length === 0) return [];
    const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[_\s-]/g, ""));
    const indexByKey = new Map<string, number>();
    normalizedHeaders.forEach((h, i) => indexByKey.set(h, i));
    const getCell = (cells: string[], ...keys: string[]) => {
      for (const key of keys) {
        const index = indexByKey.get(key.toLowerCase().replace(/[_\s-]/g, ""));
        if (index != null) return cells[index] ?? "";
      }
      return "";
    };

    return rows.map((cells, index) => {
      const rowNumber = index + 2;
      const category = getCell(cells, "category").trim();
      const description = getCell(cells, "description").trim() || null;
      const vendor = getCell(cells, "vendor").trim() || null;
      const amountRaw = getCell(cells, "amount").trim();
      const amount = Number(amountRaw);
      const dateRaw = getCell(cells, "date").trim();
      const date = toIsoDate(dateRaw) ?? "";
      const statusRaw = getCell(cells, "status").trim().toLowerCase();
      const status = statusRaw as "paid" | "pending" | "overdue";
      const gymIdRaw = includeGymId ? getCell(cells, "gymId", "gym_id").trim() : "";
      const gymId = gymIdRaw ? Number(gymIdRaw) : null;
      const errors: string[] = [];

      if (!category) errors.push("Category is required");
      if (!date) errors.push("Valid date is required");
      if (Number.isNaN(amount) || amount < 0) errors.push("Amount must be greater than or equal to 0");
      if (!["paid", "pending", "overdue"].includes(statusRaw)) {
        errors.push("Status must be paid, pending, or overdue");
      }
      if (includeGymId && gymIdRaw && (Number.isNaN(gymId) || (gymId as number) <= 0)) {
        errors.push("Gym Id must be a positive number");
      }
      if (includeGymId && !gymIdRaw) {
        errors.push("Gym Id is missing");
      }

      return {
        rowNumber,
        previewData: {
          category,
          description: description ?? "",
          vendor: vendor ?? "",
          amount: amountRaw,
          date: dateRaw,
          status: statusRaw,
          gymId: gymIdRaw,
        },
        data: {
          category,
          description,
          vendor,
          amount: Number.isNaN(amount) ? 0 : amount,
          date,
          status,
          gymId: includeGymId && gymIdRaw ? (gymId as number) : null,
        },
        errors,
      };
    });
  };

  return (
    <EntityImportExportActions<ImportExpenseRow>
      importLabel="Import Expenses Data"
      exportLabel="Export Expenses Data"
      exportTemplateLabel="Export Expenses Template"
      exportFileName={`expenses-export-p${page}-l${limit}.csv`}
      templateFileName="expenses-import-template.csv"
      templateHeaders={
        includeGymId
          ? ["category", "description", "vendor", "amount", "date", "status", "gymId"]
          : ["category", "description", "vendor", "amount", "date", "status"]
      }
      templateSampleRow={
        includeGymId
          ? ["utilities", "Electricity bill", "Power Co", "3500", "2026-04-05", "paid", "1"]
          : ["utilities", "Electricity bill", "Power Co", "3500", "2026-04-05", "paid"]
      }
      previewColumns={[
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "vendor", label: "Vendor" },
        { key: "amount", label: "Amount" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status" },
        ...(includeGymId ? ([{ key: "gymId", label: "Gym ID" }] as const) : []),
      ]}
      parseRows={parseRows}
      onImport={async (rows) => {
        const response = await doImportExpenses(rows);
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        return {
          success: response.success,
          importedCount: response.data?.importedCount,
          failedCount: response.data?.failedCount,
          error: response.error,
        };
      }}
      onExport={async () => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sortBy,
          sortOrder,
        });
        if (searchInput.trim()) params.set("search", searchInput.trim());
        if (startDate.trim()) params.set("startDate", startDate.trim());
        if (endDate.trim()) params.set("endDate", endDate.trim());
        const response = await fetch(`${API_ENDPOINTS.EXPENSES_EXPORT}?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to export expenses");
        return response.blob();
      }}
      canImport={hasPermission(PERMISSIONS.EXPENSES_IMPORT)}
      canExport={hasPermission(PERMISSIONS.EXPENSES_EXPORT)}
      canExportTemplate={hasPermission(PERMISSIONS.EXPENSES_IMPORT)}
    />
  );
}
