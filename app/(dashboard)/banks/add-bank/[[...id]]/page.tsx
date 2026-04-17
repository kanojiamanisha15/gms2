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
import { useBank, useCreateBank, useUpdateBank } from "@/hooks/use-banks";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { doGetGyms } from "@/lib/services/gyms";
import { ContentLoader } from "@/components/ui/content-loader";
import { ErrorMessage } from "@/components/ui/error-message";

type BankFormData = {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  branchName: string;
  accountType: "savings" | "current" | "salary" | "other";
  upiId: string;
  gymId: string;
};

const accountTypeLabels: Record<BankFormData["accountType"], string> = {
  savings: "Savings",
  current: "Current",
  salary: "Salary",
  other: "Other",
};

export default function AddBankPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isEditMode = !!bankId;

  const {
    data: apiBank,
    isLoading: isBankLoading,
    isError: isBankError,
    error: bankError,
  } = useBank(bankId);
  const { isSuperAdmin, currentUser, hasPermission } = usePermissions();
  const createMutation = useCreateBank();
  const updateMutation = useUpdateBank();
  const canLoadGyms = hasPermission(PERMISSIONS.GYMS_READ);
  const showGymDropdown = isSuperAdmin;

  const { data: gymsListData, isLoading: isGymsLoading } = useQuery({
    queryKey: ["gyms", "list", "bankForm"],
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

  const form = useForm<BankFormData>({
    defaultValues: {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      branchName: "",
      accountType: "savings",
      upiId: "",
      gymId: "",
    },
  });

  useEffect(() => {
    if (!apiBank || !isEditMode) return;

    form.reset({
      bankName: apiBank.bankName,
      accountNumber: apiBank.accountNumber ?? "",
      ifscCode: apiBank.ifscCode ?? "",
      accountHolderName: apiBank.accountHolderName,
      branchName: apiBank.branchName,
      accountType: (apiBank.accountType as BankFormData["accountType"]) ?? "savings",
      upiId: apiBank.upiId ?? "",
      gymId: apiBank.gymId != null ? String(apiBank.gymId) : "",
    });
  }, [apiBank, isEditMode, form]);

  const onSubmit = (data: BankFormData) => {
    const payload = {
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber?.trim() || null,
      ifscCode: data.ifscCode?.trim().toUpperCase() || null,
      accountHolderName: data.accountHolderName.trim(),
      branchName: data.branchName.trim(),
      accountType: data.accountType,
      upiId: data.upiId?.trim() || null,
      gymId: showGymDropdown
        ? !String(data.gymId).trim()
          ? null
          : Number(String(data.gymId))
        : currentUser?.gymId ?? null,
    };

    if (isEditMode && bankId) {
      updateMutation.mutate(
        { bankId, data: payload },
        { onSuccess: () => router.push("/banks") }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => router.push("/banks") });
    }
  };

  const showForm = !isEditMode || (isEditMode && apiBank);
  const showLoading = isBankLoading && isEditMode;
  const showError = isBankError;
  const showNotFound = isEditMode && !apiBank && !isBankLoading && !isBankError;

  return (
    <PageContent
      title={isEditMode ? "Edit Bank" : "Add Bank"}
      description={isEditMode ? "Edit bank details" : "Add new bank details"}
      headerAction={
        <Link href="/banks">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Banks
          </Button>
        </Link>
      }
    >
      <div className="px-4 lg:px-6 space-y-4">
        {showLoading ? (
          <ContentLoader message="Loading bank details..." />
        ) : showError ? (
          <Card>
            <CardContent className="pt-6">
              <ErrorMessage
                error={bankError}
                fallback="Failed to fetch bank. Please try again."
              />
              <Link href="/banks">
                <Button variant="outline" className="mt-4">
                  Back to Banks
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showNotFound ? (
          <Card>
            <CardContent className="pt-6">
              <p>Bank not found</p>
              <Link href="/banks">
                <Button variant="outline" className="mt-4">
                  Back to Banks
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : showForm ? (
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
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Bank Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="HDFC Bank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{ required: "Bank name is required" }}
                    />

                    <FormField
                      control={form.control}
                      name="accountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Account Holder Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{ required: "Account holder name is required" }}
                    />

                    <FormField
                      control={form.control}
                      name="branchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Branch Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="MG Road Branch" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{ required: "Branch name is required" }}
                    />

                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Account Type
                          </FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select account type" labels={accountTypeLabels} />
                              </SelectTrigger>
                              <SelectContent align="start">
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="current">Current</SelectItem>
                                <SelectItem value="salary">Salary</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      rules={{ required: "Account type is required" }}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input placeholder="HDFC0001234" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="upiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UPI ID</FormLabel>
                          <FormControl>
                            <Input placeholder="gym@upi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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

                  <ErrorMessage
                    error={submitError}
                    fallback="An error occurred. Please try again."
                  />
                  <div className="flex items-center gap-4 justify-end">
                    <Link href="/banks">
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
                        ? "Update Bank"
                        : "Add Bank"}
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
