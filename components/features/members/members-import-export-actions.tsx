"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doImportMembers, type ImportMemberRow } from "@/lib/services/members";
import { doGetMembershipPlans } from "@/lib/services/membership-plans";
import { normalizePhoneToIndia } from "@/lib/helpers";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useAppSelector } from "@/lib/store";
import { usePermissions } from "@/hooks/use-permissions";
import {
  EntityImportExportActions,
  type ParsedImportRow,
} from "@/components/ui/entity-import-export-actions";

const TEMPLATE_HEADERS = ["name", "email", "phone", "membershipType", "joinDate", "expiryDate", "status", "paymentStatus", "paymentAmount", "gymId"] as const;
const TEMPLATE_SAMPLE_ROW = ["John Doe", "john@example.com", "+919876543210", "Gold", "2026-04-01", "2026-05-01", "active", "paid", "1500", "1"] as const;

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"") {
      if (insideQuotes && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current.trim());
  return fields.map((field) => field.replace(/^"|"$/g, "").trim());
}
function parseCsv(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => splitCsvLine(line));
  return { headers, rows };
}

function toIsoDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

export function MembersImportExportActions() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin, currentUser } = usePermissions();
  const searchInput = useAppSelector((s) => s.membersTable.searchInput);
  const page = useAppSelector((s) => s.membersTable.page);
  const limit = useAppSelector((s) => s.membersTable.limit);
  const sortBy = useAppSelector((s) => s.membersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.membersTable.sortOrder);
  const includeGymId = isSuperAdmin;
  const canImport = hasPermission(PERMISSIONS.MEMBERS_IMPORT);
  const canExport = hasPermission(PERMISSIONS.MEMBERS_EXPORT);

  const plansQuery = useQuery({
    queryKey: ["membership-plans", "import-validation"],
    enabled: canImport,
    queryFn: async () => {
      let pageNumber = 1;
      let totalPages = 1;
      const allPlans: Array<{ gymId: number | null; name: string; status: string }> = [];
      while (pageNumber <= totalPages) {
        const response = await doGetMembershipPlans({
          page: pageNumber,
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        });
        totalPages = response.totalPages || 1;
        allPlans.push(
          ...response.plans.map((plan) => ({
            gymId: plan.gymId ?? null,
            name: plan.name,
            status: plan.status,
          }))
        );
        pageNumber++;
      }
      return allPlans;
    },
  });
  const activePlansByGym = useMemo(() => {
    const nextMap = new Map<string, Set<string>>();
    (plansQuery.data ?? [])
      .filter((plan) => plan.status === "active")
      .forEach((plan) => {
        const key = plan.gymId == null ? "null" : String(plan.gymId);
        const set = nextMap.get(key) ?? new Set<string>();
        set.add(plan.name.trim().toLowerCase());
        nextMap.set(key, set);
      });
    return nextMap;
  }, [plansQuery.data]);

  const mapHeadersToIndices = (headers: string[]) => {
    const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[_\s-]/g, ""));
    const indexByKey = new Map<string, number>();
    normalizedHeaders.forEach((header, index) => {
      indexByKey.set(header, index);
    });
    return indexByKey;
  };

  const parseRows = (csvContent: string): ParsedImportRow<ImportMemberRow>[] => {
    const { headers, rows } = parseCsv(csvContent);
    if (headers.length === 0 || rows.length === 0) return [];

    const indexByKey = mapHeadersToIndices(headers);
    const getCell = (cells: string[], ...keys: string[]) => {
      for (const key of keys) {
        const index = indexByKey.get(key.toLowerCase().replace(/[_\s-]/g, ""));
        if (index != null) return cells[index] ?? "";
      }
      return "";
    };

    return rows.map((cells, index) => {
      const rowNumber = index + 2;
      const name = getCell(cells, "name");
      const emailRaw = getCell(cells, "email");
      const phoneRaw = getCell(cells, "phone");
      const normalizedPhone = normalizePhoneToIndia(phoneRaw);
      const membershipType = getCell(cells, "membershipType", "membership_type");
      const joinDateRaw = getCell(cells, "joinDate", "join_date");
      const expiryDateRaw = getCell(cells, "expiryDate", "expiry_date");
      const statusRaw = getCell(cells, "status").toLowerCase();
      const paymentStatusRaw = getCell(cells, "paymentStatus", "payment_status").toLowerCase();
      const paymentAmountRaw = getCell(cells, "paymentAmount", "payment_amount");
      const gymIdRaw = includeGymId ? getCell(cells, "gymId", "gym_id") : "";

      const joinDate = toIsoDate(joinDateRaw);
      const expiryDate = toIsoDate(expiryDateRaw);
      const paymentAmount = paymentAmountRaw.trim() ? Number(paymentAmountRaw) : 0;
      const gymId = gymIdRaw.trim() ? Number(gymIdRaw) : null;

      const errors: string[] = [];
      if (!name.trim()) errors.push("Name is required");
      if (name.trim() && name.trim().length < 2) {
        errors.push("Name must be at least 2 characters");
      }
      if (!emailRaw.trim()) {
        errors.push("Email is required");
      } else if (!EMAIL_REGEX.test(emailRaw.trim())) {
        errors.push("Email is invalid");
      }
      if (!phoneRaw.trim()) {
        errors.push("Phone is required");
      } else if (!normalizedPhone) {
        errors.push("Phone must be a valid Indian mobile number");
      }
      if (!membershipType.trim()) errors.push("Membership type is required");
      if (!joinDate) errors.push("Valid join date is required");
      if (!expiryDate) errors.push("Valid expiry date is required");
      if (joinDate && expiryDate && new Date(expiryDate).getTime() < new Date(joinDate).getTime()) {
        errors.push("Expiry date cannot be before join date");
      }
      if (!["active", "inactive", "expired"].includes(statusRaw)) {
        errors.push("Status must be active, inactive, or expired");
      }
      if (!["paid", "unpaid"].includes(paymentStatusRaw)) {
        errors.push("Payment status must be paid or unpaid");
      }
      if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
        errors.push("Payment amount must be a non-negative number");
      }
      if (includeGymId && gymIdRaw.trim() && (Number.isNaN(gymId) || (gymId as number) <= 0)) {
        errors.push("Gym Id must be a positive number");
      }
      if (includeGymId && !gymIdRaw.trim()) {
        errors.push("Gym Id is missing");
      }
      if (membershipType.trim()) {
        if (plansQuery.isLoading) {
          errors.push("Membership plans are still loading. Please retry.");
        } else if (plansQuery.isError) {
          errors.push("Unable to validate membership type right now. Please retry.");
        } else if (!(includeGymId && !gymIdRaw.trim())) {
        const key = includeGymId
          ? (gymIdRaw.trim() ? String(gymId) : "null")
          : String(currentUser?.gymId ?? "null");
        const plans = activePlansByGym.get(key);
        if (!plans || !plans.has(membershipType.trim().toLowerCase())) {
          errors.push(`${includeGymId ? "Membership type is not active/available for the selected gym" : "Membership type is not active/available for this gym"}`);
        }
        }
      }

      return {
        rowNumber,
        previewData: {
          name: name.trim(),
          email: emailRaw.trim(),
          phone: phoneRaw.trim(),
          membershipType: membershipType.trim(),
          joinDate: joinDateRaw.trim(),
          expiryDate: expiryDateRaw.trim(),
          status: statusRaw.trim(),
          paymentStatus: paymentStatusRaw.trim(),
          paymentAmount: paymentAmountRaw.trim(),
          gymId: gymIdRaw.trim(),
        },
        data: {
          name: name.trim(),
          email: emailRaw.trim() || "",
          phone: normalizedPhone,
          membershipType: membershipType.trim(),
          joinDate: joinDate ?? "",
          expiryDate: expiryDate ?? null,
          status: (statusRaw || "active") as "active" | "inactive" | "expired",
          paymentStatus: (paymentStatusRaw || "unpaid") as "paid" | "unpaid",
          paymentAmount: Number.isNaN(paymentAmount) ? 0 : paymentAmount,
          gymId: includeGymId && gymIdRaw.trim() ? (gymId as number) : null,
        },
        errors,
      };
    });
  };

  return (
    <EntityImportExportActions<ImportMemberRow>
      importLabel="Import Members Data"
      exportLabel="Export Members Data"
      exportTemplateLabel="Export Members Data Template"
      exportFileName={`members-export-p${page}-l${limit}.csv`}
      templateFileName="members-import-template.csv"
      templateHeaders={
        includeGymId
          ? [...TEMPLATE_HEADERS]
          : TEMPLATE_HEADERS.filter((h) => h !== "gymId")
      }
      templateSampleRow={
        includeGymId
          ? [...TEMPLATE_SAMPLE_ROW]
          : TEMPLATE_SAMPLE_ROW.slice(0, TEMPLATE_SAMPLE_ROW.length - 1)
      }
      previewColumns={[
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "membershipType", label: "Membership" },
        { key: "joinDate", label: "Join Date" },
        { key: "expiryDate", label: "Expiry Date" },
        { key: "status", label: "Status" },
        { key: "paymentStatus", label: "Payment Status" },
        { key: "paymentAmount", label: "Payment Amount" },
        ...(includeGymId ? ([{ key: "gymId", label: "Gym ID" }] as const) : []),
      ]}
      parseRows={parseRows}
      onImport={async (rows) => {
        const response = await doImportMembers(rows);
        queryClient.invalidateQueries({ queryKey: ["members"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
        const response = await fetch(`${API_ENDPOINTS.MEMBERS_EXPORT}?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to export members");
        return response.blob();
      }}
      canImport={canImport}
      canExport={canExport}
      canExportTemplate={canImport}
    />
  );
}
