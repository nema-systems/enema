import { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { BeakerIcon, CheckCircleIcon, DocumentTextIcon } from "@heroicons/react/24/solid";

interface TestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TestCasesFormData) => Promise<void>;
  isLoading?: boolean;
  editTestCase?: TestCase | null;
  existingRequirements?: Requirement[];
}

interface TestCase {
  id: number;
  workspace_id: number;
  name: string;
  public_id: string;
  test_method: "manual" | "automated" | "hybrid";
  expected_results: string;
  execution_mode: "interactive" | "batch";
  notes: string;
  metadata?: any;
  created_at: string;
  requirements?: Requirement[];
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
  version_number: number;
  created_at: string;
}

export interface TestCasesFormData {
  name: string;
  test_method: "manual" | "automated" | "hybrid";
  expected_results: string;
  execution_mode: "interactive" | "batch";
  notes: string;
  requirement_ids: number[];
  metadata?: Record<string, any>;
}

const TestCasesModal = ({ isOpen, onClose, onSubmit, isLoading = false, editTestCase, existingRequirements = [] }: TestCasesModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<TestCasesFormData>({
    name: "",
    test_method: "manual",
    expected_results: "",
    execution_mode: "interactive",
    notes: "",
    requirement_ids: [],
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Requirement assignment state
  const [requirementSearchTerm, setRequirementSearchTerm] = useState("");
  const [showRequirementDropdown, setShowRequirementDropdown] = useState(false);
  const [selectedRequirements, setSelectedRequirements] = useState<Requirement[]>([]);

  // Initialize form data when editing
  useEffect(() => {
    if (editTestCase) {
      const initialRequirements = editTestCase.requirements || [];
      setFormData({
        name: editTestCase.name,
        test_method: editTestCase.test_method,
        expected_results: editTestCase.expected_results,
        execution_mode: editTestCase.execution_mode,
        notes: editTestCase.notes,
        requirement_ids: initialRequirements.map(req => req.id),
      });
      setSelectedRequirements(initialRequirements);
    } else {
      setFormData({
        name: "",
        test_method: "manual",
        expected_results: "",
        execution_mode: "interactive",
        notes: "",
        requirement_ids: [],
      });
      setSelectedRequirements([]);
    }
    setRequirementSearchTerm("");
    setShowRequirementDropdown(false);
  }, [editTestCase]);

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

  // Filter requirements for search
  const filteredRequirements = existingRequirements.filter(req => {
    const isAlreadySelected = selectedRequirements.some(selected => selected.id === req.id);
    if (isAlreadySelected) return false;
    
    if (requirementSearchTerm.length === 0) return true;
    
    return req.name.toLowerCase().includes(requirementSearchTerm.toLowerCase()) ||
           req.public_id.toLowerCase().includes(requirementSearchTerm.toLowerCase()) ||
           req.definition.toLowerCase().includes(requirementSearchTerm.toLowerCase());
  });

  const handleRequirementSelect = (requirement: Requirement) => {
    setSelectedRequirements(prev => [...prev, requirement]);
    setFormData(prev => ({
      ...prev,
      requirement_ids: [...prev.requirement_ids, requirement.id]
    }));
    setRequirementSearchTerm("");
    setShowRequirementDropdown(false);
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
      newErrors.name = "Test case name is required";
    }
    
    if (!formData.expected_results.trim()) {
      newErrors.expected_results = "Expected results are required";
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
      if (!editTestCase) {
        setFormData({ 
          name: "",
          test_method: "manual",
          expected_results: "",
          execution_mode: "interactive",
          notes: "",
          requirement_ids: [],
        });
        setSelectedRequirements([]);
      }
      setErrors({});
      setRequirementSearchTerm("");
      setShowRequirementDropdown(false);
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
            {editTestCase ? "Edit Test Case" : "Create New Test Case"}
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
              {/* Test Case Name */}
              <div>
                <label htmlFor="test-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Case Name *
                </label>
                <input
                  id="test-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.name ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter test case name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Test Method and Execution Mode Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Test Method */}
                <div>
                  <label htmlFor="test-method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Method
                  </label>
                  <select
                    id="test-method"
                    value={formData.test_method}
                    onChange={(e) => setFormData({ ...formData, test_method: e.target.value as TestCasesFormData['test_method'] })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                  >
                    <option value="manual">Manual</option>
                    <option value="automated">Automated</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Execution Mode */}
                <div>
                  <label htmlFor="execution-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Execution Mode
                  </label>
                  <select
                    id="execution-mode"
                    value={formData.execution_mode}
                    onChange={(e) => setFormData({ ...formData, execution_mode: e.target.value as TestCasesFormData['execution_mode'] })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                  >
                    <option value="interactive">Interactive</option>
                    <option value="batch">Batch</option>
                  </select>
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
                      placeholder="Search for requirements to associate..."
                    />
                  </div>

                  {/* Dropdown */}
                  {showRequirementDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredRequirements.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          {requirementSearchTerm 
                            ? 'No requirements match your search'
                            : existingRequirements.length === 0 
                              ? 'No requirements available'
                              : 'All requirements are already selected'
                          }
                        </div>
                      ) : (
                        filteredRequirements.map((req) => (
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
                </div>
              </div>

              {/* Expected Results */}
              <div>
                <label htmlFor="expected-results" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Results *
                </label>
                <textarea
                  id="expected-results"
                  value={formData.expected_results}
                  onChange={(e) => setFormData({ ...formData, expected_results: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.expected_results ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Describe the expected results or behavior"
                />
                {errors.expected_results && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expected_results}</p>
                )}
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
                  rows={4}
                  className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
                  placeholder="Additional notes, test steps, or instructions..."
                />
              </div>

              {/* Info about test cases */}
              <div className="bg-purple-50/70 dark:bg-purple-900/30 backdrop-blur border border-purple-200/40 dark:border-purple-800/40 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="ml-0 text-sm">
                    <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                      🧪 Test Case
                    </p>
                    <p className="text-purple-700 dark:text-purple-300 mb-2">
                      Test cases define specific scenarios to validate that requirements are met and the system functions as expected.
                    </p>
                    <ul className="mt-2 space-y-1 text-purple-600 dark:text-purple-400">
                      <li className="flex items-center">
                        <BeakerIcon className="h-4 w-4 mr-2" />
                        Validate functionality and requirements
                      </li>
                      <li className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Ensure quality and reliability
                      </li>
                      <li className="flex items-center">
                        <BeakerIcon className="h-4 w-4 mr-2" />
                        Track testing progress
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
                {editTestCase ? "Save Changes" : "Create Test Case"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TestCasesModal;