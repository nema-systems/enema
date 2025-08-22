import { RootState } from '../store';

export const selectParameters = (state: RootState) => state.parameters.items;
export const selectParametersLoading = (state: RootState) => state.parameters.loading;
export const selectParametersError = (state: RootState) => state.parameters.error;