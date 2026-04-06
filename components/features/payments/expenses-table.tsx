"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ColumnDef, type SortingState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { DeleteButton } from "@/components/ui/delete-button";
import { EditButton } from "@/components/ui/edit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { doGetExpenses } from "@/lib/services/expenses";
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppSelector, useExpensesTableActions } from "@/lib/store";
import type { IExpenseData } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";

// Lazy load the expense form modal (only loads when opened)
const ExpenseFormModal = dynamic(() => import("./expense-form-modal").then(mod => ({ default: mod.ExpenseFormModal })), {
  ssr: false,
});

const categoryLabels: Record<string, string> = {
  equipment: "Equipment",
  utilities: "Utilities",
  rent: "Rent",
  supplies: "Supplies",
  staff: "Staff",
  marketing: "Marketing",
  insurance: "Insurance",
  maintenance: "Maintenance",
  software: "Software",
  other: "Other",
};

function ActionsCell({
  expense,
  onEdit,
}: {
  expense: IExpenseData;
  onEdit: (expense: IExpenseData) => void;
}) {
  const { hasPermission } = usePermissions();
  const canUpdateExpense = hasPermission(PERMISSIONS.EXPENSES_UPDATE);
  const canDeleteExpense = hasPermission(PERMISSIONS.EXPENSES_DELETE);
  const deleteMutation = useDeleteExpense();

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(parseInt(id, 10));
    } catch {
    }
  };

  return (
    <div className="flex items-center gap-2">
      {canUpdateExpense ? (
        <EditButton
          id={String(expense.id)}
          entityName="expense"
          onClick={() => onEdit(expense)}
        />
      ) : null}
      {canDeleteExpense ? (
        <DeleteButton
          id={String(expense.id)}
          onDelete={handleDelete}
          entityName="expense"
          itemName={expense.description ?? expense.category}
          isLoading={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );
}

export function ExpensesTable() {
  const { hasPermission } = usePermissions();
  const canShowActions =
    hasPermission(PERMISSIONS.EXPENSES_UPDATE) ||
    hasPermission(PERMISSIONS.EXPENSES_DELETE);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<IExpenseData | null>(null);

  const {
    setSearchInput,
    setPage,
    setLimit,
    setStartDate,
    setEndDate,
    setSorting,
  } = useExpensesTableActions();
  const searchInput = useAppSelector((s) => s.expensesTable.searchInput);
  const page = useAppSelector((s) => s.expensesTable.page);
  const limit = useAppSelector((s) => s.expensesTable.limit);
  const startDate = useAppSelector((s) => s.expensesTable.startDate);
  const endDate = useAppSelector((s) => s.expensesTable.endDate);
  const sortBy = useAppSelector((s) => s.expensesTable.sortBy);
  const sortOrder = useAppSelector((s) => s.expensesTable.sortOrder);
  const sorting: SortingState = [{ id: sortBy, desc: sortOrder === "desc" }];
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["expenses", debouncedSearch, page, limit, startDate, endDate, sortBy, sortOrder],
    queryFn: () =>
      doGetExpenses({
        search: debouncedSearch || undefined,
        page,
        limit,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
      }),
  });

  const expenses: IExpenseData[] = data?.expenses ?? [];

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();

  const handleAdd = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expense: IExpenseData) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: {
    category: string;
    description?: string;
    amount: number;
    date: string;
    status: "paid" | "pending" | "overdue";
    vendor?: string;
  }) => {
    const payload = {
      category: formData.category,
      description: formData.description?.trim() || null,
      amount: formData.amount,
      date: formData.date,
      status: formData.status,
      vendor: formData.vendor?.trim() || null,
    };
    if (selectedExpense) {
      await updateMutation.mutateAsync({
        expenseId: selectedExpense.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnDef<IExpenseData>[] = [
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <div className="font-medium">
          {categoryLabels[row.getValue("category") as string] ||
            String(row.getValue("category"))}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-md">{row.getValue("description") ?? "—"}</div>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => {
        const vendor = row.getValue("vendor") as string | null | undefined;
        return <div className="text-muted-foreground">{vendor ?? "N/A"}</div>;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = parseFloat(String(row.getValue("amount")));
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
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const date = dayjs(row.getValue("date"));
        return <div>{date.format("MM/DD/YYYY")}</div>;
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
          paid: { variant: "default" },
          pending: { variant: "secondary" },
          overdue: { variant: "destructive" },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return (
          <Badge variant={config.variant}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const expense = row.original;
        return <ActionsCell expense={expense} onEdit={handleEdit} />;
      },
      enableSorting: false,
    },
  ];
  const displayColumns: ColumnDef<IExpenseData>[] = canShowActions
    ? columns
    : columns.filter((column) => column.id !== "actions");

  const headerAction = (
    <div className="flex flex-wrap items-start sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="start-date" className="text-xs whitespace-nowrap">
          Start Date
        </Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[140px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="end-date" className="text-xs whitespace-nowrap">
          End Date
        </Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[140px]"
        />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={displayColumns}
        data={expenses}
        searchPlaceholder="Search expenses..."
        addButtonLabel="Add Expense"
        showAddButton={hasPermission(PERMISSIONS.EXPENSES_ADD)}
        entityName="expense"
        onAddClick={handleAdd}
        headerTitle="Expenses"
        headerDescription={`${data?.total ?? 0} expense${(data?.total ?? 0) !== 1 ? "s" : ""} recorded`}
        headerAction={headerAction}
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
              (first.id === "category" ||
                first.id === "description" ||
                first.id === "vendor" ||
                first.id === "amount" ||
                first.id === "date" ||
                first.id === "status")
              ? { id: first.id, desc: !!first.desc }
              : null
          );
        }}
      />
      <ExpenseFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expense={selectedExpense}
        onSave={handleSave}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
