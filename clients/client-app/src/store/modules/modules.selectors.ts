import { RootState } from '../store';

export const selectModules = (state: RootState) => state.modules.items;
export const selectModulesLoading = (state: RootState) => state.modules.loading;
export const selectModulesError = (state: RootState) => state.modules.error;