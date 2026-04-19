import { useCallback } from "react";
import { configureStore } from "@reduxjs/toolkit";
import membersTableReducer from "./slices/members-table-slice";
import gymsTableReducer from "./slices/gyms-table-slice";
import trainersTableReducer from "./slices/trainers-table-slice";
import membershipPlansTableReducer from "./slices/membership-plans-table-slice";
import expensesTableReducer from "./slices/expenses-table-slice";
import banksTableReducer from "./slices/banks-table-slice";
import usersTableReducer from "./slices/users-table-slice";
import expiringMembersTableReducer from "./slices/expiring-members-table-slice";
import {
  setSearchInput as setMembersSearchInput,
  setPage as setMembersPage,
  setLimit as setMembersLimit,
  setSorting as setMembersSorting,
} from "./slices/members-table-slice";
import {
  setSearchInput as setGymsSearchInput,
  setPage as setGymsPage,
  setLimit as setGymsLimit,
  setSorting as setGymsSorting,
} from "./slices/gyms-table-slice";
import {
  setSearchInput as setTrainersSearchInput,
  setPage as setTrainersPage,
  setLimit as setTrainersLimit,
  setSorting as setTrainersSorting,
} from "./slices/trainers-table-slice";
import {
  setSearchInput as setMembershipPlansSearchInput,
  setPage as setMembershipPlansPage,
  setLimit as setMembershipPlansLimit,
  setSorting as setMembershipPlansSorting,
} from "./slices/membership-plans-table-slice";
import {
  setSearchInput as setExpensesSearchInput,
  setPage as setExpensesPage,
  setLimit as setExpensesLimit,
  setStartDate as setExpensesStartDate,
  setEndDate as setExpensesEndDate,
  clearDateRange as clearExpensesDateRange,
  setSorting as setExpensesSorting,
} from "./slices/expenses-table-slice";
import {
  setSearchInput as setBanksSearchInput,
  setPage as setBanksPage,
  setLimit as setBanksLimit,
  setSorting as setBanksSorting,
} from "./slices/banks-table-slice";
import { setSorting as setUsersSorting } from "./slices/users-table-slice";
import { setSorting as setExpiringMembersSorting } from "./slices/expiring-members-table-slice";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

export const store = configureStore({
  reducer: {
    membersTable: membersTableReducer,
    gymsTable: gymsTableReducer,
    trainersTable: trainersTableReducer,
    membershipPlansTable: membershipPlansTableReducer,
    expensesTable: expensesTableReducer,
    banksTable: banksTableReducer,
    usersTable: usersTableReducer,
    expiringMembersTable: expiringMembersTableReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Bound members table actions so you can pass setPage / setLimit directly to DataTable. */
export function useMembersTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setMembersSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setMembersPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setMembersLimit(limit)), [dispatch]),
    setSorting: useCallback(
      (
        sorting: {
          id:
            | "memberId"
            | "name"
            | "email"
            | "phone"
            | "membershipType"
            | "joinDate"
            | "expiryDate"
            | "status"
            | "paymentStatus"
            | "paymentMode"
            | "bankName"
            | "paymentAmount"
            | "gymId";
          desc: boolean;
        } | null
      ) => dispatch(setMembersSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound gyms table actions */
export function useGymsTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setGymsSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setGymsPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setGymsLimit(limit)), [dispatch]),
    setSorting: useCallback(
      (sorting: { id: "gymId" | "gymName" | "address"; desc: boolean } | null) =>
        dispatch(setGymsSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound trainers table actions so you can pass setPage / setLimit directly to DataTable. */
export function useTrainersTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setTrainersSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setTrainersPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setTrainersLimit(limit)), [dispatch]),
    setSorting: useCallback(
      (
        sorting:
          | { id: "name" | "email" | "phone" | "role" | "hireDate" | "status" | "gymId"; desc: boolean }
          | null
      ) => dispatch(setTrainersSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound membership plans table actions. */
export function useMembershipPlansTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setMembershipPlansSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setMembershipPlansPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setMembershipPlansLimit(limit)), [dispatch]),
    setSorting: useCallback(
      (
        sorting:
          | { id: "name" | "price" | "duration" | "features" | "status" | "gymId"; desc: boolean }
          | null
      ) => dispatch(setMembershipPlansSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound expenses table actions. */
export function useExpensesTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setExpensesSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setExpensesPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setExpensesLimit(limit)), [dispatch]),
    setStartDate: useCallback((value: string) => dispatch(setExpensesStartDate(value)), [dispatch]),
    setEndDate: useCallback((value: string) => dispatch(setExpensesEndDate(value)), [dispatch]),
    clearDateRange: useCallback(() => dispatch(clearExpensesDateRange()), [dispatch]),
    setSorting: useCallback(
      (
        sorting:
          | { id: "category" | "description" | "vendor" | "amount" | "date" | "status" | "gymId"; desc: boolean }
          | null
      ) => dispatch(setExpensesSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound users table actions. */
export function useUsersTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSorting: useCallback(
      (
        sorting:
          | { id: "id" | "name" | "email" | "gym" | "role" | "created_at"; desc: boolean }
          | null
      ) => dispatch(setUsersSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound banks table actions. */
export function useBanksTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSearchInput: useCallback((value: string) => dispatch(setBanksSearchInput(value)), [dispatch]),
    setPage: useCallback((page: number) => dispatch(setBanksPage(page)), [dispatch]),
    setLimit: useCallback((limit: number) => dispatch(setBanksLimit(limit)), [dispatch]),
    setSorting: useCallback(
      (
        sorting:
          | {
              id:
                | "bankName"
                | "accountNumber"
                | "ifscCode"
                | "accountHolderName"
                | "branchName"
                | "accountType"
                | "upiId"
                | "gymId";
              desc: boolean;
            }
          | null
      ) => dispatch(setBanksSorting(sorting)),
      [dispatch]
    ),
  };
}

/** Bound expiring members table actions. */
export function useExpiringMembersTableActions() {
  const dispatch = useAppDispatch();
  return {
    setSorting: useCallback(
      (
        sorting:
          | {
              id:
                | "name"
                | "email"
                | "phone"
                | "membershipType"
                | "expirationDate"
                | "daysRemaining"
                | "gymId";
              desc: boolean;
            }
          | null
      ) => dispatch(setExpiringMembersSorting(sorting)),
      [dispatch]
    ),
  };
}