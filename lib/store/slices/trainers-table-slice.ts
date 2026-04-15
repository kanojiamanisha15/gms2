import { createSlice } from "@reduxjs/toolkit";

export interface TrainersTableState {
  searchInput: string;
  page: number;
  limit: number;
  sortBy: "name" | "email" | "phone" | "role" | "hireDate" | "status" | "gymId";
  sortOrder: "asc" | "desc";
}

const initialState: TrainersTableState = {
  searchInput: "",
  page: 1,
  limit: 10,
  sortBy: "hireDate",
  sortOrder: "desc",
};

export const trainersTableSlice = createSlice({
  name: "trainersTable",
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
          | { id: "name" | "email" | "phone" | "role" | "hireDate" | "status" | "gymId"; desc: boolean }
          | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "hireDate";
        state.sortOrder = "desc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSearchInput, setPage, setLimit, setSorting } = trainersTableSlice.actions;
export default trainersTableSlice.reducer;
