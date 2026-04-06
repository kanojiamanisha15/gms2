import { useMutation, useQueryClient } from "@tanstack/react-query";
import { putRequest } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { toast } from "sonner";
import type { User } from "@/types/auth";

// Re-export for convenience
export type { User };

/** Hook to update a user*/
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      userData,
    }: {
      userId: number;
      userData: {
        name?: string;
        email?: string;
        role?: string;
        currentPassword: string;
        newPassword?: string;
        confirmPassword?: string;
      };
    }) => {
      const response = await putRequest<{ success: boolean; data?: User; error?: string }>(
        `${API_ENDPOINTS.USERS}/${userId}`,
        userData
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to update user");
      }
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("User updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update user");
    },
  });
}
