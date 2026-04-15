"use client";

import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  doGetUsers,
  doDeleteAdminUser,
  type AppUserRow,
} from "@/lib/services/users";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { toast } from "sonner";
import { isSuperAdminRole } from "@/lib/constants/roles";
import { UserPermissionsDialog } from "@/components/features/users/user-permissions-dialog";
import { useAppSelector, useUsersTableActions } from "@/lib/store";

function ActionsCell({
  rowUser,
  currentUserId,
}: {
  rowUser: AppUserRow;
  currentUserId?: number;
}) {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const isSuperAdminRow = isSuperAdminRole(rowUser.role);
  const isSelf = currentUserId !== undefined && rowUser.id === currentUserId;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => doDeleteAdminUser(id),
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete user. Please try again.");
    },
  });

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(parseInt(id, 10));
    } catch {
      // Error surfaced by onError
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hasPermission(PERMISSIONS.USERS_UPDATE) && !isSuperAdminRow ? (
        <EditButton
          id={String(rowUser.id)}
          editPath="/users/add-user"
          entityName="user"
          disabled={isSelf}
        />
      ) : null}
      {hasPermission(PERMISSIONS.USERS_DELETE)  && !isSuperAdminRow ? (
        <DeleteButton
          id={String(rowUser.id)}
          onDelete={handleDelete}
          entityName="user"
          itemName={rowUser.name}
          isLoading={deleteMutation.isPending}
          disabled={isSelf}
        />
      ) : null}
      {hasPermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS) && !isSuperAdminRow ? <UserPermissionsDialog rowUser={rowUser} disabled={isSelf} /> : null}
    </div>
  );
}

const baseColumns: ColumnDef<AppUserRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <div className="font-mono text-muted-foreground">{row.getValue("id")}</div>
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
    id: "gym",
    accessorFn: (row) => {
      const gymName = row.gymName?.trim() ?? "";
      const gymId = row.gymId != null ? String(row.gymId) : "";
      return `${gymName} ${gymId}`.trim();
    },
    header: "Gym",
    cell: ({ row }) => {
      const name = row.original.gymName;
      if (!name && row.original.gymId == null) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="max-w-[220px]">
          <div className="font-medium truncate" title={name ?? undefined}>
            {name ?? "—"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const r = row.getValue("role") as string;
      const superRow = isSuperAdminRole(r);
      return superRow ? (
        <Badge variant="default" className="capitalize">
          {r.replace("_", " ")}
        </Badge>
      ) : (
        <span className="capitalize">{r}</span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const raw = row.getValue("created_at") as string;
      const d = new Date(raw);
      return (
        <div className="text-muted-foreground text-sm">
          {Number.isNaN(d.getTime()) ? raw : d.toLocaleString()}
        </div>
      );
    },
  },
];

export function UsersTable() {
  const { currentUser, hasPermission } = usePermissions();
  const canReadUsers = hasPermission(PERMISSIONS.USERS_READ);
  const { setSorting } = useUsersTableActions();
  const sortBy = useAppSelector((s) => s.usersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.usersTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const canShowActions =
    hasPermission(PERMISSIONS.USERS_UPDATE) ||
    hasPermission(PERMISSIONS.USERS_DELETE) ||
    hasPermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminUsers", sortBy, sortOrder],
    queryFn: () => doGetUsers({ sortBy, sortOrder }),
    enabled: canReadUsers,
  });

  const users = data ?? [];

  const columns: ColumnDef<AppUserRow>[] = canShowActions
    ? [
      ...baseColumns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionsCell
            rowUser={row.original}
            currentUserId={currentUser?.id}
          />
        ),
        enableSorting: false,
      },
    ]
    : baseColumns;

  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Search by name, email, or gym..."
      serverSideSorting
      sorting={sorting}
      onSortingChange={(next) => {
        const first = next[0];
        setSorting(
          first &&
            (first.id === "id" ||
              first.id === "name" ||
              first.id === "email" ||
              first.id === "gym" ||
              first.id === "role" ||
              first.id === "created_at")
            ? { id: first.id, desc: !!first.desc }
            : null
        );
      }}
      addButtonLabel="Add User"
      addButtonHref="/users/add-user"
      entityName="user"
      showAddButton={hasPermission(PERMISSIONS.USERS_ADD)}
      isLoading={isLoading}
      isError={isError}
      error={error}
    />
  );
}
