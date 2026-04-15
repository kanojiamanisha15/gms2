"use client";

import * as React from "react";
import Link from "next/link";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorMessage } from "@/components/ui/error-message";

const PAGE_SIZE_LABELS: Record<string, string> = {
  "10": "10",
  "20": "20",
  "30": "30",
  "50": "50",
  "100": "100",
};

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  addButtonLabel?: string;
  addButtonHref?: string;
  onAddClick?: () => void;
  entityName?: string;
  defaultPageSize?: number;
  showAddButton?: boolean;
  header?: React.ReactNode;
  headerTitle?: string;
  headerDescription?: string;
  headerAction?: React.ReactNode;
  serverSideSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | string | null;
  serverSidePagination?: boolean;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  serverSideSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  addButtonLabel = "Add",
  addButtonHref,
  onAddClick,
  entityName = "item",
  defaultPageSize = 10,
  showAddButton = true,
  header,
  headerTitle,
  headerDescription,
  headerAction,
  serverSideSearch = false,
  searchValue,
  onSearchChange,
  isLoading = false,
  isError = false,
  error,
  serverSidePagination = false,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  serverSideSorting = false,
  sorting: externalSorting,
  onSortingChange: onExternalSortingChange,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const sorting = serverSideSorting ? (externalSorting ?? []) : internalSorting;

  const table = useReactTable({
    data,
    columns,
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;

      if (serverSideSorting) {
        onExternalSortingChange?.(nextSorting);
        return;
      }

      setInternalSorting(nextSorting);
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSidePagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: serverSideSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    manualPagination: serverSidePagination,
    manualSorting: serverSideSorting,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: serverSideSearch ? "" : globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
  });

  // Generate header if title is provided
  const displayHeader =
    header ||
    (headerTitle && (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {headerTitle}
          </h2>
          {headerDescription && (
            <p className="mt-1 text-sm text-muted-foreground">
              {headerDescription}
            </p>
          )}
        </div>
        {headerAction && <div className="w-full shrink-0 sm:w-auto">{headerAction}</div>}
      </div>
    ));

  return (
    <div className="px-4 lg:px-6 space-y-4">
      <Card>
        {displayHeader && (
          <div className="px-6 pb-4 border-b">{displayHeader}</div>
        )}
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={serverSideSearch ? (searchValue ?? "") : (globalFilter ?? "")}
                  onChange={(event) =>
                    serverSideSearch && onSearchChange
                      ? onSearchChange(event.target.value)
                      : setGlobalFilter(event.target.value)
                  }
                  className="pl-9"
                />
              </div>
              {showAddButton &&
                (addButtonHref || onAddClick) &&
                (onAddClick ? (
                  <Button onClick={onAddClick} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    {addButtonLabel}
                  </Button>
                ) : (
                  <Link href={addButtonHref!} className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      {addButtonLabel}
                    </Button>
                  </Link>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <div className="w-full overflow-x-auto">
                <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? "cursor-pointer select-none flex items-center gap-2"
                                    : ""
                                }
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${header.column.getIsSorted() === "asc"
                                      ? "rotate-180"
                                      : header.column.getIsSorted() === "desc"
                                        ? ""
                                        : "opacity-0"
                                      }`}
                                  />
                                )}
                              </div>
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isError ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="font-medium text-destructive">
                            Failed to load data
                          </span>
                          <ErrorMessage
                            error={error}
                            fallback="An error occurred"
                            tone="muted"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 lg:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {serverSidePagination && total !== undefined
                    ? `Showing ${total === 0 ? 0 : (page ?? 1) * (limit ?? 10) - (limit ?? 10) + 1} to ${Math.min((page ?? 1) * (limit ?? 10), total)} of ${total} ${entityName}(s)`
                    : `Showing ${table.getFilteredRowModel().rows.length === 0
                      ? 0
                      : table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1
                    } to ${table.getFilteredRowModel().rows.length === 0
                      ? 0
                      : Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )
                    } of ${table.getFilteredRowModel().rows.length} ${entityName}(s)`}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-center gap-2 justify-start">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                    value={`${serverSidePagination ? limit ?? defaultPageSize : table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      const numValue = Number(value);
                      if (serverSidePagination && onLimitChange) {
                        onLimitChange(numValue);
                      } else {
                        table.setPageSize(numValue);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder="Rows" labels={PAGE_SIZE_LABELS} />
                    </SelectTrigger>
                    <SelectContent side="top" align="start">
                      {[10, 20, 30, 50, 100].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 justify-start">
                  <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
                    Page{" "}
                    {serverSidePagination
                      ? page ?? 1
                      : table.getFilteredRowModel().rows.length === 0
                        ? 0
                        : table.getState().pagination.pageIndex + 1}{" "}
                    of{" "}
                    {serverSidePagination
                      ? totalPages ?? 1
                      : table.getPageCount()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (serverSidePagination && onPageChange) {
                          onPageChange(1);
                        } else {
                          table.setPageIndex(0);
                        }
                      }}
                      disabled={
                        serverSidePagination
                          ? (page ?? 1) <= 1
                          : !table.getCanPreviousPage()
                      }
                    >
                      <span className="sr-only">Go to first page</span>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (serverSidePagination && onPageChange && page) {
                          onPageChange(page - 1);
                        } else {
                          table.previousPage();
                        }
                      }}
                      disabled={
                        serverSidePagination
                          ? (page ?? 1) <= 1
                          : !table.getCanPreviousPage()
                      }
                    >
                      <span className="sr-only">Go to previous page</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (serverSidePagination && onPageChange && page) {
                          onPageChange(page + 1);
                        } else {
                          table.nextPage();
                        }
                      }}
                      disabled={
                        serverSidePagination
                          ? (page ?? 1) >= (totalPages ?? 1)
                          : !table.getCanNextPage()
                      }
                    >
                      <span className="sr-only">Go to next page</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (serverSidePagination && onPageChange && totalPages) {
                          onPageChange(totalPages);
                        } else {
                          table.setPageIndex(table.getPageCount() - 1);
                        }
                      }}
                      disabled={
                        serverSidePagination
                          ? (page ?? 1) >= (totalPages ?? 1)
                          : !table.getCanNextPage()
                      }
                    >
                      <span className="sr-only">Go to last page</span>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}