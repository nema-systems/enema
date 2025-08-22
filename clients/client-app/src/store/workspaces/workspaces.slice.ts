import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface WorkspacesState {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspacesState = {
  workspaces: [],
  selectedWorkspaceId: null,
  loading: false,
  error: null,
};

const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload;
    },
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.unshift(action.payload);
    },
    setSelectedWorkspaceId: (state, action: PayloadAction<string | null>) => {
      state.selectedWorkspaceId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearWorkspaces: (state) => {
      state.workspaces = [];
      state.selectedWorkspaceId = null;
      state.error = null;
    },
  },
});

export const {
  setWorkspaces,
  addWorkspace,
  setSelectedWorkspaceId,
  setLoading,
  setError,
  clearWorkspaces,
} = workspacesSlice.actions;

export default workspacesSlice.reducer;