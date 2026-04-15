import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { doGetGymById, doCreateGym, doUpdateGym } from '@/lib/services/gyms';
import type { ICreateGymData, IUpdateGymData } from '@/types';

export function useGym(
  gymId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['gyms', gymId],
    queryFn: () => doGetGymById(gymId!),
    enabled: (options?.enabled ?? true) && !!gymId,
  });
}

export function useCreateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ICreateGymData) => {
      const response = await doCreateGym(data);
      if (!response?.success) {
        throw new Error(response?.error ?? 'Failed to add gym');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      toast.success('Gym added successfully');
    },
  });
}

export function useUpdateGym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, data }: { gymId: string; data: IUpdateGymData }) => {
      const response = await doUpdateGym(gymId, data);
      if (!response?.success) {
        throw new Error(response?.error ?? 'Failed to update gym');
      }
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      queryClient.invalidateQueries({ queryKey: ['gyms', variables.gymId] });
      toast.success('Gym updated successfully');
    },
  });
}
