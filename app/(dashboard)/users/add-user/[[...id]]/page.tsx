"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContent } from "@/components/ui/page-content";
import { Card, CardContent } from "@/components/ui/card";
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
import { ContentLoader } from "@/components/ui/content-loader";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  useAdminUser,
  useCreateAdminUser,
  useUpdateAdminUser,
} from "@/hooks/use-admin-users";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  isSuperAdminRole,
  ROLE_KEYS,
  ROLE_LABELS,
  SUPER_ADMIN_ROLE,
} from "@/lib/constants/roles";
import { doGetGyms } from "@/lib/services/gyms";

const NO_GYM_VALUE = "__none__";

type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: string;
  gymId: string;
};

export default function AddUserPage() {
  const router = useRouter();
  const params = useParams();

  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isEditMode = Boolean(userId);

  const { isSuperAdmin: isCurrentSuperAdmin, hasPermission } = usePermissions();
  const { data: user, isLoading, isError, error } = useAdminUser(userId);
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();

  const canLoadGyms = hasPermission(PERMISSIONS.GYMS_READ);

  const { data: gymsListData } = useQuery({
    queryKey: ["gyms", "list", "userForm"],
    queryFn: () => doGetGyms({ page: 1, limit: 200 }),
    enabled: canLoadGyms,
  });
  const gymOptions = gymsListData?.gyms ?? [];

  const dropdownGyms = useMemo(() => {
    const list = gymOptions.map((g) => ({ gymId: g.gymId, gymName: g.gymName }));
    if (
      isEditMode &&
      user?.gymId &&
      !list.some((g) => g.gymId === user.gymId)
    ) {
      return [
        {
          gymId: user.gymId,
          gymName: user.gymName ?? String(user.gymId),
        },
        ...list,
      ];
    }
    return list;
  }, [gymOptions, isEditMode, user]);

  const gymSelectLabels = useMemo(() => {
    const m: Record<string, string> = { [NO_GYM_VALUE]: "No gym selected" };
    for (const g of dropdownGyms) {
      const idStr = String(g.gymId);
      m[idStr] = `${g.gymName} (${idStr})`;
    }
    return m;
  }, [dropdownGyms]);

  const canManageRoles = hasPermission(PERMISSIONS.SYSTEM_MANAGE_ROLES);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const form = useForm<UserFormData>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
      gymId: NO_GYM_VALUE,
    },
  });

  useEffect(() => {
    if (!isEditMode || !user) return;
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      gymId: user.gymId != null ? String(user.gymId) : NO_GYM_VALUE,
    });
  }, [isEditMode, user, form]);

  const onSubmit = (data: UserFormData) => {
    if (isEditMode) {
      if (!userId || !user) return;
      if (isSuperAdminRole(user.role) && !isCurrentSuperAdmin) return;

      const body: {
        name?: string;
        email?: string;
        role?: string;
        password?: string;
        gymId?: number | null;
      } = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
      };
      if (canManageRoles) {
        body.role = data.role;
      }
      if (data.password.trim().length > 0) {
        body.password = data.password.trim();
      }
      if (data.gymId === NO_GYM_VALUE || !String(data.gymId).trim()) {
        body.gymId = null;
      } else {
        const n = parseInt(String(data.gymId).trim(), 10);
        body.gymId = Number.isFinite(n) && n >= 1 ? n : null;
      }

      updateMutation.mutate(
        { id: user.id, body },
        { onSuccess: () => router.push("/users") }
      );
      return;
    }

    createMutation.mutate(
      {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: canManageRoles ? data.role : "user",
        gymId:
          data.gymId === NO_GYM_VALUE || !String(data.gymId).trim()
            ? null
            : (() => {
                const n = parseInt(String(data.gymId).trim(), 10);
                return Number.isFinite(n) && n >= 1 ? n : null;
              })(),
      },
      { onSuccess: () => router.push("/users") }
    );
  };

  const showLoading = isEditMode && isLoading;
  const showError = isEditMode && isError;
  const showNotFound = isEditMode && !user && !isLoading && !isError;
  const showSuperAdminBlock =
    isEditMode && user && isSuperAdminRole(user.role) && !isCurrentSuperAdmin;

  return (
    <PageContent
      title={isEditMode ? "Edit User" : "Add User"}
      description={
        isEditMode
          ? "Update account details, role, and optional password"
          : "Create a new application account"
      }
      headerAction={
        <Link href="/users">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      }
    >
      <div className="px-4 lg:px-6 space-y-4">
        {showLoading ? (
          <ContentLoader message="Loading user details..." />
        ) : showError ? (
          <Card>
            <CardContent className="pt-6">
              <ErrorMessage error={error} fallback="Failed to fetch user" />
              <Link href="/users">
                <Button variant="outline" className="mt-4">
                  Back to Users
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showNotFound ? (
          <Card>
            <CardContent className="pt-6">
              <p>User not found</p>
              <Link href="/users">
                <Button variant="outline" className="mt-4">
                  Back to Users
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showSuperAdminBlock ? (
          <Card className="max-w-lg border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Super admin</p>
              <p className="mt-2">
                Only the super admin can edit this account. Sign in as the super
                admin account to continue.
              </p>
              <Link href="/users">
                <Button variant="outline" className="mt-4">
                  Back to Users
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: "Name is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="name" placeholder="John Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      rules={{ required: "Email is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              autoComplete="email"
                              placeholder="john.doe@example.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      rules={
                        isEditMode
                          ? {}
                          : {
                              required: "Password is required",
                              minLength: { value: 6, message: "At least 6 characters" },
                            }
                      }
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isEditMode ? "New password" : "Password"}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete={isEditMode ? "new-password" : "off"}
                              placeholder={
                                isEditMode
                                  ? "Leave blank to keep current password"
                                  : "Enter password"
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger
                                className="w-full"
                                disabled={!canManageRoles}
                              >
                                <SelectValue
                                  placeholder="Select role"
                                  labels={ROLE_LABELS}
                                />
                              </SelectTrigger>
                              <SelectContent align="start">
                                {ROLE_KEYS.filter(
                                  (key) =>
                                    isCurrentSuperAdmin || key !== SUPER_ADMIN_ROLE
                                ).map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {ROLE_LABELS[key]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          {!canManageRoles ? (
                            <p className="text-xs text-muted-foreground">
                              {isEditMode
                                ? "Only administrators with role management can change roles."
                                : "New accounts default to the user role."}
                            </p>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gymId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Gym</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder="Select gym"
                                  labels={gymSelectLabels}
                                />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value={NO_GYM_VALUE}>
                                  No gym selected
                                </SelectItem>
                                {dropdownGyms.map((g) => (
                                  <SelectItem key={g.gymId} value={String(g.gymId)}>
                                    {g.gymName} ({g.gymId})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <ErrorMessage
                    error={submitError}
                    fallback="An error occurred. Please try again."
                  />

                  <div className="flex items-center gap-4 justify-end">
                    <Link href="/users">
                      <Button type="button" variant="outline" disabled={isSubmitting}>
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? isEditMode
                          ? "Saving..."
                          : "Creating..."
                        : isEditMode
                          ? "Save changes"
                          : "Create user"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContent>
  );
}
