import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Module {
  id: number;
  workspace_id: number;
  req_collection_id: number;
  name: string;
  description?: string;
  rules?: string;
  shared: boolean;
  metadata?: any;
  created_at: string;
}

interface ModulesState {
  items: Module[];
  loading: boolean;
  error: string | null;
}

const initialState: ModulesState = {
  items: [],
  loading: false,
  error: null,
};

const modulesSlice = createSlice({
  name: 'modules',
  initialState,
  reducers: {
    setModules: (state, action: PayloadAction<Module[]>) => {
      state.items = action.payload;
    },
    addModule: (state, action: PayloadAction<Module>) => {
      state.items.push(action.payload);
    },
    updateModule: (state, action: PayloadAction<Module>) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteModule: (state, action: PayloadAction<number>) => {
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
  setModules,
  addModule,
  updateModule,
  deleteModule,
  setLoading,
  setError,
} = modulesSlice.actions;

export default modulesSlice.reducer;