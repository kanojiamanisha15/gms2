import { createSlice } from "@reduxjs/toolkit";

export interface MembershipPlansTableState {
  searchInput: string;
  page: number;
  limit: number;
  sortBy: "name" | "price" | "duration" | "features" | "status" | "gymId";
  sortOrder: "asc" | "desc";
}

const initialState: MembershipPlansTableState = {
  searchInput: "",
  page: 1,
  limit: 10,
  sortBy: "name",
  sortOrder: "asc",
};

export const membershipPlansTableSlice = createSlice({
  name: "membershipPlansTable",
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
        payload:
          | { id: "name" | "price" | "duration" | "features" | "status" | "gymId"; desc: boolean }
          | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "name";
        state.sortOrder = "asc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSearchInput, setPage, setLimit, setSorting } = membershipPlansTableSlice.actions;
export default membershipPlansTableSlice.reducer;
