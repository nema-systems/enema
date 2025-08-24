import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ReqCollection {
  id: number;
  workspace_id: number;
  name: string;
  metadata?: any;
  created_at: string;
}

interface ReqCollectionsState {
  items: ReqCollection[];
  loading: boolean;
  error: string | null;
}

const initialState: ReqCollectionsState = {
  items: [],
  loading: false,
  error: null,
};

const reqCollectionsSlice = createSlice({
  name: 'reqCollections',
  initialState,
  reducers: {
    setReqCollections: (state, action: PayloadAction<ReqCollection[]>) => {
      state.items = action.payload;
    },
    addReqCollection: (state, action: PayloadAction<ReqCollection>) => {
      state.items.push(action.payload);
    },
    updateReqCollection: (state, action: PayloadAction<ReqCollection>) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteReqCollection: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(c => c.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setReqCollections,
  addReqCollection,
  updateReqCollection,
  deleteReqCollection,
  setLoading,
  setError,
} = reqCollectionsSlice.actions;

export default reqCollectionsSlice.reducer;