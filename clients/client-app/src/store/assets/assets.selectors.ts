import { RootState } from '../store';

export const selectAssets = (state: RootState) => state.assets.items;
export const selectAssetsLoading = (state: RootState) => state.assets.loading;
export const selectAssetsError = (state: RootState) => state.assets.error;
export const selectAssetsUploading = (state: RootState) => state.assets.uploading;