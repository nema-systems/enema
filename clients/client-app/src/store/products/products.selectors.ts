import { RootState } from '../store';

export const selectProducts = (state: RootState) => state.products.products;
export const selectSelectedProductId = (state: RootState) => state.products.selectedProductId;
export const selectProductsLoading = (state: RootState) => state.products.loading;
export const selectProductsError = (state: RootState) => state.products.error;

export const selectSelectedProduct = (state: RootState) => {
  const { products, selectedProductId } = state.products;
  return products.find(p => p.id === selectedProductId) || null;
};

export const selectProductsCount = (state: RootState) => state.products.products.length;