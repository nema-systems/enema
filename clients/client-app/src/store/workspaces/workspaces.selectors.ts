import { RootState } from '../store';

export const selectWorkspaces = (state: RootState) => state.workspaces.workspaces;
export const selectSelectedWorkspaceId = (state: RootState) => state.workspaces.selectedWorkspaceId;
export const selectWorkspacesLoading = (state: RootState) => state.workspaces.loading;
export const selectWorkspacesError = (state: RootState) => state.workspaces.error;

export const selectSelectedWorkspace = (state: RootState) => {
  const { workspaces, selectedWorkspaceId } = state.workspaces;
  return workspaces.find(w => w.id === selectedWorkspaceId) || null;
};