import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import type {
  ICreateTrainerData,
  ITrainerData,
  IUpdateTrainerData,
} from "@/types";

type TrainersListResponse = {
  success: boolean;
  data?: {
    trainers: ITrainerData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type TrainerByIdResponse = {
  success: boolean;
  data?: { trainer: ITrainerData };
  error?: string;
};

// GET /api/trainers - Get all trainers with pagination
export const doGetTrainers = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'phone' | 'role' | 'hireDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  trainers: ITrainerData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await getRequest<TrainersListResponse>(
    API_ENDPOINTS.TRAINERS,
    {
      search: params?.search?.trim(),
      page: page.toString(),
      limit: limit.toString(),
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    }
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch trainers");
  }

  const data = response.data!;
  return {
    trainers: data.trainers ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

// GET /api/trainers/:id - Get trainer by ID
export const doGetTrainerById = async (
  trainerId: number | string,
  options?: { signal?: AbortSignal }
): Promise<ITrainerData> => {
  const id = typeof trainerId === "string" ? trainerId : String(trainerId);
  const response = await getRequest<TrainerByIdResponse>(
    `${API_ENDPOINTS.TRAINERS}/${id}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch trainer");
  }

  return response.data!.trainer;
};

// POST /api/trainers - Create trainer
export const doCreateTrainer = async (
  trainerData: ICreateTrainerData
): Promise<{ success: boolean; data?: { trainer: ITrainerData }; error?: string }> => {
  const response = await postRequest<TrainerByIdResponse>(
    API_ENDPOINTS.TRAINERS,
    {
      name: trainerData.name.trim(),
      email: trainerData.email?.trim() || null,
      phone: trainerData.phone?.trim(),
      role: trainerData.role,
      hireDate: trainerData.hireDate,
      status: trainerData.status ?? "active",
    }
  );
  return response;
};

// PUT /api/trainers/:id - Update trainer
export const doUpdateTrainer = async (
  trainerId: number | string,
  trainerData: IUpdateTrainerData
): Promise<{ success: boolean; data?: { trainer: ITrainerData }; error?: string }> => {
  const id = typeof trainerId === "string" ? trainerId : String(trainerId);
  const response = await putRequest<TrainerByIdResponse>(
    `${API_ENDPOINTS.TRAINERS}/${id}`,
    trainerData
  );
  return response;
};

// DELETE /api/trainers/:id - Delete trainer
export const doDeleteTrainer = async (
  trainerId: number | string
): Promise<{ success: boolean; error?: string }> => {
  const id = typeof trainerId === "string" ? trainerId : String(trainerId);
  const response = await deleteRequest<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.TRAINERS}/${id}`
  );
  return response;
};
