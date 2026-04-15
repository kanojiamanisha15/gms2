"use client";

import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useAppSelector } from "@/lib/store";
import { parseCsv } from "@/lib/utils/csv-import";
import {
  doImportMembershipPlans,
  type ImportMembershipPlanRow,
} from "@/lib/services/membership-plans";
import {
  EntityImportExportActions,
  type ParsedImportRow,
} from "@/components/ui/entity-import-export-actions";
import { usePermissions } from "@/hooks/use-permissions";

export function MembershipPlansImportExportActions() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin, currentUser } = usePermissions();
  const includeGymId = isSuperAdmin && (currentUser?.gymId == null);
  const searchInput = useAppSelector((s) => s.membershipPlansTable.searchInput);
  const page = useAppSelector((s) => s.membershipPlansTable.page);
  const limit = useAppSelector((s) => s.membershipPlansTable.limit);
  const sortBy = useAppSelector((s) => s.membershipPlansTable.sortBy);
  const sortOrder = useAppSelector((s) => s.membershipPlansTable.sortOrder);

  const parseRows = (
    csvContent: string
  ): ParsedImportRow<ImportMembershipPlanRow>[] => {
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
      const name = getCell(cells, "name").trim();
      const priceRaw = getCell(cells, "price").trim();
      const price = Number(priceRaw);
      const duration = getCell(cells, "duration", "duration_days").trim();
      const features = getCell(cells, "features").trim() || null;
      const statusRaw = getCell(cells, "status").trim().toLowerCase();
      const status = statusRaw === "inactive" ? "inactive" : "active";
      const gymIdRaw = includeGymId ? getCell(cells, "gymId", "gym_id").trim() : "";
      const gymId = gymIdRaw ? Number(gymIdRaw) : null;
      const errors: string[] = [];

      if (!name) errors.push("Plan name is required");
      if (Number.isNaN(price) || price < 0) errors.push("Price must be greater than or equal to 0");
      if (!duration) errors.push("Duration is required");
      if (statusRaw && statusRaw !== "active" && statusRaw !== "inactive") {
        errors.push("Status must be active or inactive");
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
          name,
          price: priceRaw,
          duration,
          features: features ?? "",
          status: statusRaw,
          gymId: gymIdRaw,
        },
        data: {
          name,
          price: Number.isNaN(price) ? 0 : price,
          duration,
          features,
          status,
          gymId: includeGymId && gymIdRaw ? (gymId as number) : null,
        },
        errors,
      };
    });
  };

  return (
    <EntityImportExportActions<ImportMembershipPlanRow>
      importLabel="Import Membership Plans"
      exportLabel="Export Membership Plans"
      exportTemplateLabel="Export Plans Template"
      exportFileName={`membership-plans-export-p${page}-l${limit}.csv`}
      templateFileName="membership-plans-import-template.csv"
      templateHeaders={
        includeGymId
          ? ["name", "price", "duration", "features", "status", "gymId"]
          : ["name", "price", "duration", "features", "status"]
      }
      templateSampleRow={
        includeGymId
          ? ["Gold", "1999", "30", "Gym access", "active", "1"]
          : ["Gold", "1999", "30", "Gym access", "active"]
      }
      previewColumns={[
        { key: "name", label: "Plan Name" },
        { key: "price", label: "Price" },
        { key: "duration", label: "Duration" },
        { key: "features", label: "Features" },
        { key: "status", label: "Status" },
        ...(includeGymId ? ([{ key: "gymId", label: "Gym ID" }] as const) : []),
      ]}
      parseRows={parseRows}
      onImport={async (rows) => {
        const response = await doImportMembershipPlans(rows);
        queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
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
        const response = await fetch(
          `${API_ENDPOINTS.MEMBERSHIP_PLANS_EXPORT}?${params.toString()}`,
          { method: "GET", credentials: "include" }
        );
        if (!response.ok) throw new Error("Failed to export membership plans");
        return response.blob();
      }}
      canImport={hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_IMPORT)}
      canExport={hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_EXPORT)}
      canExportTemplate={hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_IMPORT)}
    />
  );
}
