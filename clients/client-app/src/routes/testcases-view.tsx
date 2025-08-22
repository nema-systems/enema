import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  fetchTestCases, 
  createTestCase, 
  deleteTestCase,
  clearError 
} from "../store/testcases/testcases.slice";
import { 
  selectTestCases, 
  selectTestCasesLoading, 
  selectTestCasesError 
} from "../store/testcases/testcases.selectors";
import LoadingSpinner from "../components/ui/loading-spinner";
import Modal from "../components/ui/modal";

const TestCasesView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();

  const testcases = useAppSelector(selectTestCases);
  const loading = useAppSelector(selectTestCasesLoading);
  const error = useAppSelector(selectTestCasesError);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTestCase, setNewTestCase] = useState({
    name: "",
    test_method: "manual",
    expected_results: "",
    execution_mode: "interactive",
    notes: "",
    metadata: {}
  });

  useEffect(() => {
    const fetchData = async () => {
      if (workspaceId) {
        const token = await getToken({ template: "default" });
        dispatch(fetchTestCases({ 
          workspaceId: parseInt(workspaceId),
          token: token!,
          search: searchQuery || undefined,
          sort: sortBy,
          order: sortOrder
        }));
      }
    };
    fetchData();
  }, [dispatch, workspaceId, searchQuery, sortBy, sortOrder, getToken]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId) {
      const token = await getToken({ template: "default" });
      dispatch(fetchTestCases({ 
        workspaceId: parseInt(workspaceId),
        token: token!,
        search: searchQuery || undefined,
        sort: sortBy,
        order: sortOrder
      }));
    }
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId) {
      try {
        await dispatch(createTestCase({
          workspaceId: parseInt(workspaceId),
          testcase: newTestCase
        })).unwrap();
        
        setIsCreateModalOpen(false);
        setNewTestCase({
          name: "",
          test_method: "manual",
          expected_results: "",
          execution_mode: "interactive",
          notes: "",
          metadata: {}
        });
      } catch (error) {
        console.error("Failed to create test case:", error);
      }
    }
  };

  const handleDeleteTestCase = async (testcaseId: number) => {
    if (workspaceId && confirm("Are you sure you want to delete this test case?")) {
      try {
        await dispatch(deleteTestCase({
          workspaceId: parseInt(workspaceId),
          testcaseId
        })).unwrap();
      } catch (error) {
        console.error("Failed to delete test case:", error);
      }
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'manual': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
      case 'automated': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'interactive': return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800';
      case 'batch': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const filteredTestCases = testcases.filter(testcase => {
    return (
      (!selectedMethod || testcase.test_method === selectedMethod) &&
      (!selectedMode || testcase.execution_mode === selectedMode)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Test Cases</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and execute test cases for this workspace
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Test Case
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="manual">Manual</option>
                <option value="automated">Automated</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Modes</option>
                <option value="interactive">Interactive</option>
                <option value="batch">Batch</option>
              </select>
            </div>
            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTestCases.map((testcase) => (
            <div
              key={testcase.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
              onClick={() => navigate(`/workspace/${workspaceId}/testcases/${testcase.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {testcase.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTestCase(testcase.id);
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete test case"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMethodColor(testcase.test_method)}`}>
                    {testcase.test_method}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getModeColor(testcase.execution_mode)}`}>
                    {testcase.execution_mode}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {testcase.expected_results}
                </p>

                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>ID: {testcase.public_id}</span>
                  <span>{new Date(testcase.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredTestCases.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No test cases found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || selectedMethod || selectedMode
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first test case."
            }
          </p>
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Test Case"
      >
        <form onSubmit={handleCreateTestCase} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={newTestCase.name}
              onChange={(e) => setNewTestCase({ ...newTestCase, name: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter test case name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Method *
              </label>
              <select
                required
                value={newTestCase.test_method}
                onChange={(e) => setNewTestCase({ ...newTestCase, test_method: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="automated">Automated</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Execution Mode *
              </label>
              <select
                required
                value={newTestCase.execution_mode}
                onChange={(e) => setNewTestCase({ ...newTestCase, execution_mode: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="interactive">Interactive</option>
                <option value="batch">Batch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expected Results *
            </label>
            <textarea
              required
              value={newTestCase.expected_results}
              onChange={(e) => setNewTestCase({ ...newTestCase, expected_results: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the expected results"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={newTestCase.notes}
              onChange={(e) => setNewTestCase({ ...newTestCase, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#001447] via-[#0a2060] to-[#182a7e] hover:from-[#0a225f] hover:via-[#162f7e] hover:to-[#243391] text-white rounded-lg font-medium transition-all duration-300"
            >
              Create Test Case
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TestCasesView;