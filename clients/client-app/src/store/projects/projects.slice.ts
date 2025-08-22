import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

interface ProjectsState {
  projects: Project[];
  selectedProjectId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  selectedProjectId: null,
  loading: false,
  error: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload);
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(project => project.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    removeProject: (state, action: PayloadAction<number>) => {
      state.projects = state.projects.filter(project => project.id !== action.payload);
    },
    setSelectedProjectId: (state, action: PayloadAction<number | null>) => {
      state.selectedProjectId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProjects: (state) => {
      state.projects = [];
      state.selectedProjectId = null;
      state.error = null;
    },
  },
});

export const {
  setProjects,
  addProject,
  updateProject,
  removeProject,
  setSelectedProjectId,
  setLoading,
  setError,
  clearProjects,
} = projectsSlice.actions;

export default projectsSlice.reducer;