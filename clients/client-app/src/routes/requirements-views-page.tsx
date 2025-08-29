import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { selectSelectedWorkspace } from "../store/workspaces/workspaces.selectors";
import RequirementsViews from "../components/requirements/requirements-views";

const RequirementsViewsPage = () => {
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const workspace = useAppSelector(selectSelectedWorkspace);
  
  // Get optional filters from URL params
  const moduleId = searchParams.get('module') ? parseInt(searchParams.get('module')!) : undefined;
  const productId = searchParams.get('product') ? parseInt(searchParams.get('product')!) : undefined;
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Workspace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please select a valid workspace to view requirements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Requirements
            </h1>
            {workspace?.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {workspace.description}
              </p>
            )}
          </div>
          <div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Requirements Views Component */}
      <RequirementsViews 
        workspaceId={workspaceId}
        moduleId={moduleId}
        productId={productId}
      />

      {/* TODO: Add RequirementCreationModal when needed */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create Requirement
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Requirement creation modal will be integrated here.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsViewsPage;