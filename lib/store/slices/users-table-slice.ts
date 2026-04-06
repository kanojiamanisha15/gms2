import { createSlice } from "@reduxjs/toolkit";

export interface UsersTableState {
  sortBy: "id" | "name" | "email" | "gym" | "role" | "created_at";
  sortOrder: "asc" | "desc";
}

const initialState: UsersTableState = {
  sortBy: "id",
  sortOrder: "asc",
};

export const usersTableSlice = createSlice({
  name: "usersTable",
  initialState,
  reducers: {
    setSorting(
      state,
      action: {
        payload:
          | {
              id: "id" | "name" | "email" | "gym" | "role" | "created_at";
              desc: boolean;
            }
          | null;
      }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = "id";
        state.sortOrder = "asc";
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? "desc" : "asc";
    },
  },
});

export const { setSorting } = usersTableSlice.actions;
export default usersTableSlice.reducer;
