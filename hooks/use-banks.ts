import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  doGetBanks,
  doGetBankById,
  doCreateBank,
  doUpdateBank,
  doDeleteBank,
} from "@/lib/services/banks";
import type { ICreateBankData, IUpdateBankData } from "@/types";

export function useBanks(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["banks", params?.search, params?.page, params?.limit],
    queryFn: () =>
      doGetBanks({
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      }),
  });
}

export function useBank(bankId: number | string | undefined) {
  const id = bankId == null ? undefined : String(bankId);
  return useQuery({
    queryKey: ["banks", id],
    queryFn: () => doGetBankById(id!),
    enabled: !!id,
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ICreateBankData) => {
      const response = await doCreateBank(data);
      if (!response?.success) {
        throw new Error(response?.error ?? "Failed to add bank");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Bank added successfully");
    },
    onError: (error) => {
      console.error("Create bank error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add bank. Please try again."
      );
    },
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bankId,
      data,
    }: {
      bankId: number | string;
      data: IUpdateBankData;
    }) => {
      const response = await doUpdateBank(bankId, data);
      if (!response?.success) {
        throw new Error(response?.error ?? "Failed to update bank");
      }
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["banks", String(variables.bankId)] });
      toast.success("Bank updated successfully");
    },
    onError: (error) => {
      console.error("Update bank error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update bank. Please try again."
      );
    },
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bankId: number | string) => doDeleteBank(bankId),
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ["banks"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        toast.success("Bank deleted successfully");
      } else {
        toast.error(response.error || "Failed to delete bank");
      }
    },
    onError: (error) => {
      console.error("Error deleting bank:", error);
      toast.error("Failed to delete bank. Please try again.");
    },
  });
}
