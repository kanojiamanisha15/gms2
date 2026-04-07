import { createSlice } from "@reduxjs/toolkit";

export interface MembersTableState {
  searchInput: string;
  page: number;
  limit: number;
  sortBy:
    | "memberId"
    | "name"
    | "email"
    | "phone"
    | "membershipType"
    | "joinDate"
    | "expiryDate"
    | "status"
    | "paymentStatus"
    | "paymentAmount"
    | "gymId";
  sortOrder: "asc" | "desc";
}

const initialState: MembersTableState = {
  searchInput: "",
  page: 1,
  limit: 10,
  sortBy: "joinDate",
  sortOrder: "desc",
};

export const membersTableSlice = createSlice({
  name: "membersTable",
  initialState,
  reducers: {
    setSearchInput(state, action: { payload: string }) {
      state.searchInput = action.payload;
      state.page = 1;
    },
    setPage(state, action: { payload: number }) {
      state.page = action.payload;
    },
    setLimit(state, action: { payload: number }) {
      state.limit = action.payload;
      state.page = 1;
    },
    setSorting(
      state,
      action: {
        payload: {
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
            | "paymentAmount"
            | "gymId";
          desc: boolean;
        } | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "joinDate";
        state.sortOrder = "desc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSearchInput, setPage, setLimit, setSorting } = membersTableSlice.actions;
export default membersTableSlice.reducer;
