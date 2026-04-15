"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { IExpenseData } from "@/types";
import { formatDateForInput } from "@/lib/helpers";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { doGetGyms } from "@/lib/services/gyms";

type ExpenseFormData = {
  category: string;
  description?: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "overdue";
  vendor?: string;
  gymId: string;
};

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
const statusLabels: Record<ExpenseFormData["status"], string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue",
};

interface ExpenseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: IExpenseData | null;
  onSave: (data: ExpenseFormData) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function ExpenseFormModal({
  open,
  onOpenChange,
  expense,
  onSave,
  isSubmitting = false,
}: ExpenseFormModalProps) {
  const isEditMode = !!expense;
  const { isSuperAdmin, currentUser, hasPermission } = usePermissions();
  const canLoadGyms = hasPermission(PERMISSIONS.GYMS_READ);
  const showGymDropdown = isSuperAdmin;
  const { data: gymsListData, isLoading: isGymsLoading } = useQuery({
    queryKey: ["gyms", "list", "expenseFormModal"],
    queryFn: () => doGetGyms({ page: 1, limit: 200 }),
    enabled: showGymDropdown && canLoadGyms,
  });
  const gymOptions = gymsListData?.gyms ?? [];
  const gymLabels = React.useMemo(
    () =>
      gymOptions.reduce<Record<string, string>>((acc, gym) => {
        acc[String(gym.gymId)] = gym.gymName;
        return acc;
      }, {}),
    [gymOptions]
  );

  const form = useForm<ExpenseFormData>({
    defaultValues: {
      category: "",
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      vendor: "",
      gymId: "",
    },
  });

  React.useEffect(() => {
    if (expense) {
      form.reset({
        category: expense.category,
        description: expense.description ?? "",
        amount: expense.amount,
        date: formatDateForInput(expense.date),
        status: expense.status as ExpenseFormData["status"],
        vendor: expense.vendor ?? "",
        gymId: expense.gymId != null ? String(expense.gymId) : "",
      });
    } else {
      form.reset({
        category: "",
        description: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        vendor: "",
        gymId: showGymDropdown ? "" : String(currentUser?.gymId ?? ""),
      });
    }
  }, [expense, form, showGymDropdown, currentUser?.gymId]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await onSave(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update expense information"
              : "Add a new expense to the gym"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" labels={categoryLabels} />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{
                  required: "Category is required",
                }}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rs.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{
                  required: "Amount is required",
                  min: {
                    value: 0,
                    message: "Amount must be greater than or equal to 0",
                  },
                }}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={formatDateForInput(field.value) || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{
                  required: "Date is required",
                }}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" labels={statusLabels} />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{
                  required: "Status is required",
                }}
              />

              {showGymDropdown ? (
                <FormField
                  control={form.control}
                  name="gymId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Gym
                        <span className="ml-1 text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full" disabled={isGymsLoading || gymOptions.length === 0}>
                            <SelectValue
                              placeholder={isGymsLoading ? "Loading gyms..." : "Select gym"}
                              labels={gymLabels}
                            />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {gymOptions.map((g) => (
                              <SelectItem key={g.gymId} value={String(g.gymId)}>
                                {g.gymName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                  rules={{
                    validate: (value) => !!String(value).trim() || "Gym is required for super admin",
                  }}
                />
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter expense description" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter vendor name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || isSubmitting}>
                {(form.formState.isSubmitting || isSubmitting)
                  ? isEditMode
                    ? "Updating..."
                    : "Adding..."
                  : isEditMode
                  ? "Update Expense"
                  : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
