import { RootState } from '../store';

export const selectProjects = (state: RootState) => state.projects.projects;
export const selectSelectedProjectId = (state: RootState) => state.projects.selectedProjectId;
export const selectProjectsLoading = (state: RootState) => state.projects.loading;
export const selectProjectsError = (state: RootState) => state.projects.error;

export const selectSelectedProject = (state: RootState) => {
  const { projects, selectedProjectId } = state.projects;
  return projects.find(p => p.id === selectedProjectId) || null;
};

export const selectProjectsCount = (state: RootState) => state.projects.projects.length;