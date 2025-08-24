import { RootState } from '../store';

export const selectReqCollections = (state: RootState) => state.reqCollections.items;
export const selectReqCollectionsLoading = (state: RootState) => state.reqCollections.loading;
export const selectReqCollectionsError = (state: RootState) => state.reqCollections.error;