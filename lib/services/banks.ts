import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import type {
  ICreateBankData,
  IBankData,
  IUpdateBankData,
} from "@/types";

type BanksListResponse = {
  success: boolean;
  data?: {
    banks: IBankData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type BankByIdResponse = {
  success: boolean;
  data?: { bank: IBankData };
  error?: string;
};

export const doGetBanks = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  /** Super-admin / explicit gym filter (passed as query param to API) */
  gymId?: number | null;
  sortBy?:
    | "bankName"
    | "accountNumber"
    | "ifscCode"
    | "accountHolderName"
    | "branchName"
    | "accountType"
    | "upiId"
    | "gymId";
  sortOrder?: "asc" | "desc";
}): Promise<{
  banks: IBankData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const response = await getRequest<BanksListResponse>(
    API_ENDPOINTS.BANKS,
    {
      search: params?.search?.trim(),
      page: page.toString(),
      limit: limit.toString(),
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
      ...(params?.gymId != null ? { gymId: String(params.gymId) } : {}),
    }
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch banks");
  }

  const data = response.data!;
  return {
    banks: data.banks ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

export const doGetBankById = async (
  bankId: number | string,
  options?: { signal?: AbortSignal }
): Promise<IBankData> => {
  const id = typeof bankId === "string" ? bankId : String(bankId);
  const response = await getRequest<BankByIdResponse>(
    `${API_ENDPOINTS.BANKS}/${id}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch bank");
  }

  return response.data!.bank;
};

export const doCreateBank = async (
  bankData: ICreateBankData
): Promise<{ success: boolean; data?: { bank: IBankData }; error?: string }> => {
  const response = await postRequest<BankByIdResponse>(
    API_ENDPOINTS.BANKS,
    {
      bankName: bankData.bankName.trim(),
      accountNumber: bankData.accountNumber?.trim() || null,
      ifscCode: bankData.ifscCode?.trim() || null,
      accountHolderName: bankData.accountHolderName.trim(),
      branchName: bankData.branchName.trim(),
      accountType: bankData.accountType,
      upiId: bankData.upiId?.trim() || null,
      gymId: bankData.gymId ?? null,
    }
  );
  return response;
};

export const doUpdateBank = async (
  bankId: number | string,
  bankData: IUpdateBankData
): Promise<{ success: boolean; data?: { bank: IBankData }; error?: string }> => {
  const id = typeof bankId === "string" ? bankId : String(bankId);
  return putRequest<BankByIdResponse>(`${API_ENDPOINTS.BANKS}/${id}`, bankData);
};

export const doDeleteBank = async (
  bankId: number | string
): Promise<{ success: boolean; error?: string }> => {
  const id = typeof bankId === "string" ? bankId : String(bankId);
  return deleteRequest<{ success: boolean; error?: string }>(`${API_ENDPOINTS.BANKS}/${id}`);
};
