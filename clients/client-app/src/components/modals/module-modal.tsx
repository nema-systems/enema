import { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { CubeIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

interface ReqCollection {
  id: number;
  name: string;
  metadata?: any;
}

interface ModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModuleFormData) => Promise<void>;
  isLoading?: boolean;
  workspaceId: string;
  editModule?: Module | null;
}

interface Module {
  id: number;
  workspace_id: number;
  req_collection_id: number;
  name: string;
  description: string | null;
  rules: string | null;
  shared: boolean;
  metadata: any;
  created_at: string;
}

export interface ModuleFormData {
  name: string;
  description: string;
  rules: string;
  shared: boolean;
  req_collection_id?: number;
  create_new_req_collection: boolean;
  new_req_collection_name?: string;
}

const ModuleModal = ({ isOpen, onClose, onSubmit, isLoading = false, workspaceId, editModule }: ModuleModalProps) => {
  const { getToken } = useAuth();
  const [availableCollections, setAvailableCollections] = useState<ReqCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [formData, setFormData] = useState<ModuleFormData>({
    name: "",
    description: "",
    rules: "Default module rules - customize as needed",
    shared: true, // All manually created modules are shared
    create_new_req_collection: false,
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize form data when editing
  useEffect(() => {
    if (editModule) {
      setFormData({
        name: editModule.name,
        description: editModule.description || "",
        rules: editModule.rules || "Default module rules - customize as needed",
        shared: editModule.shared,
        create_new_req_collection: false,
        req_collection_id: editModule.req_collection_id,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        rules: "Default module rules - customize as needed",
        shared: true, // All manually created modules are shared
        create_new_req_collection: false,
      });
    }
  }, [editModule]);

  // Fetch available req collections when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableCollections();
    }
  }, [isOpen]);

  const fetchAvailableCollections = async () => {
    try {
      setLoadingCollections(true);
      const token = await getToken({ template: "default" });
      
      // Get all req collections
      const collectionsResponse = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Get all modules to find which req collections are used by base modules (shared=false)
      const modulesResponse = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const allCollections = collectionsResponse.data.data?.items || [];
      const allModules = modulesResponse.data.data?.items || [];
      
      // Filter out req collections that are used by base modules (shared=false)
      const usedByBaseModules = allModules
        .filter((module: any) => !module.shared) // Base modules have shared=false
        .map((module: any) => module.req_collection_id);
      
      const availableCollections = allCollections.filter(
        (collection: ReqCollection) => !usedByBaseModules.includes(collection.id)
      );
      
      setAvailableCollections(availableCollections);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setAvailableCollections([]);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Module name is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    // Only validate req collection for new modules, not when editing
    if (!editModule && !formData.create_new_req_collection && !formData.req_collection_id) {
      newErrors.req_collection = "Please select a requirements collection or create a new one";
    }
    
    if (formData.create_new_req_collection && !formData.new_req_collection_name?.trim()) {
      newErrors.new_req_collection_name = "New collection name is required";
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
      if (!editModule) {
        setFormData({ 
          name: "", 
          description: "", 
          rules: "Default module rules - customize as needed",
          shared: true, // Always true for manually created modules
          create_new_req_collection: false,
        });
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
            {editModule ? "Edit Module" : "Create New Module"}
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
              {/* Module Name */}
              <div>
                <label htmlFor="module-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Module Name *
                </label>
                <input
                  id="module-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter module name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Module Description */}
              <div>
                <label htmlFor="module-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  id="module-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.description ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter module description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              {/* Module Rules */}
              <div>
                <label htmlFor="module-rules" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rules
                </label>
                <textarea
                  id="module-rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  disabled={isLoading}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Enter module rules"
                />
              </div>

              {/* Info about shared modules */}
              <div className="bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur border border-blue-200/40 dark:border-blue-800/40 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="ml-0 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      📋 Shared Module
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      All manually created modules are shared and can be reused across multiple products. Base modules are only created automatically through product setup.
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirements Collection Setup - only show for new modules */}
              {!editModule && (
                <div className="bg-green-50/70 dark:bg-green-900/30 backdrop-blur border border-green-200/40 dark:border-green-800/40 rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Requirements Collection</h4>
                  
                  {/* Create New Collection Option */}
                  <div className="flex items-start mb-3">
                    <div className="flex items-center h-5">
                      <input
                        id="create-new-collection"
                        type="radio"
                        name="collection-option"
                        checked={formData.create_new_req_collection}
                        onChange={() => setFormData({ 
                          ...formData, 
                          create_new_req_collection: true, 
                          req_collection_id: undefined 
                        })}
                        disabled={isLoading}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 disabled:opacity-50"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="create-new-collection" className="font-medium text-green-900 dark:text-green-100">
                        Create new requirements collection
                      </label>
                      <p className="text-green-700 dark:text-green-300">
                        Create a fresh collection for this module's requirements
                      </p>
                    </div>
                  </div>

                  {/* New Collection Name Input */}
                  {formData.create_new_req_collection && (
                    <div className="ml-7 mb-3">
                      <input
                        type="text"
                        value={formData.new_req_collection_name || ""}
                        onChange={(e) => setFormData({ ...formData, new_req_collection_name: e.target.value })}
                        disabled={isLoading}
                        className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 dark:text-white ${
                          errors.new_req_collection_name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                        } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                        placeholder="Enter new collection name"
                      />
                      {errors.new_req_collection_name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.new_req_collection_name}</p>
                      )}
                    </div>
                  )}

                  {/* Use Existing Collection Option */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="use-existing-collection"
                        type="radio"
                        name="collection-option"
                        checked={!formData.create_new_req_collection}
                        onChange={() => setFormData({ 
                          ...formData, 
                          create_new_req_collection: false, 
                          new_req_collection_name: undefined 
                        })}
                        disabled={isLoading}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 disabled:opacity-50"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="use-existing-collection" className="font-medium text-green-900 dark:text-green-100">
                        Use existing requirements collection
                      </label>
                      <p className="text-green-700 dark:text-green-300">
                        Select from available collections (excludes product base collections)
                      </p>
                    </div>
                  </div>

                  {/* Existing Collection Dropdown */}
                  {!formData.create_new_req_collection && (
                    <div className="ml-7 mt-3">
                      {loadingCollections ? (
                        <div className="flex items-center text-sm text-gray-500">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                          Loading collections...
                        </div>
                      ) : (
                        <>
                          <select
                            value={formData.req_collection_id || ""}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              req_collection_id: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            disabled={isLoading}
                            className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 dark:text-white ${
                              errors.req_collection ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                            } disabled:opacity-50 transition-all duration-200`}
                          >
                            <option value="">Select a requirements collection...</option>
                            {availableCollections.map((collection) => (
                              <option key={collection.id} value={collection.id}>
                                {collection.name}
                              </option>
                            ))}
                          </select>
                          {availableCollections.length === 0 && (
                            <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                              No available collections. All existing collections are used by product base modules.
                            </p>
                          )}
                          {errors.req_collection && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.req_collection}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}
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
                {editModule ? "Save Changes" : "Create Module"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModuleModal;