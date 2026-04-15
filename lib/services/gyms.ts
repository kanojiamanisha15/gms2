import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { ICreateGymData, IGymData, IUpdateGymData } from '@/types';

type GymsListResponse = {
  success: boolean;
  data?: {
    gyms: IGymData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type GymByIdResponse = {
  success: boolean;
  data?: { gym: IGymData };
  error?: string;
};

export const doGetGyms = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'gymId' | 'gymName' | 'address';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  gyms: IGymData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await getRequest<GymsListResponse>(API_ENDPOINTS.GYMS, {
    search: params?.search?.trim(),
    page: page.toString(),
    limit: limit.toString(),
    sortBy: params?.sortBy,
    sortOrder: params?.sortOrder,
  });

  if (!response?.success) {
    throw new Error(response?.error ?? 'Failed to fetch gyms');
  }

  const data = response.data!;
  return {
    gyms: data.gyms ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

export const doGetGymById = async (
  gymId: string,
  options?: { signal?: AbortSignal }
): Promise<IGymData> => {
  const response = await getRequest<GymByIdResponse>(
    `${API_ENDPOINTS.GYMS}/${encodeURIComponent(gymId)}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? 'Failed to fetch gym');
  }

  return response.data!.gym;
};

export const doCreateGym = async (
  gymData: ICreateGymData
): Promise<{ success: boolean; data?: { gym: IGymData }; error?: string }> => {
  return postRequest<GymByIdResponse>(API_ENDPOINTS.GYMS, {
    gymName: gymData.gymName.trim(),
    address: gymData.address.trim(),
  });
};

export const doUpdateGym = async (
  gymId: string,
  gymData: IUpdateGymData
): Promise<{ success: boolean; data?: { gym: IGymData }; error?: string }> => {
  return putRequest<GymByIdResponse>(
    `${API_ENDPOINTS.GYMS}/${encodeURIComponent(gymId)}`,
    gymData
  );
};

export const doDeleteGym = async (
  gymId: string
): Promise<{ success: boolean; error?: string }> => {
  return deleteRequest<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.GYMS}/${encodeURIComponent(gymId)}`
  );
};