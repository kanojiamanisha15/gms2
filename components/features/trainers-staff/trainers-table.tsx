"use client";

import { useMemo } from "react";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doGetTrainers, doDeleteTrainer } from "@/lib/services/trainers";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useTrainersTableActions } from "@/lib/store";
import { toast } from "sonner";
import type { ITrainerData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

function ActionsCell({ trainer }: { trainer: ITrainerData }) {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => doDeleteTrainer(id),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Trainer deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["trainers"] });
      } else {
        toast.error(response.error || "Failed to delete trainer");
      }
    },
    onError: (error) => {
      console.error("Error deleting trainer:", error);
      toast.error("Failed to delete trainer. Please try again.");
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
      {hasPermission(PERMISSIONS.TRAINERS_UPDATE) ? <EditButton
        id={String(trainer.id)}
        editPath="/trainers-staff/add-trainer"
        entityName="trainer"
      /> : null}
      {hasPermission(PERMISSIONS.TRAINERS_DELETE) ? <DeleteButton
        id={String(trainer.id)}
        onDelete={handleDelete}
        entityName="trainer"
        itemName={trainer.name}
        isLoading={deleteMutation.isPending}
      /> : null}
    </div>
  );
}

const gymIdColumn: ColumnDef<ITrainerData> = {
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

const trainerDataColumns: ColumnDef<ITrainerData>[] = [
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
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={role === "Trainer" ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "hireDate",
    header: "Hire Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("hireDate"));
      return <div>{date.toLocaleDateString()}</div>;
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

const trainerActionsColumn: ColumnDef<ITrainerData> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => <ActionsCell trainer={row.original} />,
  enableSorting: false,
};

export function TrainersTable() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canReadTrainers = hasPermission(PERMISSIONS.TRAINERS_READ);
  const canShowActions =
    hasPermission(PERMISSIONS.TRAINERS_UPDATE) ||
    hasPermission(PERMISSIONS.TRAINERS_DELETE);
  const { setSearchInput, setPage, setLimit, setSorting } = useTrainersTableActions();
  const searchInput = useAppSelector((s) => s.trainersTable.searchInput);
  const page = useAppSelector((s) => s.trainersTable.page);
  const limit = useAppSelector((s) => s.trainersTable.limit);
  const sortBy = useAppSelector((s) => s.trainersTable.sortBy);
  const sortOrder = useAppSelector((s) => s.trainersTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const debouncedSearch = useDebounce(searchInput, 300);
  const canAddTrainer = hasPermission(PERMISSIONS.TRAINERS_ADD);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["trainers", debouncedSearch, page, limit, sortBy, sortOrder],
    queryFn: () =>
      doGetTrainers({
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    enabled: canReadTrainers,
  });
  const trainers: ITrainerData[] = data?.trainers ?? [];

  const displayColumns: ColumnDef<ITrainerData>[] = useMemo(() => {
    const dataColumns: ColumnDef<ITrainerData>[] = [
      trainerDataColumns[0],
      ...(isSuperAdmin ? [gymIdColumn] : []),
      ...trainerDataColumns.slice(1),
    ];
    return canShowActions ? [...dataColumns, trainerActionsColumn] : dataColumns;
  }, [isSuperAdmin, canShowActions]);

  return (
    <DataTable
      columns={displayColumns}
      data={trainers}
      searchPlaceholder="Search by name, email, or phone..."
      addButtonLabel="Add Trainer/Staff"
      addButtonHref="/trainers-staff/add-trainer"
      showAddButton={canAddTrainer}
      entityName="trainer"
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
              first.id === "email" ||
              first.id === "phone" ||
              first.id === "role" ||
              first.id === "hireDate" ||
              first.id === "status" ||
              first.id === "gymId")
            ? { id: first.id, desc: !!first.desc }
            : null
        );
      }}
    />
  );
}
