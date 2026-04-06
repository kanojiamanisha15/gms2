"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useGym, useCreateGym, useUpdateGym } from "@/hooks/use-gyms";
import { ContentLoader } from "@/components/ui/content-loader";
import { ErrorMessage } from "@/components/ui/error-message";

type GymFormValues = {
  gymName: string;
  address: string;
};

type GymFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, dialog edits this gym; when null, creates a new gym. */
  editingGymId: string | null;
};

export function GymFormDialog({
  open,
  onOpenChange,
  editingGymId,
}: GymFormDialogProps) {
  const isEditMode = editingGymId != null;

  const {
    data: apiGym,
    isLoading: isGymLoading,
    isError: isGymError,
    error: gymError,
  } = useGym(editingGymId ?? undefined, {
    enabled: open && isEditMode && !!editingGymId,
  });

  const createMutation = useCreateGym();
  const updateMutation = useUpdateGym();

  const form = useForm<GymFormValues>({
    defaultValues: { gymName: "", address: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (!isEditMode) {
      form.reset({ gymName: "", address: "" });
    }
  }, [open, isEditMode, form]);

  useEffect(() => {
    if (!open || !isEditMode || !apiGym) return;
    form.reset({
      gymName: apiGym.gymName,
      address: apiGym.address,
    });
  }, [open, isEditMode, apiGym, form]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const onSubmit = (values: GymFormValues) => {
    const payload = {
      gymName: values.gymName.trim(),
      address: values.address.trim(),
    };

    if (isEditMode && editingGymId) {
      updateMutation.mutate(
        { gymId: editingGymId, data: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const showEditLoader = isEditMode && isGymLoading && open;
  const showEditError = isEditMode && isGymError && open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit gym" : "Add gym"}</DialogTitle>
        </DialogHeader>

        {showEditLoader ? (
          <ContentLoader message="Loading gym..." />
        ) : showEditError ? (
          <ErrorMessage error={gymError} fallback="Failed to load gym." />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              {isEditMode && apiGym ? (
                <FormItem>
                  <FormLabel>Gym ID</FormLabel>
                  <Input value={apiGym.gymId} readOnly disabled />
                </FormItem>
              ) : null}

              <FormField
                control={form.control}
                name="gymName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gym name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Street Fitness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{
                  required: "Gym name is required",
                  minLength: {
                    value: 2,
                    message: "Gym name must be at least 2 characters",
                  },
                }}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Rd, City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
                rules={{ required: "Address is required" }}
              />

              <ErrorMessage error={submitError} />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : isEditMode
                      ? "Save changes"
                      : "Create gym"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
