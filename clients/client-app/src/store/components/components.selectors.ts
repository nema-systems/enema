import { RootState } from '../store';

export const selectComponents = (state: RootState) => state.components.items;
export const selectComponentsLoading = (state: RootState) => state.components.loading;
export const selectComponentsError = (state: RootState) => state.components.error;