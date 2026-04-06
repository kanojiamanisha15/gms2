import { createSlice } from "@reduxjs/toolkit";

export interface ExpiringMembersTableState {
  sortBy:
    | "name"
    | "email"
    | "phone"
    | "membershipType"
    | "expirationDate"
    | "daysRemaining";
  sortOrder: "asc" | "desc";
}

const initialState: ExpiringMembersTableState = {
  sortBy: "expirationDate",
  sortOrder: "asc",
};

export const expiringMembersTableSlice = createSlice({
  name: "expiringMembersTable",
  initialState,
  reducers: {
    setSorting(
      state,
      action: {
        payload:
          | {
              id:
                | "name"
                | "email"
                | "phone"
                | "membershipType"
                | "expirationDate"
                | "daysRemaining";
              desc: boolean;
            }
          | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "expirationDate";
        state.sortOrder = "asc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSorting } = expiringMembersTableSlice.actions;
export default expiringMembersTableSlice.reducer;
