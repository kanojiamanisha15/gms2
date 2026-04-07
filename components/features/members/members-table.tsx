"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { doGetMembers, doDeleteMember } from "@/lib/services/members";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useMembersTableActions } from "@/lib/store";
import { toast } from "sonner";
import type { IMemberData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

function ActionsCell({ member }: { member: IMemberData }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => doDeleteMember(memberId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Member deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["members"] });
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } else {
        toast.error(response.error || "Failed to delete member");
      }
    },
    onError: (error) => {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member. Please try again.");
    },
  });

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hasPermission(PERMISSIONS.MEMBERS_UPDATE) ? <EditButton
        id={member.memberId}
        editPath="/members/add-member"
        entityName="member"
      /> : null}
      {hasPermission(PERMISSIONS.MEMBERS_DELETE) ? <DeleteButton
        id={member.memberId}
        onDelete={handleDelete}
        entityName="member"
        itemName={member.name}
        isLoading={deleteMutation.isPending}
      /> : null}
    </div>
  );
}

const baseColumns: ColumnDef<IMemberData>[] = [
  {
    accessorKey: "memberId",
    header: "Member ID",
    cell: ({ row }) => (
      <div className="font-mono font-medium">{row.getValue("memberId")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
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
    accessorKey: "joinDate",
    header: "Join Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("joinDate"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expiryDate"));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(date);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return (
        <div className="flex flex-col gap-1">
          <div>{date.toLocaleDateString()}</div>
          {daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && (
            <Badge
              variant={daysUntilExpiry <= 7 ? "destructive" : "secondary"}
              className="w-fit"
            >
              {daysUntilExpiry === 0
                ? "Expires Today"
                : daysUntilExpiry === 1
                  ? "1 Day Left"
                  : `${daysUntilExpiry} Days Left`}
            </Badge>
          )}
        </div>
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
        inactive: { variant: "outline" },
        expired: { variant: "destructive" },
      };
      const config = statusConfig[status] || statusConfig.active;
      return (
        <Badge variant={config.variant}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment Status",
    cell: ({ row }) => {
      const paymentStatus = row.getValue("paymentStatus") as string;
      const statusConfig: Record<
        string,
        { variant: "default" | "secondary" | "destructive" | "outline" }
      > = {
        paid: { variant: "default" },
        unpaid: { variant: "secondary" },
      };
      const config = statusConfig[paymentStatus] || statusConfig.unpaid;
      return (
        <Badge variant={config.variant}>
          {paymentStatus === "paid" ? "Paid" : "Unpaid"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "paymentAmount",
    header: "Payment Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("paymentAmount"));
      return (
        <div className="font-medium">
          Rs.
          {amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      );
    },
  },
];

const gymIdColumn: ColumnDef<IMemberData> = {
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

const actionsColumn: ColumnDef<IMemberData> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => <ActionsCell member={row.original} />,
  enableSorting: false,
};

export function MembersTable() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { setSearchInput, setPage, setLimit, setSorting } = useMembersTableActions();
  const searchInput = useAppSelector((s) => s.membersTable.searchInput);
  const page = useAppSelector((s) => s.membersTable.page);
  const limit = useAppSelector((s) => s.membersTable.limit);
  const sortBy = useAppSelector((s) => s.membersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.membersTable.sortOrder);
  const debouncedSearch = useDebounce(searchInput, 300);
  const canShowActions =
    hasPermission(PERMISSIONS.MEMBERS_UPDATE) || hasPermission(PERMISSIONS.MEMBERS_DELETE);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["members", debouncedSearch, page, limit, sortBy, sortOrder],
    queryFn: () =>
      doGetMembers({
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
  });
  const members: IMemberData[] = data?.members ?? [];
  const columns: ColumnDef<IMemberData>[] = useMemo(() => {
    const dataColumns: ColumnDef<IMemberData>[] = [
      baseColumns[0],
      ...(isSuperAdmin ? [gymIdColumn] : []),
      ...baseColumns.slice(1),
    ];
    return canShowActions ? [...dataColumns, actionsColumn] : dataColumns;
  }, [isSuperAdmin, canShowActions]);

  return (
    <DataTable
      columns={columns}
      data={members}
      searchPlaceholder="Search by name, email, or member ID..."
      addButtonLabel="Add Member"
      addButtonHref="/members/add-member"
      showAddButton={hasPermission(PERMISSIONS.MEMBERS_ADD)}
      entityName="member"
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
            (first.id === "memberId" ||
              first.id === "name" ||
              first.id === "email" ||
              first.id === "phone" ||
              first.id === "membershipType" ||
              first.id === "joinDate" ||
              first.id === "expiryDate" ||
              first.id === "status" ||
              first.id === "paymentStatus" ||
              first.id === "paymentAmount" ||
              first.id === "gymId")
            ? { id: first.id, desc: !!first.desc }
            : null
        );
      }}
    />
  );
}
