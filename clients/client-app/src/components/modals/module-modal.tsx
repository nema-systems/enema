import React, { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { CubeIcon } from "@heroicons/react/24/solid";

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
  name: string;
  description?: string;
  rules?: string;
  shared: boolean;
  metadata?: any;
  created_at: string;
}

export interface ModuleFormData {
  name: string;
  description: string;
  rules: string;
  // shared is always true for manually created modules
}

const ModuleModal = ({ isOpen, onClose, onSubmit, isLoading = false, workspaceId, editModule }: ModuleModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [formData, setFormData] = useState<ModuleFormData>({
    name: "",
    description: "",
    rules: "Default module rules - customize as needed",
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize form data when editing
  useEffect(() => {
    if (editModule) {
      setFormData({
        name: editModule.name,
        description: editModule.description || "",
        rules: editModule.rules || "Default module rules - customize as needed",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        rules: "Default module rules - customize as needed",
      });
    }
  }, [editModule]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Module name is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    // All manually created modules are shared
    await onSubmit({ ...formData, shared: true });
  };

  const handleClose = () => {
    if (!isLoading) {
      if (!editModule) {
        setFormData({
          name: "",
          description: "",
          rules: "Default module rules - customize as needed",
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
                  Description
                </label>
                <textarea
                  id="module-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Enter module description (optional)"
                />
              </div>

              {/* Module Rules */}
              <div>
                <label htmlFor="module-rules" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rules & Guidelines
                </label>
                <textarea
                  id="module-rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Enter module rules and guidelines"
                />
              </div>

              {/* Info about shared modules */}
              <div className="bg-green-50/70 dark:bg-green-900/30 backdrop-blur border border-green-200/40 dark:border-green-800/40 rounded-lg p-4">
                <div className="flex items-center">
                  <CubeIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Shared Module</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      All manually created modules are shared and can be reused across multiple products
                    </p>
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