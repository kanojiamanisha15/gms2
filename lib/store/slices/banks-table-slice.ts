import { createSlice } from "@reduxjs/toolkit";

export interface BanksTableState {
  searchInput: string;
  page: number;
  limit: number;
  sortBy:
    | "bankName"
    | "accountNumber"
    | "ifscCode"
    | "accountHolderName"
    | "branchName"
    | "accountType"
    | "upiId"
    | "gymId";
  sortOrder: "asc" | "desc";
}

const initialState: BanksTableState = {
  searchInput: "",
  page: 1,
  limit: 10,
  sortBy: "bankName",
  sortOrder: "asc",
};

export const banksTableSlice = createSlice({
  name: "banksTable",
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
          | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "bankName";
        state.sortOrder = "asc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSearchInput, setPage, setLimit, setSorting } = banksTableSlice.actions;
export default banksTableSlice.reducer;
