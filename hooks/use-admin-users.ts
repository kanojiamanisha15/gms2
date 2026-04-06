import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  doCreateAdminUser,
  doDeleteAdminUser,
  doGetAdminUser,
  doPatchAdminUser,
  type CreateAdminUserBody,
  type UpdateAdminUserBody,
} from "@/lib/services/users";

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: CreateAdminUserBody) => doCreateAdminUser(body),
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      router.push("/users");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to create user");
    },
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: ["adminUser", id],
    queryFn: () => doGetAdminUser(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: UpdateAdminUserBody;
    }) => doPatchAdminUser(id, body),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminUser"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      router.push("/users");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to update user");
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => doDeleteAdminUser(id),
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete user");
    },
  });
}
