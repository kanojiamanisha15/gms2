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
import { useTrainer, useCreateTrainer, useUpdateTrainer } from "@/hooks/use-trainers";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { doGetGyms } from "@/lib/services/gyms";
import { formatDateForInput } from "@/lib/helpers";
import { PhoneInput } from "@/components/ui/phone-input";
import { ContentLoader } from "@/components/ui/content-loader";
import { ErrorMessage } from "@/components/ui/error-message";

type TrainerFormData = {
  name: string;
  email: string;
  phone: string;
  gymId: string;
  role: "trainer" | "staff";
  hireDate: string;
  status: "active" | "inactive";
};

const roleLabels: Record<TrainerFormData["role"], string> = {
  trainer: "Trainer",
  staff: "Staff",
};
const statusLabels: Record<TrainerFormData["status"], string> = {
  active: "Active",
  inactive: "Inactive",
};

function toApiRole(role: "trainer" | "staff"): "Trainer" | "Staff" {
  return role === "staff" ? "Staff" : "Trainer";
}

export default function AddTrainerPage() {
  const router = useRouter();
  const params = useParams();
  const trainerId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isEditMode = !!trainerId;

  const {
    data: apiTrainer,
    isLoading: isTrainerLoading,
    isError: isTrainerError,
    error: trainerError,
  } = useTrainer(trainerId);
  const { isSuperAdmin, currentUser, hasPermission } = usePermissions();
  const createMutation = useCreateTrainer();
  const updateMutation = useUpdateTrainer();
  const canLoadGyms = hasPermission(PERMISSIONS.GYMS_READ);
  const showGymDropdown = isSuperAdmin;

  const { data: gymsListData, isLoading: isGymsLoading } = useQuery({
    queryKey: ["gyms", "list", "trainerForm"],
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

  const form = useForm<TrainerFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gymId: "",
      role: "trainer",
      hireDate: new Date().toISOString().split("T")[0],
      status: "active",
    },
  });

  useEffect(() => {
    if (!apiTrainer || !isEditMode) return;

    form.reset({
      name: apiTrainer.name,
      email: apiTrainer.email ?? "",
      phone: apiTrainer.phone ?? "",
      gymId: apiTrainer.gymId != null ? String(apiTrainer.gymId) : "",
      role: (apiTrainer.role?.toLowerCase() === "staff" ? "staff" : "trainer") as TrainerFormData["role"],
      hireDate: formatDateForInput(apiTrainer.hireDate),
      status: (apiTrainer.status as TrainerFormData["status"]) ?? "active",
    });
  }, [apiTrainer, isEditMode, form]);

  const onSubmit = (data: TrainerFormData) => {
    const payload = {
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim(),
      gymId: showGymDropdown
        ? !String(data.gymId).trim()
          ? null
          : Number(String(data.gymId))
        : currentUser?.gymId ?? null,
      role: toApiRole(data.role),
      hireDate: data.hireDate,
      status: data.status,
    };

    if (isEditMode && trainerId) {
      updateMutation.mutate(
        { trainerId, data: payload },
        { onSuccess: () => router.push("/trainers-staff") }
      );
    } else {
      createMutation.mutate(
        { ...payload, status: payload.status ?? "active" },
        { onSuccess: () => router.push("/trainers-staff") }
      );
    }
  };

  const showForm = !isEditMode || (isEditMode && apiTrainer);
  const showLoading = isTrainerLoading && isEditMode;
  const showError = isTrainerError;
  const showNotFound = isEditMode && !apiTrainer && !isTrainerLoading && !isTrainerError;

  return (
    <PageContent
      title={isEditMode ? "Edit Trainer/Staff" : "Add Trainer/Staff"}
      description={
        isEditMode
          ? "Edit trainer/staff information"
          : "Add a new trainer or staff member"
      }
      headerAction={
        <Link href="/trainers-staff">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trainers/Staff
          </Button>
        </Link>
      }
    >
      <div className="px-4 lg:px-6 space-y-4">
        {showLoading ? (
          <ContentLoader message="Loading trainer details..." />
        ) :
        showError ? (
          <Card>
            <CardContent className="pt-6">
              <ErrorMessage
                error={trainerError}
                fallback="Failed to fetch trainer. Please try again."
              />
              <Link href="/trainers-staff">
                <Button variant="outline" className="mt-4">
                  Back to Trainers/Staff
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showNotFound ? (
          <Card>
            <CardContent className="pt-6">
              <p>Trainer/Staff not found</p>
              <Link href="/trainers-staff">
                <Button variant="outline" className="mt-4">
                  Back to Trainers/Staff
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
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Name is required",
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters",
                        },
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john.doe@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <PhoneInput {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Phone number is required",
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
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role" labels={roleLabels} />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value="trainer">Trainer</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Role is required",
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{
                        required: "Hire date is required",
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

                  <ErrorMessage
                    error={submitError}
                    fallback="An error occurred. Please try again."
                  />
                  <div className="flex items-center gap-4 justify-end">
                    <Link href="/trainers-staff">
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
                        ? "Update Trainer/Staff"
                        : "Add Trainer/Staff"}
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
