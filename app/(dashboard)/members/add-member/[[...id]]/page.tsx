"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
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
import { useMember, useCreateMember, useUpdateMember } from "@/hooks/use-members";
import { useAllMembershipPlans } from "@/hooks/use-membership-plans";
import { formatDateForInput, calculateExpirationDate } from "@/lib/helpers";
import { PhoneInput } from "@/components/ui/phone-input";
import { ContentLoader } from "@/components/ui/content-loader";

type MemberFormData = {
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  joinDate: string;
  expiryDate: string;
  status: "active" | "inactive" | "expired";
  paymentStatus: "paid" | "unpaid";
  paymentAmount: number;
};

const statusLabels: Record<MemberFormData["status"], string> = {
  active: "Active",
  inactive: "Inactive",
  expired: "Expired",
};
const paymentStatusLabels: Record<MemberFormData["paymentStatus"], string> = {
  paid: "Paid",
  unpaid: "Unpaid",
};

export default function AddMemberPage() {
  const router = useRouter();
  const params = useParams();

  // Handle catch-all route: params.id will be an array or undefined
  const memberId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isEditMode = !!memberId;

  const {
    data: apiMember,
    isLoading: isMemberLoading,
    isError: isMemberError,
    error: memberError,
  } = useMember(memberId);
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const { data: plansData } = useAllMembershipPlans();
  const plans = plansData?.plans ?? [];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.error ?? updateMutation.error;

  const form = useForm<MemberFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      membershipType: "",
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      status: "active",
      paymentStatus: "unpaid",
      paymentAmount: 0,
    },
  });

  // Calculate expiry date when join date or membership type changes (only in add mode)
  const joinDate = form.watch("joinDate");
  const membershipType = form.watch("membershipType");

  useEffect(() => {
    // Only auto-calculate expiry date when adding a new member, not when editing
    if (!isEditMode && joinDate && membershipType && plans.length > 0) {
      const duration = plans.find((p) => p.name === membershipType)?.duration;
      const calculatedExpiry = calculateExpirationDate(joinDate, duration);
      form.setValue("expiryDate", calculatedExpiry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinDate, membershipType, isEditMode, plans]);

  // Populate form when member data is loaded (edit mode)
  useEffect(() => {
    if (!apiMember || !isEditMode) return;

    form.reset({
      name: apiMember.name,
      email: apiMember.email ?? "",
      phone: apiMember.phone ?? "",
      membershipType: apiMember.membershipType,
      joinDate: formatDateForInput(apiMember.joinDate),
      expiryDate: formatDateForInput(apiMember.expiryDate),
      status: apiMember.status as MemberFormData["status"],
      paymentStatus: apiMember.paymentStatus as MemberFormData["paymentStatus"],
      paymentAmount: apiMember.paymentAmount,
    });
  }, [apiMember, isEditMode, form]);

  const onSubmit = (data: MemberFormData) => {
    const payload = {
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim(),
      membershipType: data.membershipType,
      joinDate: data.joinDate,
      expiryDate: data.expiryDate,
      status: data.status,
      paymentStatus: data.paymentStatus,
      paymentAmount: data.paymentAmount,
    };

    if (isEditMode && memberId) {
      updateMutation.mutate(
        { memberId, data: payload },
        { onSuccess: () => router.push("/members") }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => router.push("/members"),
      });
    }
  };

  const showForm = !isEditMode || (isEditMode && apiMember);
  const showLoading = isMemberLoading && isEditMode;
  const showError = isMemberError;
  const showNotFound = isEditMode && !apiMember && !isMemberLoading && !isMemberError;

  return (
    <PageContent
      title={isEditMode ? "Edit Member" : "Add Member"}
      description={
        isEditMode ? "Edit member information" : "Add a new member to your gym"
      }
      headerAction={
        <Link href="/members">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
        </Link>
      }
    >
      <div className="px-4 lg:px-6 space-y-4">
        {showLoading ? (
          <ContentLoader message="Loading member details..." />
        ) :
        showError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                {memberError instanceof Error
                  ? memberError.message
                  : "Failed to fetch member. Please try again."}
              </p>
              <Link href="/members">
                <Button variant="outline" className="mt-4">
                  Back to Members
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showNotFound ? (
          <Card>
            <CardContent className="pt-6">
              <p>Member not found</p>
              <Link href="/members">
                <Button variant="outline" className="mt-4">
                  Back to Members
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

                  <FormField
                    control={form.control}
                    name="membershipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Membership Type</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full" disabled={plans.length === 0}>
                              <SelectValue placeholder={plans.length === 0 ? "Loading plans..." : "Select membership type"} />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {plans
                                .filter((p) => p.status === "active")
                                .map((plan) => (
                                  <SelectItem key={plan.id} value={plan.name}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                    rules={{
                      required: "Membership type is required",
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                    rules={{
                      required: "Join date is required",
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                    rules={{
                      required: "Expiry date is required",
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
                              <SelectItem value="expired">Expired</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Status</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select payment status" labels={paymentStatusLabels} />
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                    rules={{
                      required: "Payment status is required",
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount (Rs.)</FormLabel>
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
                      required: "Payment amount is required",
                      min: {
                        value: 0,
                        message:
                          "Payment amount must be greater than or equal to 0",
                      },
                    }}
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-destructive">
                    {submitError instanceof Error
                      ? submitError.message
                      : "An error occurred. Please try again."}
                  </p>
                )}
                <div className="flex items-center gap-4 justify-end">
                  <Link href="/members">
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
                      ? "Update Member"
                      : "Add Member"}
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
