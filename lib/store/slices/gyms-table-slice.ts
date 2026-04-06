import { createSlice } from '@reduxjs/toolkit';

export interface GymsTableState {
  searchInput: string;
  page: number;
  limit: number;
  sortBy: 'gymId' | 'gymName' | 'address';
  sortOrder: 'asc' | 'desc';
}

const initialState: GymsTableState = {
  searchInput: '',
  page: 1,
  limit: 10,
  sortBy: 'gymId',
  sortOrder: 'asc',
};

export const gymsTableSlice = createSlice({
  name: 'gymsTable',
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
      action: { payload: { id: 'gymId' | 'gymName' | 'address'; desc: boolean } | null }
    ) {
      const next = action.payload;
      if (!next) {
        state.sortBy = 'gymId';
        state.sortOrder = 'asc';
        return;
      }
      state.sortBy = next.id;
      state.sortOrder = next.desc ? 'desc' : 'asc';
    },
  },
});

export const { setSearchInput, setPage, setLimit, setSorting } = gymsTableSlice.actions;
export default gymsTableSlice.reducer;
