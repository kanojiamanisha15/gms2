"use client";

import { useMemo } from "react";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { EditButton } from "@/components/ui/edit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doDeleteBank, doGetBanks } from "@/lib/services/banks";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useBanksTableActions } from "@/lib/store";
import { toast } from "sonner";
import type { IBankData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

function ActionsCell({ bank }: { bank: IBankData }) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const deleteMutation = useMutation({
    mutationFn: (bankId: string) => doDeleteBank(bankId),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Bank deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["banks"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } else {
        toast.error(response.error || "Failed to delete bank");
      }
    },
    onError: () => {
      toast.error("Failed to delete bank. Please try again.");
    },
  });

  return (
    <div className="flex items-center gap-2">
      {hasPermission(PERMISSIONS.BANKS_UPDATE) ? (
        <EditButton
          id={String(bank.id)}
          editPath="/banks/add-bank"
          entityName="bank"
        />
      ) : null}
      {hasPermission(PERMISSIONS.BANKS_DELETE) ? (
        <DeleteButton
          id={String(bank.id)}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          entityName="bank"
          itemName={bank.bankName}
          isLoading={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );
}

const baseColumns: ColumnDef<IBankData>[] = [
  {
    accessorKey: "bankName",
    header: "Bank Name",
    cell: ({ row }) => <div className="font-medium">{row.getValue("bankName")}</div>,
  },
  {
    accessorKey: "accountNumber",
    header: "Account Number",
    cell: ({ row }) => <div>{(row.getValue("accountNumber") as string) || "—"}</div>,
  },
  {
    accessorKey: "ifscCode",
    header: "IFSC Code",
    cell: ({ row }) => <div>{(row.getValue("ifscCode") as string) || "—"}</div>,
  },
  {
    accessorKey: "accountHolderName",
    header: "Account Holder Name",
    cell: ({ row }) => <div>{row.getValue("accountHolderName")}</div>,
  },
  {
    accessorKey: "branchName",
    header: "Branch Name",
    cell: ({ row }) => <div>{row.getValue("branchName")}</div>,
  },
  {
    accessorKey: "accountType",
    header: "Account Type",
    cell: ({ row }) => <div className="capitalize">{row.getValue("accountType")}</div>,
  },
  {
    accessorKey: "upiId",
    header: "UPI ID",
    cell: ({ row }) => <div>{(row.getValue("upiId") as string) || "—"}</div>,
  },
];

const gymIdColumn: ColumnDef<IBankData> = {
  id: "gymId",
  accessorKey: "gymId",
  header: "Gym ID",
  cell: ({ row }) => (
    <div className="font-mono text-sm text-muted-foreground tabular-nums">
      {row.original.gymId ?? "—"}
    </div>
  ),
};

const actionsColumn: ColumnDef<IBankData> = {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => <ActionsCell bank={row.original} />,
  enableSorting: false,
};

export function BanksTable() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canReadBanks = hasPermission(PERMISSIONS.BANKS_READ);
  const { setSearchInput, setPage, setLimit, setSorting } = useBanksTableActions();
  const searchInput = useAppSelector((s) => s.banksTable.searchInput);
  const page = useAppSelector((s) => s.banksTable.page);
  const limit = useAppSelector((s) => s.banksTable.limit);
  const sortBy = useAppSelector((s) => s.banksTable.sortBy);
  const sortOrder = useAppSelector((s) => s.banksTable.sortOrder);
  const debouncedSearch = useDebounce(searchInput, 300);
  const canShowActions =
    hasPermission(PERMISSIONS.BANKS_UPDATE) || hasPermission(PERMISSIONS.BANKS_DELETE);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["banks", debouncedSearch, page, limit, sortBy, sortOrder],
    queryFn: () =>
      doGetBanks({
        search: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
    enabled: canReadBanks,
  });
  const banks: IBankData[] = data?.banks ?? [];
  const columns: ColumnDef<IBankData>[] = useMemo(() => {
    const dataColumns: ColumnDef<IBankData>[] = [
      ...(isSuperAdmin ? [gymIdColumn] : []),
      ...baseColumns,
    ];
    return canShowActions ? [...dataColumns, actionsColumn] : dataColumns;
  }, [isSuperAdmin, canShowActions]);

  return (
    <DataTable
      columns={columns}
      data={banks}
      searchPlaceholder="Search by bank name, account holder, IFSC, account number..."
      addButtonLabel="Add Bank"
      addButtonHref="/banks/add-bank"
      showAddButton={hasPermission(PERMISSIONS.BANKS_ADD)}
      entityName="bank"
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
            (first.id === "bankName" ||
              first.id === "accountNumber" ||
              first.id === "ifscCode" ||
              first.id === "accountHolderName" ||
              first.id === "branchName" ||
              first.id === "accountType" ||
              first.id === "upiId" ||
              first.id === "gymId")
            ? { id: first.id, desc: !!first.desc }
            : null
        );
      }}
    />
  );
}
