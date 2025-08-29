import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: number;
  public_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

interface ProductsState {
  products: Product[];
  selectedProductId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  selectedProductId: null,
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.unshift(action.payload);
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(product => product.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    removeProduct: (state, action: PayloadAction<number>) => {
      state.products = state.products.filter(product => product.id !== action.payload);
    },
    setSelectedProductId: (state, action: PayloadAction<number | null>) => {
      state.selectedProductId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProducts: (state) => {
      state.products = [];
      state.selectedProductId = null;
      state.error = null;
    },
  },
});

export const {
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setSelectedProductId,
  setLoading,
  setError,
  clearProducts,
} = productsSlice.actions;

export default productsSlice.reducer;