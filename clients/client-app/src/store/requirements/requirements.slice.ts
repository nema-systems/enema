import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Requirement {
  id: number;
  base_req_id?: number;
  parent_req_id?: number;
  prev_version?: number;
  module_id: number;
  author_id: number;
  owner_id?: number;
  public_id: string;
  name: string;
  definition: string;
  version_number: number;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  meta_data?: any;
  created_at: string;
  // Relationships
  module?: {
    id: number;
    name: string;
    public_id: string;
  };
  author?: {
    id: number;
    name: string;
    email: string;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  parent_req?: Requirement;
  children?: Requirement[];
}

interface RequirementsState {
  requirements: Requirement[];
  loading: boolean;
  error: string | null;
}

const initialState: RequirementsState = {
  requirements: [],
  loading: false,
  error: null,
};

const requirementsSlice = createSlice({
  name: 'requirements',
  initialState,
  reducers: {
    setRequirements: (state, action: PayloadAction<Requirement[]>) => {
      state.requirements = action.payload;
    },
    addRequirement: (state, action: PayloadAction<Requirement>) => {
      state.requirements.unshift(action.payload);
    },
    updateRequirement: (state, action: PayloadAction<Requirement>) => {
      const index = state.requirements.findIndex(req => req.id === action.payload.id);
      if (index !== -1) {
        state.requirements[index] = action.payload;
      }
    },
    removeRequirement: (state, action: PayloadAction<number>) => {
      state.requirements = state.requirements.filter(req => req.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearRequirements: (state) => {
      state.requirements = [];
      state.error = null;
    },
  },
});

export const {
  setRequirements,
  addRequirement,
  updateRequirement,
  removeRequirement,
  setLoading,
  setError,
  clearRequirements,
} = requirementsSlice.actions;

export default requirementsSlice.reducer;