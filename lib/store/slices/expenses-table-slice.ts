import { createSlice } from "@reduxjs/toolkit";
import { toLocalDateString } from "@/lib/helpers";

export interface ExpensesTableState {
  searchInput: string;
  page: number;
  limit: number;
  startDate: string;
  endDate: string;
}

const getCurrentMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
  };
};

const { startDate, endDate } = getCurrentMonthDates();

const initialState: ExpensesTableState = {
  searchInput: "",
  page: 1,
  limit: 10,
  startDate,
  endDate,
};

export const expensesTableSlice = createSlice({
  name: "expensesTable",
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
    setStartDate(state, action: { payload: string }) {
      state.startDate = action.payload;
      state.page = 1;
    },
    setEndDate(state, action: { payload: string }) {
      state.endDate = action.payload;
      state.page = 1;
    },
    clearDateRange(state) {
      state.startDate = "";
      state.endDate = "";
      state.page = 1;
    },
  },
});

export const {
  setSearchInput,
  setPage,
  setLimit,
  setStartDate,
  setEndDate,
  clearDateRange,
} = expensesTableSlice.actions;
export default expensesTableSlice.reducer;
