import { useState, useEffect, useCallback } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { AdjustmentsHorizontalIcon, CheckCircleIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@clerk/clerk-react";

interface ParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParametersFormData) => Promise<void>;
  isLoading?: boolean;
  editParameter?: Parameter | null;
  workspaceId: string;
}

interface Parameter {
  id: number;
  base_param_id: number;
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  value: any;
  group_id: string;
  version_number: number;
  metadata?: any;
  created_at: string;
  requirements?: Requirement[];
}

interface Requirement {
  id: number;
  req_collection_id: number;
  public_id: string;
  name: string;
  definition: string;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  version_number: number;
  created_at: string;
}

export interface ParametersFormData {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  value: string;
  group_id: string;
  requirement_ids: number[];
  metadata?: Record<string, any>;
}

const ParametersModal = ({ isOpen, onClose, onSubmit, isLoading = false, editParameter, workspaceId }: ParametersModalProps) => {
  const { getToken } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<ParametersFormData>({
    name: "",
    type: "string",
    description: "",
    value: "",
    group_id: "",
    requirement_ids: [],
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Server-side requirement search state
  const [requirementSearchTerm, setRequirementSearchTerm] = useState("");
  const [showRequirementDropdown, setShowRequirementDropdown] = useState(false);
  const [selectedRequirements, setSelectedRequirements] = useState<Requirement[]>([]);
  const [searchResults, setSearchResults] = useState<Requirement[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Initialize form data when editing
  useEffect(() => {
    if (editParameter) {
      const initialRequirements = editParameter.requirements || [];
      setFormData({
        name: editParameter.name,
        type: editParameter.type,
        description: editParameter.description,
        value: typeof editParameter.value === 'string' ? editParameter.value : JSON.stringify(editParameter.value, null, 2),
        group_id: editParameter.group_id,
        requirement_ids: initialRequirements.map(req => req.id),
      });
      setSelectedRequirements(initialRequirements);
    } else {
      setFormData({
        name: "",
        type: "string",
        description: "",
        value: "",
        group_id: "",
        requirement_ids: [],
      });
      setSelectedRequirements([]);
    }
    setRequirementSearchTerm("");
    setShowRequirementDropdown(false);
    setSearchResults([]);
    setSearchError("");
  }, [editParameter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showRequirementDropdown && !target.closest('.requirement-dropdown-container')) {
        setShowRequirementDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRequirementDropdown]);

  // Debounced server-side search
  const searchRequirements = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    try {
      const token = await getToken({ template: "default" });
      const response = await fetch(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements?search=${encodeURIComponent(searchTerm)}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const requirements = data.data?.items || [];
        // Filter out already selected requirements
        const filteredResults = requirements.filter(
          (req: Requirement) => !selectedRequirements.some(selected => selected.id === req.id)
        );
        setSearchResults(filteredResults);
      } else {
        setSearchError("Failed to search requirements");
      }
    } catch (error) {
      console.error('Failed to search requirements:', error);
      setSearchError("Search failed");
    } finally {
      setSearchLoading(false);
    }
  }, [workspaceId, getToken, selectedRequirements]);

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRequirements(requirementSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [requirementSearchTerm, searchRequirements]);

  const handleRequirementSelect = (requirement: Requirement) => {
    setSelectedRequirements(prev => [...prev, requirement]);
    setFormData(prev => ({
      ...prev,
      requirement_ids: [...prev.requirement_ids, requirement.id]
    }));
    setRequirementSearchTerm("");
    setShowRequirementDropdown(false);
    setSearchResults([]);
  };

  const handleRequirementRemove = (requirementId: number) => {
    setSelectedRequirements(prev => prev.filter(req => req.id !== requirementId));
    setFormData(prev => ({
      ...prev,
      requirement_ids: prev.requirement_ids.filter(id => id !== requirementId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Parameter name is required";
    }

    if (!formData.value.trim()) {
      newErrors.value = "Parameter value is required";
    }

    // Validate JSON for array/object types
    if ((formData.type === 'array' || formData.type === 'object') && formData.value.trim()) {
      try {
        JSON.parse(formData.value);
      } catch {
        newErrors.value = `Invalid JSON format for ${formData.type} type`;
      }
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
      if (!editParameter) {
        setFormData({ 
          name: "",
          type: "string",
          description: "",
          value: "",
          group_id: "",
          requirement_ids: [],
        });
        setSelectedRequirements([]);
      }
      setErrors({});
      setRequirementSearchTerm("");
      setShowRequirementDropdown(false);
      setSearchResults([]);
      setSearchError("");
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
            {editParameter ? "Edit Parameter" : "Create New Parameter"}
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
              {/* Parameter Name */}
              <div>
                <label htmlFor="param-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parameter Name *
                </label>
                <input
                  id="param-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter parameter name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Type and Group ID Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Parameter Type */}
                <div>
                  <label htmlFor="param-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    id="param-type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ParametersFormData['type'] })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                </div>

                {/* Group ID */}
                <div>
                  <label htmlFor="group-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group ID
                  </label>
                  <input
                    id="group-id"
                    type="text"
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                    placeholder="Optional group identifier"
                  />
                </div>
              </div>

              {/* Requirement Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Associated Requirements
                </label>
                
                {/* Selected Requirements */}
                {selectedRequirements.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedRequirements.map((req) => (
                      <div
                        key={req.id}
                        className="inline-flex items-center px-3 py-1 bg-blue-100/70 dark:bg-blue-900/30 backdrop-blur border border-blue-200/40 dark:border-blue-800/40 rounded-lg text-sm"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-900 dark:text-blue-100 font-medium">{req.public_id}</span>
                        <span className="text-blue-700 dark:text-blue-300 ml-1">- {req.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRequirementRemove(req.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                          disabled={isLoading}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Requirement Search */}
                <div className="relative requirement-dropdown-container">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={requirementSearchTerm}
                      onChange={(e) => {
                        setRequirementSearchTerm(e.target.value);
                        setShowRequirementDropdown(true);
                      }}
                      onFocus={() => setShowRequirementDropdown(true)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                      placeholder="Search for requirements to associate... (min 2 chars)"
                    />
                  </div>

                  {/* Dropdown */}
                  {showRequirementDropdown && requirementSearchTerm.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching requirements...
                        </div>
                      ) : searchError ? (
                        <div className="px-3 py-2 text-sm text-red-500 dark:text-red-400">
                          {searchError}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No requirements match your search
                        </div>
                      ) : (
                        searchResults.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => handleRequirementSelect(req)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100/70 dark:hover:bg-gray-700/70 backdrop-blur transition-colors border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{req.public_id}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{req.name}</span>
                                </div>
                                {req.definition && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{req.definition}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {showRequirementDropdown && requirementSearchTerm.length > 0 && requirementSearchTerm.length < 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg">
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Type at least 2 characters to search
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Parameter Value */}
              <div>
                <label htmlFor="param-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value *
                  {(formData.type === 'array' || formData.type === 'object') && (
                    <span className="text-xs text-gray-500 ml-2">(JSON format)</span>
                  )}
                </label>
                <textarea
                  id="param-value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  disabled={isLoading}
                  rows={formData.type === 'array' || formData.type === 'object' ? 5 : 3}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.value ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder={
                    formData.type === 'array' ? '["item1", "item2", "item3"]' :
                    formData.type === 'object' ? '{"key": "value", "number": 123}' :
                    formData.type === 'boolean' ? 'true or false' :
                    formData.type === 'number' ? '123' :
                    'Parameter value'
                  }
                />
                {errors.value && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
                )}
              </div>

              {/* Parameter Description */}
              <div>
                <label htmlFor="param-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="param-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Describe the purpose and usage of this parameter..."
                />
              </div>

              {/* Info about parameters */}
              <div className="bg-purple-50/70 dark:bg-purple-900/30 backdrop-blur border border-purple-200/40 dark:border-purple-800/40 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="ml-0 text-sm">
                    <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                      ⚙️ Parameter
                    </p>
                    <p className="text-purple-700 dark:text-purple-300 mb-2">
                      Parameters define configurable values that can be shared across requirements and have alternative versions.
                    </p>
                    <ul className="mt-2 space-y-1 text-purple-600 dark:text-purple-400">
                      <li className="flex items-center">
                        <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                        Configure system behavior
                      </li>
                      <li className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Support multiple data types
                      </li>
                      <li className="flex items-center">
                        <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                        Group alternatives with same ID
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
                {editParameter ? "Save Changes" : "Create Parameter"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ParametersModal;