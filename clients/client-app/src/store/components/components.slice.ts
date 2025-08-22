import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Component {
  id: number;
  workspace_id: number;
  name: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

interface ComponentsState {
  items: Component[];
  loading: boolean;
  error: string | null;
}

const initialState: ComponentsState = {
  items: [],
  loading: false,
  error: null,
};

const componentsSlice = createSlice({
  name: 'components',
  initialState,
  reducers: {
    setComponents: (state, action: PayloadAction<Component[]>) => {
      state.items = action.payload;
    },
    addComponent: (state, action: PayloadAction<Component>) => {
      state.items.push(action.payload);
    },
    updateComponent: (state, action: PayloadAction<Component>) => {
      const index = state.items.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteComponent: (state, action: PayloadAction<number>) => {
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
  setComponents,
  addComponent,
  updateComponent,
  deleteComponent,
  setLoading,
  setError,
} = componentsSlice.actions;

export default componentsSlice.reducer;