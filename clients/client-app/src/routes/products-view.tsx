import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setProducts, setLoading, setError, removeProduct, addProduct, clearProducts } from "../store/products/products.slice";
import { selectProducts, selectProductsLoading, selectProductsError } from "../store/products/products.selectors";
import { selectSelectedWorkspace } from "../store/workspaces/workspaces.selectors";
import EnhancedProductCard from "../components/cards/enhanced-product-card";
import ProductModal, { ProductFormData } from "../components/modals/product-modal";
import DeleteConfirmationModal from "../components/modals/delete-confirmation-modal";
import DeleteReqCollectionModal from "../components/modals/delete-req-collection-modal";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";
import SuccessToast from "../components/ui/success-toast";
import ProductModulesModal from "../components/modals/product-modules-modal";
import { useGlobalFilter } from "../contexts/global-filter-context";
import axios from "axios";
import { apiUrl } from "../utils/api";

interface ModuleInfo {
  id: number;
  name: string;
  description?: string;
  shared: boolean;
  requirement_count?: number;
}


interface Product {
  id: number;
  workspace_id: number;
  public_id: string;
  name: string;
  description?: string;
  metadata?: any;
  created_at: string;
  default_module?: ModuleInfo;
  modules?: ModuleInfo[];
  total_module_requirements?: number;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const ProductsView = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();
  const { setProduct, setWorkspace } = useGlobalFilter();
  
  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);
  const workspace = useAppSelector(selectSelectedWorkspace);
  
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastCreatedProduct, setLastCreatedProduct] = useState<Product | null>(null);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Modules modal state
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [productForModules, setProductForModules] = useState<Product | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWorkspaceDetails(response.data.data);
    } catch (err) {
      console.error("Error fetching workspace:", err);
    }
  };

  const fetchProducts = async () => {
    if (!workspaceId) return;
    
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/products`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(setProducts(response.data.data?.items || response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching products:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch products"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSubmitProduct = async (formData: ProductFormData) => {
    if (!workspaceId) return;

    setIsCreating(true);
    
    try {
      const token = await getToken({ template: "default" });
      
      if (editProduct) {
        // Update existing product
        const response = await axios.put(
          apiUrl(`/api/v1/workspaces/${workspaceId}/products/${editProduct.id}`),
          {
            name: formData.name,
            description: formData.description,
            selected_module_ids: formData.selected_module_ids,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        
        // Refresh products list to get updated data
        await fetchProducts();
      } else {
        // Create new product
        const response = await axios.post(
          apiUrl(`/api/v1/workspaces/${workspaceId}/products`),
          {
            name: formData.name,
            description: formData.description,
            create_default_module: true, // Always create default module
            // Note: selected_module_ids removed in simplified architecture
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        
        const createdProduct = response.data.data;
        dispatch(addProduct(createdProduct));
        
        // Store for success toast
        setLastCreatedProduct(createdProduct);
        
        // Refresh the products list to ensure we have complete module information
        await fetchProducts();
      }
      
      // Close modal and show success
      setIsModalOpen(false);
      setEditProduct(null);
      if (!editProduct) {
        setShowSuccessToast(true);
      }
      
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert(err.response?.data?.message || `Failed to ${editProduct ? 'update' : 'create'} product`);
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setIsModalOpen(true);
  };

  const handleShowModules = (product: Product) => {
    setProductForModules(product);
    setIsModulesModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
    setDeletionPreview(null);
    
    // Fetch deletion preview
    setIsLoadingPreview(true);
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/products/${product.id}/deletion-preview`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDeletionPreview(response.data.data);
    } catch (err: any) {
      console.error("Error fetching deletion preview:", err);
      // Continue without preview - deletion will still work
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete || !workspaceId) return;

    setIsDeleting(true);
    
    try {
      const token = await getToken({ template: "default" });
      
      await axios.delete(
        apiUrl(`/api/v1/workspaces/${workspaceId}/products/${productToDelete.id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Remove from store
      dispatch(removeProduct(productToDelete.id));
      
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      
    } catch (err: any) {
      console.error("Error deleting product:", err);
      throw new Error(err.response?.data?.detail || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      setWorkspace(workspaceId);
      fetchWorkspace();
      fetchProducts();
    }
    
    return () => {
      dispatch(clearProducts());
    };
  }, [workspaceId, dispatch, setWorkspace]);


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            {(workspace || workspaceDetails)?.description && (
              <p className="text-gray-600 mt-1">{(workspace || workspaceDetails)!.description}</p>
            )}
          </div>
          <div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Product
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Products ({products.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="py-6">
              <ErrorMessage 
                title="Failed to load products"
                message={error}
                onRetry={fetchProducts}
              />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="mx-auto h-12 w-12 text-gray-400"
              >
                <path
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No products</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first product.
              </p>
              <div className="mt-6">
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  New Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <EnhancedProductCard
                  key={product.id}
                  product={product}
                  workspaceId={workspaceId!}
                  onClick={() => {
                    // Set the product as the global filter
                    setProduct(product);
                    // Navigate to requirements view to see filtered results
                    navigate(`/workspace/${workspaceId}/requirements`);
                  }}
                  onDelete={handleDeleteProduct}
                  onShowModules={handleShowModules}
                  onEdit={handleEditProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Creation Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditProduct(null);
        }}
        onSubmit={handleSubmitProduct}
        isLoading={isCreating}
        editProduct={editProduct}
        workspaceId={workspaceId!}
      />

      {/* Success Toast - only show for new products, not edits */}
      {!editProduct && (
        <SuccessToast
          isVisible={showSuccessToast}
          onClose={() => setShowSuccessToast(false)}
          title="Product Created Successfully!"
          message={lastCreatedProduct?.default_module 
            ? "Your product has been created with a default module." 
            : "Your product has been created."}
          createdResources={[
            ...(lastCreatedProduct?.default_module ? [{
              type: 'module' as const,
              id: lastCreatedProduct.default_module.id,
              name: lastCreatedProduct.default_module.name
            }] : [])
          ]}
          onViewRequirements={() => navigate(`/workspace/${workspaceId}/requirements?product=${lastCreatedProduct?.id}`)}
          onViewModules={() => navigate(`/workspace/${workspaceId}/modules?product=${lastCreatedProduct?.id}`)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
          setDeletionPreview(null);
          setIsLoadingPreview(false);
        }}
        onConfirm={confirmDeleteProduct}
        itemName={productToDelete?.name || ""}
        itemType="Product"
        isLoading={isDeleting}
        warningMessage="This will permanently delete the product and any modules that were automatically created with it (shared resources will be preserved)."
        deletionPreview={deletionPreview}
        isLoadingPreview={isLoadingPreview}
      />

      {/* Product Modules Modal */}
      {productForModules && (
        <ProductModulesModal
          isOpen={isModulesModalOpen}
          onClose={() => {
            setIsModulesModalOpen(false);
            setProductForModules(null);
          }}
          product={productForModules}
          workspaceId={workspaceId!}
        />
      )}
    </div>
  );
};

export default ProductsView;