import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import type {
  ICreateMembershipPlanData,
  IMembershipPlanData,
  IUpdateMembershipPlanData,
} from "@/types";

type PlansListResponse = {
  success: boolean;
  data?: {
    plans: IMembershipPlanData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type PlanByIdResponse = {
  success: boolean;
  data?: { plan: IMembershipPlanData };
  error?: string;
};

// GET /api/membership-plans - Get all plans with pagination
export const doGetMembershipPlans = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'duration' | 'features' | 'status';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  plans: IMembershipPlanData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await getRequest<PlansListResponse>(
    API_ENDPOINTS.MEMBERSHIP_PLANS,
    {
      search: params?.search?.trim(),
      page: page.toString(),
      limit: limit.toString(),
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    }
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch membership plans");
  }

  const data = response.data!;
  return {
    plans: data.plans ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

// GET /api/membership-plans/:id - Get plan by ID
export const doGetMembershipPlanById = async (
  planId: number | string,
  options?: { signal?: AbortSignal }
): Promise<IMembershipPlanData> => {
  const id = typeof planId === "string" ? planId : String(planId);
  const response = await getRequest<PlanByIdResponse>(
    `${API_ENDPOINTS.MEMBERSHIP_PLANS}/${id}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch membership plan");
  }

  return response.data!.plan;
};

// POST /api/membership-plans - Create plan
export const doCreateMembershipPlan = async (
  planData: ICreateMembershipPlanData
): Promise<{ success: boolean; data?: { plan: IMembershipPlanData }; error?: string }> => {
  const response = await postRequest<PlanByIdResponse>(
    API_ENDPOINTS.MEMBERSHIP_PLANS,
    {
      name: planData.name.trim(),
      price: planData.price,
      duration: planData.duration,
      features: planData.features?.trim() || null,
      status: planData.status ?? "active",
    }
  );
  return response;
};

// PUT /api/membership-plans/:id - Update plan
export const doUpdateMembershipPlan = async (
  planId: number | string,
  planData: IUpdateMembershipPlanData
): Promise<{ success: boolean; data?: { plan: IMembershipPlanData }; error?: string }> => {
  const id = typeof planId === "string" ? planId : String(planId);
  const response = await putRequest<PlanByIdResponse>(
    `${API_ENDPOINTS.MEMBERSHIP_PLANS}/${id}`,
    planData
  );
  return response;
};

// DELETE /api/membership-plans/:id - Delete plan
export const doDeleteMembershipPlan = async (
  planId: number | string
): Promise<{ success: boolean; error?: string }> => {
  const id = typeof planId === "string" ? planId : String(planId);
  const response = await deleteRequest<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.MEMBERSHIP_PLANS}/${id}`
  );
  return response;
};
