import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

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
  const [filter, setFilter] = useState<GlobalFilter>({});

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
      // Only clear product and module if workspace is actually changing
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