"use client";

import { useState } from "react";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doGetGyms, doDeleteGym } from "@/lib/services/gyms";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useGymsTableActions } from "@/lib/store";
import { toast } from "sonner";
import type { IGymData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { GymFormDialog } from "@/components/features/gyms/gym-form-dialog";

function ActionsCell({
  gym,
  onEdit,
}: {
  gym: IGymData;
  onEdit: (gymId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (gymId: string) => doDeleteGym(gymId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Gym deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["gyms"] });
      } else {
        toast.error(response.error || "Failed to delete gym");
      }
    },
    onError: () => {
      toast.error("Failed to delete gym. Please try again.");
    },
  });

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      /* mutation shows toast */
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hasPermission(PERMISSIONS.GYMS_UPDATE) ? (
        <EditButton
          id={String(gym.gymId)}
          entityName="gym"
          onClick={() => onEdit(String(gym.gymId))}
        />
      ) : null}
      {hasPermission(PERMISSIONS.GYMS_DELETE) ? (
        <DeleteButton
          id={String(gym.gymId)}
          onDelete={handleDelete}
          entityName="gym"
          itemName={gym.gymName}
          isLoading={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );
}

const baseColumns: ColumnDef<IGymData>[] = [
  {
    accessorKey: "gymId",
    header: "Gym ID",
    cell: ({ row }) => (
      <div className="font-mono font-medium">{row.getValue("gymId")}</div>
    ),
  },
  {
    accessorKey: "gymName",
    header: "Gym name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("gymName")}</div>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-md whitespace-pre-wrap">
        {row.getValue("address")}
      </div>
    ),
  },
];

export function GymsTable() {
  const [gymDialogOpen, setGymDialogOpen] = useState(false);
  const [editingGymId, setEditingGymId] = useState<string | null>(null);

  const { hasPermission } = usePermissions();
  const canReadGyms = hasPermission(PERMISSIONS.GYMS_READ);
  const { setSearchInput, setPage, setLimit, setSorting } = useGymsTableActions();
  const searchInput = useAppSelector((s) => s.gymsTable.searchInput);
  const page = useAppSelector((s) => s.gymsTable.page);
  const limit = useAppSelector((s) => s.gymsTable.limit);
  const sortBy = useAppSelector((s) => s.gymsTable.sortBy);
  const sortOrder = useAppSelector((s) => s.gymsTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const debouncedSearch = useDebounce(searchInput, 300);
  const canShowActions =
    hasPermission(PERMISSIONS.GYMS_UPDATE) ||
    hasPermission(PERMISSIONS.GYMS_DELETE);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["gyms", debouncedSearch, page, limit, sortBy, sortOrder],
    queryFn: () =>
      doGetGyms({
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    enabled: canReadGyms,
  });
  const gyms: IGymData[] = data?.gyms ?? [];
  const columns: ColumnDef<IGymData>[] = canShowActions
    ? [
        ...baseColumns,
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }) => (
            <ActionsCell
              gym={row.original}
              onEdit={(id) => {
                setEditingGymId(id);
                setGymDialogOpen(true);
              }}
            />
          ),
          enableSorting: false,
        },
      ]
    : baseColumns;

  const openAddGym = () => {
    setEditingGymId(null);
    setGymDialogOpen(true);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={gyms}
        searchPlaceholder="Search by gym ID, name, or address..."
        addButtonLabel="Add Gym"
        onAddClick={openAddGym}
        showAddButton={hasPermission(PERMISSIONS.GYMS_ADD)}
        entityName="gym"
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
              (first.id === "gymId" ||
                first.id === "gymName" ||
                first.id === "address")
              ? { id: first.id, desc: !!first.desc }
              : null
          );
        }}
      />
      <GymFormDialog
        open={gymDialogOpen}
        onOpenChange={setGymDialogOpen}
        editingGymId={editingGymId}
      />
    </>
  );
}
