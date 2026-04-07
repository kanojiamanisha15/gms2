"use client";

import { useMemo } from "react";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  doGetMembershipPlans,
  doDeleteMembershipPlan,
} from "@/lib/services/membership-plans";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useMembershipPlansTableActions } from "@/lib/store";
import { toast } from "sonner";
import type { IMembershipPlanData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

function ActionsCell({ plan }: { plan: IMembershipPlanData }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => doDeleteMembershipPlan(id),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Membership plan deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      } else {
        toast.error(response.error || "Failed to delete membership plan");
      }
    },
    onError: (error) => {
      console.error("Error deleting membership plan:", error);
      toast.error("Failed to delete membership plan. Please try again.");
    },
  });

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      // Error is handled by onError callback
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_UPDATE) ? <EditButton
        id={String(plan.id)}
        editPath="/membership-plans/add-plan"
        entityName="membership plan"
      /> : null}
      {hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_DELETE) ? <DeleteButton
        id={String(plan.id)}
        onDelete={handleDelete}
        entityName="membership plan"
        itemName={plan.name}
        isLoading={deleteMutation.isPending}
      /> : null}
    </div>
  );
}

const gymIdColumn: ColumnDef<IMembershipPlanData> = {
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

const planDataColumns: ColumnDef<IMembershipPlanData>[] = [
  {
    accessorKey: "name",
    header: "Plan Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => {
      const price = parseFloat(String(row.getValue("price")));
      return <div>Rs.{price.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => (
      <div className="text-muted-foreground">{row.getValue("duration")}</div>
    ),
  },
  {
    accessorKey: "features",
    header: "Features",
    cell: ({ row }) => {
      const features = row.getValue("features") as string;
      return (
        <div className="max-w-md text-sm text-muted-foreground">{features ?? ""}</div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusConfig: Record<
        string,
        { variant: "default" | "secondary" | "destructive" | "outline" }
      > = {
        active: { variant: "default" },
        inactive: { variant: "secondary" },
      };
      const config = statusConfig[status] || statusConfig.active;
      return (
        <Badge variant={config.variant}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
];

const planActionsColumn: ColumnDef<IMembershipPlanData> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => <ActionsCell plan={row.original} />,
  enableSorting: false,
};

export function MembershipPlansTable() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canShowActions =
    hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_UPDATE) ||
    hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_DELETE);
  const { setSearchInput, setPage, setLimit, setSorting } = useMembershipPlansTableActions();
  const searchInput = useAppSelector((s) => s.membershipPlansTable.searchInput);
  const page = useAppSelector((s) => s.membershipPlansTable.page);
  const limit = useAppSelector((s) => s.membershipPlansTable.limit);
  const sortBy = useAppSelector((s) => s.membershipPlansTable.sortBy);
  const sortOrder = useAppSelector((s) => s.membershipPlansTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["membership-plans", debouncedSearch, page, limit, sortBy, sortOrder],
    queryFn: () =>
      doGetMembershipPlans({
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
  });
  const plans: IMembershipPlanData[] = data?.plans ?? [];

  const displayColumns: ColumnDef<IMembershipPlanData>[] = useMemo(() => {
    const dataColumns: ColumnDef<IMembershipPlanData>[] = [
      planDataColumns[0],
      ...(isSuperAdmin ? [gymIdColumn] : []),
      ...planDataColumns.slice(1),
    ];
    return canShowActions ? [...dataColumns, planActionsColumn] : dataColumns;
  }, [isSuperAdmin, canShowActions]);

  return (
    <DataTable
      columns={displayColumns}
      data={plans}
      searchPlaceholder="Search membership plans..."
      addButtonLabel="Add Membership Plan"
      addButtonHref="/membership-plans/add-plan"
      showAddButton={hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_ADD)}
      entityName="membership plan"
      serverSideSearch
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      isLoading={isLoading}
      isError={isError}
      error={error}
      serverSidePagination
      serverSideSorting
      page={page}
      limit={limit}
      total={data?.total}
      totalPages={data?.totalPages}
      onPageChange={setPage}
      onLimitChange={setLimit}
      sorting={sorting}
      onSortingChange={(next) => {
        const first = next[0];
        setSorting(
          first &&
            (first.id === "name" ||
              first.id === "price" ||
              first.id === "duration" ||
              first.id === "features" ||
              first.id === "status" ||
              first.id === "gymId")
            ? { id: first.id, desc: !!first.desc }
            : null
        );
      }}
    />
  );
}
