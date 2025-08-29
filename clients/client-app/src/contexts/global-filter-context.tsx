import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface Product {
  id: number;
  workspace_id: number;
  public_id: string;
  name: string;
  description?: string;
  meta_data?: any;
  created_at: string;
}

export interface Module {
  id: number;
  workspace_id: number;
  public_id: string;
  name: string;
  description?: string;
  shared: boolean;
  meta_data?: any;
  created_at: string;
}

export interface GlobalFilter {
  workspaceId?: string;
  product?: Product;
  module?: Module;
}

interface GlobalFilterContextType {
  filter: GlobalFilter;
  setProduct: (product: Product | undefined) => void;
  setModule: (module: Module | undefined) => void;
  setWorkspace: (workspaceId: string | undefined) => void;
  clearFilter: () => void;
  hasFilter: boolean;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export const useGlobalFilter = () => {
  const context = useContext(GlobalFilterContext);
  if (!context) {
    throw new Error('useGlobalFilter must be used within a GlobalFilterProvider');
  }
  return context;
};

interface GlobalFilterProviderProps {
  children: ReactNode;
}

export const GlobalFilterProvider: React.FC<GlobalFilterProviderProps> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<GlobalFilter>({});

  // Initialize filter from URL parameters on mount
  useEffect(() => {
    const productId = searchParams.get('product_id');
    const moduleId = searchParams.get('module_id');
    const workspaceId = searchParams.get('workspace_id');
    
    // Only set if we have URL parameters
    if (productId || moduleId || workspaceId) {
      setFilter(prev => ({
        ...prev,
        workspaceId: workspaceId || prev.workspaceId,
        // We'll need to fetch product/module details from IDs later
        // For now, just store the IDs
        product: productId ? { id: parseInt(productId) } as Product : prev.product,
        module: moduleId ? { id: parseInt(moduleId) } as Module : prev.module,
      }));
    }
  }, []);

  // Update URL parameters when filter changes
  const updateUrlParams = useCallback((newFilter: GlobalFilter) => {
    const params = new URLSearchParams(searchParams);
    
    if (newFilter.product) {
      params.set('product_id', newFilter.product.id.toString());
      params.delete('module_id'); // Clear module if product is set
    } else {
      params.delete('product_id');
    }
    
    if (newFilter.module && !newFilter.product) {
      params.set('module_id', newFilter.module.id.toString());
    } else if (!newFilter.module) {
      params.delete('module_id');
    }
    
    if (newFilter.workspaceId) {
      params.set('workspace_id', newFilter.workspaceId);
    }
    
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const setProduct = useCallback((product: Product | undefined) => {
    setFilter(prev => ({ 
      ...prev, 
      product, 
      // Clear module if setting a product (they're mutually exclusive at top level)
      module: product ? undefined : prev.module 
    }));
  }, []);

  const setModule = useCallback((module: Module | undefined) => {
    setFilter(prev => ({ 
      ...prev, 
      module,
      // Clear product if setting a module (they're mutually exclusive at top level)
      product: module ? undefined : prev.product
    }));
  }, []);

  const setWorkspace = useCallback((workspaceId: string | undefined) => {
    setFilter(prev => {
      const isWorkspaceChanging = prev.workspaceId !== workspaceId;
      return {
        ...prev,
        workspaceId,
        // Clear product and module only when changing workspace
        product: isWorkspaceChanging ? undefined : prev.product,
        module: isWorkspaceChanging ? undefined : prev.module
      };
    });
  }, []);

  const clearFilter = useCallback(() => {
    setFilter(prev => ({ workspaceId: prev.workspaceId }));
  }, []);

  // Sync URL parameters whenever filter changes
  useEffect(() => {
    updateUrlParams(filter);
  }, [filter, updateUrlParams]);

  const hasFilter = useMemo(() => !!(filter.product || filter.module), [filter.product, filter.module]);

  const contextValue = useMemo(() => ({
    filter,
    setProduct,
    setModule,
    setWorkspace,
    clearFilter,
    hasFilter
  }), [filter, setProduct, setModule, setWorkspace, clearFilter, hasFilter]);

  return (
    <GlobalFilterContext.Provider value={contextValue}>
      {children}
    </GlobalFilterContext.Provider>
  );
};