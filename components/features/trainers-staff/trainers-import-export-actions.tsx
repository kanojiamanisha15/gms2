"use client";

import { useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useAppSelector } from "@/lib/store";
import { parseCsv, toIsoDate } from "@/lib/utils/csv-import";
import { normalizePhoneToIndia } from "@/lib/helpers";
import { doImportTrainers, type ImportTrainerRow } from "@/lib/services/trainers";
import { usePermissions } from "@/hooks/use-permissions";
import {
  EntityImportExportActions,
  type ParsedImportRow,
} from "@/components/ui/entity-import-export-actions";

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function TrainersImportExportActions() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin, currentUser } = usePermissions();
  const includeGymId = isSuperAdmin && (currentUser?.gymId == null);
  const searchInput = useAppSelector((s) => s.trainersTable.searchInput);
  const page = useAppSelector((s) => s.trainersTable.page);
  const limit = useAppSelector((s) => s.trainersTable.limit);
  const sortBy = useAppSelector((s) => s.trainersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.trainersTable.sortOrder);

  const parseRows = (csvContent: string): ParsedImportRow<ImportTrainerRow>[] => {
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
      const email = getCell(cells, "email").trim();
      const phoneRaw = getCell(cells, "phone").trim();
      const phone = normalizePhoneToIndia(phoneRaw);
      const roleRaw = getCell(cells, "role").trim();
      const role = roleRaw === "Staff" ? "Staff" : "Trainer";
      const hireDateRaw = getCell(cells, "hireDate", "hire_date").trim();
      const hireDate = toIsoDate(hireDateRaw) ?? "";
      const statusRaw = getCell(cells, "status").trim().toLowerCase();
      const status = statusRaw === "inactive" ? "inactive" : "active";
      const gymIdRaw = includeGymId ? getCell(cells, "gymId", "gym_id").trim() : "";
      const gymId = gymIdRaw ? Number(gymIdRaw) : null;
      const errors: string[] = [];

      if (!name) errors.push("Name is required");
      if (!email || !EMAIL_REGEX.test(email)) errors.push("Valid email is required");
      if (!phone) errors.push("Valid phone is required");
      if (!hireDate) errors.push("Valid hire date is required");
      if (roleRaw && roleRaw !== "Trainer" && roleRaw !== "Staff") {
        errors.push("Role must be Trainer or Staff");
      }
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
          email,
          phone: phoneRaw,
          role: roleRaw,
          hireDate: hireDateRaw,
          status: statusRaw,
          gymId: gymIdRaw,
        },
        data: {
          name,
          email,
          phone: phone ?? "",
          role,
          hireDate,
          status,
          gymId: includeGymId && gymIdRaw ? (gymId as number) : null,
        },
        errors,
      };
    });
  };

  return (
    <EntityImportExportActions<ImportTrainerRow>
      importLabel="Import Trainers Data"
      exportLabel="Export Trainers Data"
      exportTemplateLabel="Export Trainers Data Template"
      exportFileName={`trainers-export-p${page}-l${limit}.csv`}
      templateFileName="trainers-import-template.csv"
      templateHeaders={
        includeGymId
          ? ["name", "email", "phone", "role", "hire date ", "status", "gymId"]
          : ["name", "email", "phone", "role", "hire date ", "status"]
      }
      templateSampleRow={
        includeGymId
          ? ["John Doe", "john@example.com", "+919876543210", "Trainer", "2026-04-01", "active", "1"]
          : ["John Doe", "john@example.com", "+919876543210", "Trainer", "2026-04-01", "active"]
      }
      previewColumns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "hireDate", label: "Hire Date" },
        { key: "status", label: "Status" },
        ...(includeGymId ? ([{ key: "gymId", label: "Gym ID" }] as const) : []),
      ]}
      parseRows={parseRows}
      onImport={async (rows) => {
        const response = await doImportTrainers(rows);
        queryClient.invalidateQueries({ queryKey: ["trainers"] });
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
        const response = await fetch(`${API_ENDPOINTS.TRAINERS_EXPORT}?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to export trainers");
        return response.blob();
      }}
      canImport={hasPermission(PERMISSIONS.TRAINERS_IMPORT)}
      canExport={hasPermission(PERMISSIONS.TRAINERS_EXPORT)}
      canExportTemplate={hasPermission(PERMISSIONS.TRAINERS_IMPORT)}
    />
  );
}
