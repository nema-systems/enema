import { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, CubeIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import SearchableMultiSelect, { SelectableItem } from "../ui/searchable-multi-select";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  isLoading?: boolean;
  editProduct?: Product | null;
  workspaceId: string;
}

interface Module extends SelectableItem {
  workspace_id: number;
  req_collection_id: number;
  description: string | null;
  rules: string | null;
  shared: boolean;
  metadata: any;
  created_at: string;
}

interface Product {
  id: number;
  workspace_id: number;
  name: string;
  description: string | null;
  metadata: any;
  created_at: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  selected_module_ids?: number[]; // Shared modules to associate with product
}

const ProductModal = ({ isOpen, onClose, onSubmit, isLoading = false, editProduct, workspaceId }: ProductModalProps) => {
  const { getToken } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    selected_module_ids: [],
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize form data when editing
  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name,
        description: editProduct.description || "",
        selected_module_ids: [], // TODO: Load existing associated modules
      });
      setSelectedModules([]); // TODO: Load existing associated modules
    } else {
      setFormData({
        name: "",
        description: "",
        selected_module_ids: [],
      });
      setSelectedModules([]);
    }
  }, [editProduct]);

  // Search function for modules
  const searchModules = async (query: string): Promise<Module[]> => {
    if (!workspaceId || !query.trim()) return [];
    
    try {
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            shared: true, // Only get shared modules
            search: query,
            limit: 20 // Limit results for performance
          },
        }
      );
      
      const modules = response.data.data?.items || [];
      
      // Ensure each module has the required properties for SelectableItem
      return modules.map((module: any) => ({
        ...module,
        name: module.name || 'Unnamed Module',
        description: module.description || module.rules || null
      }));
    } catch (err) {
      console.error("Error searching modules:", err);
      return [];
    }
  };

  // Update form data when selected modules change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      selected_module_ids: selectedModules.map(module => module.id)
    }));
  }, [selectedModules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    await onSubmit(formData);
  };

  const handleClose = () => {
    if (!isLoading) {
      if (!editProduct) {
        setFormData({ name: "", description: "", selected_module_ids: [] });
        setSelectedModules([]);
      }
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center p-4">
      <div className={`relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl flex flex-col ${
        isFullscreen 
          ? 'w-full max-w-4xl h-[90vh]' 
          : 'w-full max-w-lg max-h-[90vh]'
      }`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editProduct ? "Edit Product" : "Create New Product"}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 p-1"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-5 w-5" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 p-1"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`p-6 ${isFullscreen ? 'grid grid-cols-2 gap-6' : ''}`}>
            <div className={`space-y-4 ${isFullscreen ? 'col-span-2' : ''}`}>
              {/* Product Name */}
              <div>
                <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Product Description */}
              <div>
                <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="product-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Enter product description (optional)"
                />
              </div>

              {/* Shared Module Selection - only show for new products */}
              {!editProduct && (
                <div className="bg-green-50/70 dark:bg-green-900/30 backdrop-blur border border-green-200/40 dark:border-green-800/40 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Add Existing Shared Modules (Optional)</h4>
                    <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                      Search and select existing shared modules to include in this product.
                    </p>
                    
                    <SearchableMultiSelect
                      selectedItems={selectedModules}
                      onSelectionChange={setSelectedModules}
                      searchFunction={searchModules}
                      placeholder="Search shared modules..."
                      noResultsText="No shared modules found"
                      loadingText="Searching modules..."
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Info about automatic setup */}
              <div className="bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur border border-blue-200/40 dark:border-blue-800/40 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="ml-0 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      🚀 Automatic Setup
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mb-2">
                      Creating a product will automatically set up:
                    </p>
                    <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                      <li className="flex items-center">
                        <CubeIcon className="h-4 w-4 mr-2" />
                        A base module for organizing requirements
                      </li>
                      <li className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                        A requirements collection for storing requirements
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-700/70 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/90 hover:bg-indigo-700/90 backdrop-blur border border-transparent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 disabled:opacity-50 flex items-center transition-all duration-200"
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {editProduct ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;