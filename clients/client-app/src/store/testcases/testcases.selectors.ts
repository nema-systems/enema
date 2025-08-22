import { RootState } from '../store';

export const selectTestCases = (state: RootState) => state.testcases.items;
export const selectTestCasesLoading = (state: RootState) => state.testcases.loading;
export const selectTestCasesError = (state: RootState) => state.testcases.error;
export const selectCurrentTestCase = (state: RootState) => state.testcases.currentTestCase;