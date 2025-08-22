import { RootState } from '../store';

export const selectRequirements = (state: RootState) => state.requirements.requirements;
export const selectRequirementsLoading = (state: RootState) => state.requirements.loading;
export const selectRequirementsError = (state: RootState) => state.requirements.error;

export const selectRequirementsByStatus = (status: string) => (state: RootState) =>
  state.requirements.requirements.filter(req => req.status.toLowerCase() === status.toLowerCase());

export const selectRequirementsByPriority = (priority: string) => (state: RootState) =>
  state.requirements.requirements.filter(req => req.priority.toLowerCase() === priority.toLowerCase());