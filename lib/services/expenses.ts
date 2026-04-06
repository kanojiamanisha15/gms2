import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants/api";
import type {
  ICreateExpenseData,
  IExpenseData,
  IUpdateExpenseData,
} from "@/types";

type ExpensesListResponse = {
  success: boolean;
  data?: {
    expenses: IExpenseData[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type ExpenseByIdResponse = {
  success: boolean;
  data?: { expense: IExpenseData };
  error?: string;
};

// GET /api/expenses - Get expenses with pagination, search, date range
export const doGetExpenses = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'category' | 'description' | 'vendor' | 'amount' | 'date' | 'status';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  expenses: IExpenseData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> => {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  const queryParams: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
  };
  if (params?.search?.trim()) queryParams.search = params.search.trim();
  if (params?.startDate?.trim()) queryParams.startDate = params.startDate.trim();
  if (params?.endDate?.trim()) queryParams.endDate = params.endDate.trim();
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  const response = await getRequest<ExpensesListResponse>(
    API_ENDPOINTS.EXPENSES,
    queryParams
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch expenses");
  }

  const data = response.data!;
  return {
    expenses: data.expenses ?? [],
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
  };
};

// GET /api/expenses/:id - Get expense by ID
export const doGetExpenseById = async (
  expenseId: number,
  options?: { signal?: AbortSignal }
): Promise<IExpenseData> => {
  const response = await getRequest<ExpenseByIdResponse>(
    `${API_ENDPOINTS.EXPENSES}/${expenseId}`,
    undefined,
    options
  );

  if (!response?.success) {
    throw new Error(response?.error ?? "Failed to fetch expense");
  }

  return response.data!.expense;
};

// POST /api/expenses - Create expense
export const doCreateExpense = async (
  expenseData: ICreateExpenseData
): Promise<{ success: boolean; data?: { expense: IExpenseData }; error?: string }> => {
  const response = await postRequest<ExpenseByIdResponse>(
    API_ENDPOINTS.EXPENSES,
    {
      category: expenseData.category.trim(),
      description: expenseData.description?.trim() || null,
      amount: expenseData.amount,
      date: expenseData.date,
      status: expenseData.status,
      vendor: expenseData.vendor?.trim() || null,
    }
  );
  return response;
};

// PUT /api/expenses/:id - Update expense
export const doUpdateExpense = async (
  expenseId: number,
  expenseData: IUpdateExpenseData
): Promise<{ success: boolean; data?: { expense: IExpenseData }; error?: string }> => {
  const response = await putRequest<ExpenseByIdResponse>(
    `${API_ENDPOINTS.EXPENSES}/${expenseId}`,
    expenseData
  );
  return response;
};

// DELETE /api/expenses/:id - Delete expense
export const doDeleteExpense = async (
  expenseId: number
): Promise<{ success: boolean; error?: string }> => {
  const response = await deleteRequest<{ success: boolean; error?: string }>(
    `${API_ENDPOINTS.EXPENSES}/${expenseId}`
  );
  return response;
};
