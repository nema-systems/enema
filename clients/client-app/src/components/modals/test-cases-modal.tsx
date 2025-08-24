import { useState, useEffect } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { BeakerIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

interface TestCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TestCasesFormData) => Promise<void>;
  isLoading?: boolean;
  editTestCase?: TestCase | null;
}

interface TestCase {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  test_type: "unit" | "integration" | "acceptance" | "performance";
  priority: "low" | "medium" | "high" | "critical";
  steps: string;
  expected_result: string;
  metadata?: any;
  created_at: string;
}

export interface TestCasesFormData {
  name: string;
  description: string;
  test_type: "unit" | "integration" | "acceptance" | "performance";
  priority: "low" | "medium" | "high" | "critical";
  steps: string;
  expected_result: string;
  metadata?: Record<string, any>;
}

const TestCasesModal = ({ isOpen, onClose, onSubmit, isLoading = false, editTestCase }: TestCasesModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<TestCasesFormData>({
    name: "",
    description: "",
    test_type: "unit",
    priority: "medium",
    steps: "",
    expected_result: "",
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize form data when editing
  useEffect(() => {
    if (editTestCase) {
      setFormData({
        name: editTestCase.name,
        description: editTestCase.description,
        test_type: editTestCase.test_type,
        priority: editTestCase.priority,
        steps: editTestCase.steps,
        expected_result: editTestCase.expected_result,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        test_type: "unit",
        priority: "medium",
        steps: "",
        expected_result: "",
      });
    }
  }, [editTestCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Test case name is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!formData.steps.trim()) {
      newErrors.steps = "Test steps are required";
    }
    
    if (!formData.expected_result.trim()) {
      newErrors.expected_result = "Expected result is required";
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
          description: "", 
          test_type: "unit",
          priority: "medium",
          steps: "",
          expected_result: "",
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

              {/* Test Case Description */}
              <div>
                <label htmlFor="test-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  id="test-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.description ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Enter test case description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              {/* Test Type and Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Test Type */}
                <div>
                  <label htmlFor="test-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Type
                  </label>
                  <select
                    id="test-type"
                    value={formData.test_type}
                    onChange={(e) => setFormData({ ...formData, test_type: e.target.value as TestCasesFormData['test_type'] })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                  >
                    <option value="unit">Unit Test</option>
                    <option value="integration">Integration Test</option>
                    <option value="acceptance">Acceptance Test</option>
                    <option value="performance">Performance Test</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="test-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    id="test-priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TestCasesFormData['priority'] })}
                    disabled={isLoading}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 transition-all duration-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Test Steps */}
              <div>
                <label htmlFor="test-steps" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Steps *
                </label>
                <textarea
                  id="test-steps"
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.steps ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                />
                {errors.steps && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.steps}</p>
                )}
              </div>

              {/* Expected Result */}
              <div>
                <label htmlFor="test-expected-result" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Result *
                </label>
                <textarea
                  id="test-expected-result"
                  value={formData.expected_result}
                  onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
                    errors.expected_result ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
                  } disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
                  placeholder="Describe the expected result or behavior"
                />
                {errors.expected_result && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expected_result}</p>
                )}
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