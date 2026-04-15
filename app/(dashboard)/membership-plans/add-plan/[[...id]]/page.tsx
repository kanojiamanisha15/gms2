"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  useMembershipPlan,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
} from "@/hooks/use-membership-plans";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { doGetGyms } from "@/lib/services/gyms";
import { ContentLoader } from "@/components/ui/content-loader";
import { ErrorMessage } from "@/components/ui/error-message";

type MembershipPlanFormData = {
  name: string;
  price: number;
  gymId: string;
  duration: string;
  features: string;
  status: "active" | "inactive";
};

const durationLabels: Record<string, string> = {
  "1 month": "1 month",
  "3 months": "3 months",
  "6 months": "6 months",
  "1 year": "1 year",
};
const statusLabels: Record<MembershipPlanFormData["status"], string> = {
  active: "Active",
  inactive: "Inactive",
};

export default function AddMembershipPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isEditMode = !!planId;

  const {
    data: apiPlan,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
  } = useMembershipPlan(planId);
  const { isSuperAdmin, currentUser, hasPermission } = usePermissions();
  const createMutation = useCreateMembershipPlan();
  const updateMutation = useUpdateMembershipPlan();
  const canLoadGyms = hasPermission(PERMISSIONS.GYMS_READ);
  const showGymDropdown = isSuperAdmin;

  const { data: gymsListData, isLoading: isGymsLoading } = useQuery({
    queryKey: ["gyms", "list", "membershipPlanForm"],
    queryFn: () => doGetGyms({ page: 1, limit: 200 }),
    enabled: showGymDropdown && canLoadGyms,
  });
  const gymOptions = gymsListData?.gyms ?? [];
  const gymLabels = useMemo(
    () =>
      gymOptions.reduce<Record<string, string>>((acc, gym) => {
        acc[String(gym.gymId)] = gym.gymName;
        return acc;
      }, {}),
    [gymOptions]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const form = useForm<MembershipPlanFormData>({
    defaultValues: {
      name: "",
      price: 0,
      gymId: "",
      duration: "1 month",
      features: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (!apiPlan || !isEditMode) return;

    form.reset({
      name: apiPlan.name,
      price: apiPlan.price,
      gymId: apiPlan.gymId != null ? String(apiPlan.gymId) : "",
      duration: apiPlan.duration,
      features: apiPlan.features ?? "",
      status: (apiPlan.status as MembershipPlanFormData["status"]) ?? "active",
    });
  }, [apiPlan, isEditMode, form]);

  const onSubmit = (data: MembershipPlanFormData) => {
    const payload = {
      name: data.name.trim(),
      price: data.price,
      gymId: showGymDropdown
        ? !String(data.gymId).trim()
          ? null
          : Number(String(data.gymId))
        : currentUser?.gymId ?? null,
      duration: data.duration,
      features: data.features?.trim() || null,
      status: data.status,
    };

    if (isEditMode && planId) {
      updateMutation.mutate(
        { planId, data: payload },
        { onSuccess: () => router.push("/membership-plans") }
      );
    } else {
      createMutation.mutate(
        { ...payload, status: payload.status ?? "active" },
        { onSuccess: () => router.push("/membership-plans") }
      );
    }
  };

  const showForm = !isEditMode || (isEditMode && apiPlan);
  const showLoading = isPlanLoading && isEditMode;
  const showError = isPlanError;
  const showNotFound = isEditMode && !apiPlan && !isPlanLoading && !isPlanError;

  return (
    <PageContent
      title={isEditMode ? "Edit Membership Plan" : "Add Membership Plan"}
      description={
        isEditMode
          ? "Edit membership plan information"
          : "Add a new membership plan"
      }
      headerAction={
        <Link href="/membership-plans">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Membership Plans
          </Button>
        </Link>
      }
    >
      <div className="px-4 lg:px-6 space-y-4">
        {showLoading ? (
          <ContentLoader message="Loading plan details..." />
        ) :
        showError ? (
          <Card>
            <CardContent className="pt-6">
              <ErrorMessage
                error={planError}
                fallback="Failed to fetch membership plan. Please try again."
              />
              <Link href="/membership-plans">
                <Button variant="outline" className="mt-4">
                  Back to Membership Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showNotFound ? (
          <Card>
            <CardContent className="pt-6">
              <p>Membership plan not found</p>
              <Link href="/membership-plans">
                <Button variant="outline" className="mt-4">
                  Back to Membership Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : 
        showForm ? (
          <Card>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Basic" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Plan name is required",
                        minLength: {
                          value: 2,
                          message: "Plan name must be at least 2 characters",
                        },
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (Rs.)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="29.99"
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
                        required: "Price is required",
                        min: {
                          value: 0,
                          message: "Price must be greater than or equal to 0",
                        },
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

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select duration" labels={durationLabels} />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value="1 month">1 month</SelectItem>
                                <SelectItem value="3 months">3 months</SelectItem>
                                <SelectItem value="6 months">6 months</SelectItem>
                                <SelectItem value="1 year">1 year</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Duration is required",
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
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Access to gym facilities, Basic equipment, Group classes..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <ErrorMessage
                    error={submitError}
                    fallback="An error occurred. Please try again."
                  />
                  <div className="flex items-center gap-4 justify-end">
                    <Link href="/membership-plans">
                      <Button type="button" variant="outline" disabled={isSubmitting}>
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? isEditMode
                          ? "Updating..."
                          : "Adding..."
                        : isEditMode
                        ? "Update Membership Plan"
                        : "Add Membership Plan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageContent>
  );
}
