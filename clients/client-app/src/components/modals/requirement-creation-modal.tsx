import React, { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { apiUrl } from "../../utils/api";
import SearchableSingleSelect from "../ui/searchable-single-select";

interface Module {
  id: number;
  name: string;
  workspace_id: number;
  description: string;
  metadata?: any;
  created_at: string;
}

interface Requirement {
  id: number;
  module_id: number;
  public_id: string;
  name: string;
  definition: string;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  version_number: number;
  created_at: string;
  parent_req_id?: number;
  description?: string; // Add this for compatibility with SearchableSingleSelect
}

interface RequirementCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequirementFormData) => Promise<void>;
  isLoading?: boolean;
  modules: Module[];
  selectedModuleId?: number;
  workspaceId: string;
  editRequirement?: Requirement | null;
}

export interface RequirementFormData {
  module_id: number;
  name: string;
  definition: string;
  level: string;
  priority: string;
  functional: string;
  validation_method: string;
  status: string;
  rationale?: string;
  notes?: string;
  parent_req_id?: number;
  create_new_req_collection?: boolean;
  new_req_collection_name?: string;
  metadata?: any;
}

const REQUIREMENT_OPTIONS = {
  level: [
    { value: 'L0', label: 'L0 - Mission/System' },
    { value: 'L1', label: 'L1 - System' },
    { value: 'L2', label: 'L2 - Segment' },
    { value: 'L3', label: 'L3 - Element' },
    { value: 'L4', label: 'L4 - Subsystem' },
    { value: 'L5', label: 'L5 - Component' }
  ],
  priority: [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ],
  functional: [
    { value: 'functional', label: 'Functional' },
    { value: 'non_functional', label: 'Non-Functional' }
  ],
  validation_method: [
    { value: 'test', label: 'Test' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'demonstration', label: 'Demonstration' }
  ],
  status: [
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'obsolete', label: 'Obsolete' }
  ]
};

const RequirementCreationModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading = false,
  modules,
  selectedModuleId,
  workspaceId,
  editRequirement = null
}: RequirementCreationModalProps) => {
  const { getToken } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<RequirementFormData>({
    module_id: selectedModuleId || 0,
    name: "",
    definition: "",
    level: "L0",
    priority: "medium",
    functional: "functional",
    validation_method: "test",
    status: "draft",
    rationale: "",
    notes: "",
    parent_req_id: undefined,
  });

  const [selectedParentReq, setSelectedParentReq] = useState<Requirement | null>(null);

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Search function for parent requirements
  const searchParentRequirements = async (query: string): Promise<Requirement[]> => {
    if (!workspaceId || !formData.module_id || formData.module_id === 0) {
      return [];
    }

    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}/requirements/`),
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            module_id: formData.module_id,
            search: query,
            limit: 10,
            page: 1
          }
        }
      );
      
      const requirements = response.data.data?.items || response.data.data || [];
      // Exclude the current requirement if editing and map to include description
      return requirements
        .filter((req: Requirement) => 
          editRequirement ? req.id !== editRequirement.id : true
        )
        .map((req: any) => ({
          ...req,
          description: req.definition // Use definition as description for the search component
        }));
    } catch (error: any) {
      console.error("Error searching requirements:", error);
      return [];
    }
  };

  // Initialize form data when editing
  useEffect(() => {
    if (editRequirement) {
      setFormData({
        module_id: editRequirement.module_id,
        name: editRequirement.name,
        definition: editRequirement.definition,
        level: editRequirement.level,
        priority: editRequirement.priority,
        functional: editRequirement.functional,
        validation_method: editRequirement.validation_method,
        status: editRequirement.status,
        rationale: editRequirement.rationale || "",
        notes: editRequirement.notes || "",
        parent_req_id: editRequirement.parent_req_id,
      });
      // If editing and has parent, we should load the parent requirement data
      // For now, we'll set it to null and let the user re-select if needed
      setSelectedParentReq(null);
    } else {
      setFormData({
        module_id: selectedModuleId || 0,
        name: "",
        definition: "",
        level: "L0",
        priority: "medium",
        functional: "functional",
        validation_method: "test",
        status: "draft",
        rationale: "",
        notes: "",
        parent_req_id: undefined,
      });
      setSelectedParentReq(null);
    }
    setErrors({});
  }, [editRequirement, selectedModuleId]);

  // Update module_id when selectedModuleId changes
  useEffect(() => {
    if (selectedModuleId) {
      setFormData(prev => ({ ...prev, module_id: selectedModuleId }));
    }
  }, [selectedModuleId]);

  // Reset parent requirement when collection changes
  useEffect(() => {
    if (selectedParentReq && selectedParentReq.module_id !== formData.module_id) {
      setSelectedParentReq(null);
      setFormData(prev => ({ ...prev, parent_req_id: undefined }));
    }
  }, [formData.module_id, selectedParentReq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Requirement name is required";
    }
    
    if (!formData.definition.trim()) {
      newErrors.definition = "Requirement definition is required";
    }
    
    if (!formData.module_id || formData.module_id === 0) {
      newErrors.module_id = "Please select a requirement collection";
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
      setFormData({
        module_id: selectedModuleId || 0,
        name: "",
        definition: "",
        level: "L0",
        priority: "medium",
        functional: "functional",
        validation_method: "test",
        status: "draft",
        rationale: "",
        notes: "",
        parent_req_id: undefined,
      });
      setErrors({});
      setSelectedParentReq(null);
      setIsFullscreen(false);
      onClose();
    }
  };

  const selectedModule = modules.find(rc => rc.id === formData.module_id);

  // Handle parent requirement selection
  const handleParentRequirementChange = (parentReq: Requirement | null) => {
    setSelectedParentReq(parentReq);
    setFormData(prev => ({
      ...prev,
      parent_req_id: parentReq?.id || undefined
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center p-4">
      <div className={`relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl flex flex-col ${
        isFullscreen 
          ? 'w-full max-w-4xl h-[90vh]' 
          : 'w-full max-w-2xl max-h-[90vh]'
      }`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editRequirement ? "Edit Requirement" : "Create New Requirement"}
            </h3>
          </div>
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
            <div className={`space-y-6 ${isFullscreen ? 'col-span-2' : ''}`}>
              {/* Requirement Name */}
              <div>
                <label htmlFor="req-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirement Name *
                </label>
                <input
                  id="req-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter requirement name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Requirement Collection Selection */}
              <div>
                <label htmlFor="req-collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirement Collection *
                </label>
                <select
                  id="req-collection"
                  value={formData.module_id}
                  onChange={(e) => setFormData({ ...formData, module_id: parseInt(e.target.value) })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.module_id ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 transition-all duration-200`}
                >
                  <option value={0}>Select a requirement collection</option>
                  {modules.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
                {errors.module_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.module_id}</p>
                )}
                {selectedModule && (
                  <div className="mt-2 p-2 bg-indigo-50/70 dark:bg-indigo-900/30 backdrop-blur border border-indigo-200/40 dark:border-indigo-800/40 rounded-lg">
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      Selected: <span className="font-medium">{selectedModule.name}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Parent Requirement Search */}
              {formData.module_id > 0 && (
                <div>
                  <label htmlFor="parent-req" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parent Requirement (Optional)
                  </label>
                  
                  <SearchableSingleSelect<Requirement>
                    selectedItem={selectedParentReq}
                    onSelectionChange={handleParentRequirementChange}
                    searchFunction={searchParentRequirements}
                    placeholder="Search for parent requirement..."
                    noResultsText="No matching requirements found"
                    loadingText="Searching requirements..."
                    disabled={isLoading}
                    className="w-full"
                  />
                  
                  {selectedParentReq && (
                    <div className="mt-2 p-3 bg-green-50/70 dark:bg-green-900/30 backdrop-blur border border-green-200/40 dark:border-green-800/40 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                            Parent: {selectedParentReq.name}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                            {selectedParentReq.public_id} - {selectedParentReq.definition.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Requirement Definition */}
              <div>
                <label htmlFor="req-definition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Definition *
                </label>
                <textarea
                  id="req-definition"
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.definition ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter detailed requirement definition"
                />
                {errors.definition && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.definition}</p>
                )}
              </div>

              {/* Requirement Parameters Grid */}
              <div className="bg-gray-50/70 dark:bg-gray-800/30 backdrop-blur border border-gray-200/40 dark:border-gray-700/40 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Requirement Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Level */}
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Level
                    </label>
                    <select
                      id="level"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                    >
                      {REQUIREMENT_OPTIONS.level.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                    >
                      {REQUIREMENT_OPTIONS.priority.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Functional Type */}
                  <div>
                    <label htmlFor="functional" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      id="functional"
                      value={formData.functional}
                      onChange={(e) => setFormData({ ...formData, functional: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                    >
                      {REQUIREMENT_OPTIONS.functional.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Validation Method */}
                  <div>
                    <label htmlFor="validation-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Validation Method
                    </label>
                    <select
                      id="validation-method"
                      value={formData.validation_method}
                      onChange={(e) => setFormData({ ...formData, validation_method: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                    >
                      {REQUIREMENT_OPTIONS.validation_method.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      disabled={isLoading}
                      className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                    >
                      {REQUIREMENT_OPTIONS.status.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="space-y-4">
                {/* Rationale */}
                <div>
                  <label htmlFor="rationale" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rationale
                  </label>
                  <textarea
                    id="rationale"
                    value={formData.rationale}
                    onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                    disabled={isLoading}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                    placeholder="Explain the reasoning behind this requirement (optional)"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={isLoading}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                    placeholder="Additional notes or comments (optional)"
                  />
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
                {editRequirement ? "Save Changes" : "Create Requirement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequirementCreationModal;