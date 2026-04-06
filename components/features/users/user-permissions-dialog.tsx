"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PERMISSION_DEFINITIONS } from "@/lib/constants/permissions";
import { doPatchAdminUser, type AppUserRow } from "@/lib/services/users";
import { toast } from "sonner";

type UserPermissionsDialogProps = {
  rowUser: AppUserRow;
  disabled?: boolean;
};

export function UserPermissionsDialog({
  rowUser,
  disabled = false,
}: UserPermissionsDialogProps) {
  const queryClient = useQueryClient();
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [localPermissions, setLocalPermissions] = useState<Record<string, boolean>>({});

  const openPermissionsDialog = () => {
    const granted = new Set(rowUser.permissions ?? []);
    const next: Record<string, boolean> = {};
    for (const p of PERMISSION_DEFINITIONS) {
      next[p.key] = granted.has(p.key);
    }
    setLocalPermissions(next);
    setPermissionsOpen(true);
  };

  const savePermissionsMutation = useMutation({
    mutationFn: () =>
      doPatchAdminUser(rowUser.id, {
        permissions: Object.entries(localPermissions)
          .filter(([, allowed]) => allowed)
          .map(([key]) => key),
      }),
    onSuccess: async () => {
      toast.success("User permissions updated");
      setPermissionsOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update permissions");
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openPermissionsDialog}
        disabled={disabled}
        className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
      >
        Edit Permissions
      </Button>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage permissions</DialogTitle>
            <DialogDescription>
              Set explicit permissions for {rowUser.name}. Anything not granted stays denied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {PERMISSION_DEFINITIONS.map((p) => {
              const granted = localPermissions[p.key] ?? false;
              return (
                <button
                  type="button"
                  key={p.key}
                  onClick={() =>
                    setLocalPermissions((prev) => ({
                      ...prev,
                      [p.key]: !granted,
                    }))
                  }
                  className={`w-full text-left flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                    granted ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
                      granted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{p.description}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      granted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {granted ? "Granted" : "Denied"}
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => savePermissionsMutation.mutate()}
              disabled={savePermissionsMutation.isPending}
            >
              {savePermissionsMutation.isPending ? "Saving..." : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
