import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import type {
  ICreateMemberData,
  IMemberData,
  IUpdateMemberData,
} from "@/types";

type MembersListResponse = {
  success: boolean;
  data?: {
    members: IMemberData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type MemberByIdResponse = {
  success: boolean;
  data?: { member: IMemberData };
  error?: string;
};

export type ImportMemberRow = {
  name: string;
  email?: string | null;
  phone?: string | null;
  membershipType: string;
  joinDate: string;
  expiryDate: string | null;
  status: "active" | "inactive" | "expired";
  paymentStatus: "paid" | "unpaid";
  paymentAmount: number;
  gymId?: number | null;
};

export type ImportMembersResponse = {
  success: boolean;
  data?: {
    totalRows: number;
    importedCount: number;
    failedCount: number;
    errors: Array<{ rowNumber: number; message: string }>;
  };
  error?: string;
};

// GET /api/members - Get all members with pagination
export const doGetMembers = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | 'memberId'
    | 'name'
    | 'email'
    | 'phone'
    | 'membershipType'
    | 'joinDate'
    | 'expiryDate'
    | 'status'
    | 'paymentStatus'
    | 'paymentAmount'
    | 'gymId';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  members: IMemberData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await getRequest<MembersListResponse>(
    API_ENDPOINTS.MEMBERS,
    {
      search: params?.search?.trim(),
      page: page.toString(),
      limit: limit.toString(),
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    }
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch members");
  }

  const data = response.data!;
  return {
    members: data.members ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

// GET /api/members/expiring - Get members expiring in a given month/year
export type ExpiringMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  expirationDate: string;
  daysRemaining: number;
  gymId: number | null;
};

type ExpiringMembersResponse = {
  success: boolean;
  data?: { members: ExpiringMember[] };
  error?: string;
};

export const doGetExpiringMembers = async (params: {
  month: number;
  year: number;
  sortBy?:
    | "name"
    | "email"
    | "phone"
    | "membershipType"
    | "expirationDate"
    | "daysRemaining"
    | "gymId";
  sortOrder?: "asc" | "desc";
}): Promise<ExpiringMember[]> => {
  const response = await getRequest<ExpiringMembersResponse>(
    API_ENDPOINTS.MEMBERS_EXPIRING,
    {
      month: params.month.toString(),
      year: params.year.toString(),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch expiring members");
  }

  return response.data?.members ?? [];
};

// GET /api/members/:id - Get member by ID
export const doGetMemberById = async (
  memberId: string,
  options?: { signal?: AbortSignal }
): Promise<IMemberData> => {
  const response = await getRequest<MemberByIdResponse>(
    `${API_ENDPOINTS.MEMBERS}/${memberId}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch member");
  }

  return response.data!.member;
};

// POST /api/members - Create member
export const doCreateMember = async (
  memberData: ICreateMemberData
): Promise<{ success: boolean; data?: { member: IMemberData }; error?: string }> => {
  const response = await postRequest<MemberByIdResponse>(
    API_ENDPOINTS.MEMBERS,
    {
      name: memberData.name.trim(),
      email: memberData.email.trim(),
      phone: memberData.phone?.trim() || null,
      membershipType: memberData.membershipType,
      joinDate: memberData.joinDate,
      expiryDate: memberData.expiryDate,
      status: memberData.status,
      paymentStatus: memberData.paymentStatus,
      paymentAmount: memberData.paymentAmount,
      gymId: memberData.gymId ?? null,
    }
  );
  return response;
};

// PUT /api/members/:id - Update member
export const doUpdateMember = async (
  memberId: string,
  memberData: IUpdateMemberData
): Promise<{ success: boolean; data?: { member: IMemberData }; error?: string }> => {
  const response = await putRequest<MemberByIdResponse>(
    `${API_ENDPOINTS.MEMBERS}/${memberId}`,
    memberData
  );
  return response;
};

// DELETE /api/members/:id - Delete member
export const doDeleteMember = async (
  memberId: string
): Promise<{ success: boolean; error?: string }> => {
  const response = await deleteRequest<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.MEMBERS}/${memberId}`
  );
  return response;
};

// POST /api/members/import - Bulk import members
export const doImportMembers = async (
  rows: ImportMemberRow[]
): Promise<ImportMembersResponse> => {
  const response = await postRequest<ImportMembersResponse>(
    API_ENDPOINTS.MEMBERS_IMPORT,
    { rows }
  );
  return response;
};
