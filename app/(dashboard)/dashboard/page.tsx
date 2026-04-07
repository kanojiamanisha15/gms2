"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { SectionCards } from "@/components/ui/section-cards";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpiringMembers } from "@/hooks/use-members";
import type { ExpiringMember } from "@/lib/services/members";
import { ChartSkeleton } from "@/lib/utils/lazy-loading";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useAppSelector, useExpiringMembersTableActions } from "@/lib/store";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Lazy load heavy components
const DataTable = dynamic(
  () => import("@/components/ui/data-table").then((mod) => ({ default: mod.DataTable })),
  { ssr: false }
);

const FinancialChart = dynamic(() => import("@/components/features/dashboard/financial-chart").then(mod => ({ default: mod.FinancialChart })), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});

const expiringMembersBaseColumns: ColumnDef<ExpiringMember>[] = [
  {
    accessorKey: "name",
    header: "Member Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue("phone")}</div>
    ),
  },
  {
    accessorKey: "membershipType",
    header: "Membership Type",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("membershipType")}</div>
    ),
  },
  {
    accessorKey: "expirationDate",
    header: "Expiration Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expirationDate"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "daysRemaining",
    header: "Days Remaining",
    cell: ({ row }) => {
      const days = row.getValue("daysRemaining") as number;
      const variant =
        days < 0
          ? "secondary"
          : days <= 7
            ? "destructive"
            : days <= 14
              ? "secondary"
              : "default";
      return (
        <Badge variant={variant}>
          {days < 0
            ? "Expired"
            : days === 0
              ? "Expires Today"
              : days === 1
                ? "1 Day"
                : `${days} Days`}
        </Badge>
      );
    },
  },
];

const expiringGymIdColumn: ColumnDef<ExpiringMember> = {
  id: "gymId",
  accessorKey: "gymId",
  header: "Gym ID",
  enableSorting: true,
  cell: ({ row }) => (
    <div className="font-mono text-sm text-muted-foreground tabular-nums">
      {row.original.gymId ?? "—"}
    </div>
  ),
};

const currentDate = new Date();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

export default function Page() {
  const [selectedMonth, setSelectedMonth] = React.useState(String(currentDate.getMonth()));
  const [selectedYear, setSelectedYear] = React.useState(String(currentDate.getFullYear()));
  const { hasPermission, isSuperAdmin } = usePermissions();
  const expiringColumns = React.useMemo<ColumnDef<ExpiringMember>[]>(() => {
    return [
      expiringMembersBaseColumns[0],
      ...(isSuperAdmin ? [expiringGymIdColumn] : []),
      ...expiringMembersBaseColumns.slice(1),
    ];
  }, [isSuperAdmin]);
  const { setSorting } = useExpiringMembersTableActions();
  const sortBy = useAppSelector((s) => s.expiringMembersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.expiringMembersTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data: expiringMembers = [], isLoading, isError, error } = useExpiringMembers(
    Number(selectedMonth),
    Number(selectedYear),
    sortBy,
    sortOrder
  );

  const monthYearLabel = `${MONTH_NAMES[Number(selectedMonth)]} ${selectedYear}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {hasPermission(PERMISSIONS.DASHBOARD_READ) ? <SectionCards />:null}
          {hasPermission(PERMISSIONS.DASHBOARD_FINANCIAL) ? <div className="px-4 lg:px-6">
            <FinancialChart />
          </div>:null}
          {hasPermission(PERMISSIONS.EXPIRING_MEMBERS_VIEW) ? (
            <DataTable
              columns={expiringColumns as ColumnDef<unknown>[]}
              data={expiringMembers}
              searchPlaceholder="Search expiring members..."
              showAddButton={false}
              isLoading={isLoading}
              isError={isError}
              error={error}
              headerTitle="Members with Plans Expiring by Month"
              headerDescription={`${expiringMembers.length} member${
                expiringMembers.length !== 1 ? "s" : ""
              } with plans expiring in ${monthYearLabel}`}
              headerAction={
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue
                        placeholder="Month"
                        labels={Object.fromEntries(MONTH_NAMES.map((name, i) => [String(i), name]))}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={name} value={String(i)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
              serverSideSorting
              sorting={sorting}
              onSortingChange={(next) => {
                const first = next[0];
                setSorting(
                  first &&
                    (first.id === "name" ||
                      first.id === "email" ||
                      first.id === "phone" ||
                      first.id === "membershipType" ||
                      first.id === "expirationDate" ||
                      first.id === "daysRemaining" ||
                      first.id === "gymId")
                    ? { id: first.id, desc: !!first.desc }
                    : null
                );
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
