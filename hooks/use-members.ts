import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  doGetMemberById,
  doGetExpiringMembers,
  doCreateMember,
  doUpdateMember,
} from "@/lib/services/members";
import type { ICreateMemberData, IUpdateMemberData } from "@/types";

/** Hook to fetch members expiring in a given month/year */
export function useExpiringMembers(
  month: number,
  year: number,
  sortBy?: "name" | "email" | "phone" | "membershipType" | "expirationDate" | "daysRemaining" | "gymId",
  sortOrder?: "asc" | "desc"
) {
  return useQuery({
    queryKey: ["members", "expiring", month, year, sortBy, sortOrder],
    queryFn: () => doGetExpiringMembers({ month, year, sortBy, sortOrder }),
    enabled: month >= 0 && month <= 11 && year >= 1900 && year <= 2100,
  });
}

/** Hook to fetch a single member by ID */
export function useMember(memberId: string | undefined) {
  return useQuery({
    queryKey: ["members", memberId],
    queryFn: () => doGetMemberById(memberId!),
    enabled: !!memberId,
  });
}

/** Hook to create a new member */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ICreateMemberData) => {
      const response = await doCreateMember(data);
      if (!response?.success) {
        throw new Error(response?.error ?? "Failed to add member");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Member added successfully");
    },
    onError: (error) => {
      console.error("Create member error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add member. Please try again."
      );
    },
  });
}

/** Hook to update an existing member */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      data,
    }: {
      memberId: string;
      data: IUpdateMemberData;
    }) => {
      const response = await doUpdateMember(memberId, data);
      if (!response?.success) {
        throw new Error(response?.error ?? "Failed to update member");
      }
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members", variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Member updated successfully");
    },
    onError: (error) => {
      console.error("Update member error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update member. Please try again."
      );
    },
  });
}
