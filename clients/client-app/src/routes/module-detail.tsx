import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  ArrowLeftIcon,
  CubeIcon,
  DocumentTextIcon,
  TagIcon,
  CalendarDaysIcon,
  ShareIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";

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

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const ModuleDetail = () => {
  const { workspaceId, moduleId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  
  const [module, setModule] = useState<Module | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWorkspace(response.data.data);
    } catch (err: any) {
      console.error("Error fetching workspace:", err);
    }
  };

  const fetchModule = async () => {
    if (!workspaceId || !moduleId) return;
    
    try {
      setLoading(true);
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules/${moduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setModule(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching module:", err);
      setError(err.response?.data?.message || "Failed to fetch module");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && moduleId) {
      fetchWorkspace();
      fetchModule();
    }
  }, [workspaceId, moduleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="p-6">
        <ErrorMessage 
          title="Failed to load module"
          message={error || "Module not found"}
          onRetry={fetchModule}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}/modules`)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Modules
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <CubeIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {module.name}
              </h1>
              {module.shared ? (
                <ShareIcon className="h-5 w-5 text-green-500 ml-2" title="Shared module" />
              ) : (
                <LockClosedIcon className="h-5 w-5 text-gray-400 ml-2" title="Private module" />
              )}
            </div>
            {workspace && (
              <p className="text-gray-600 dark:text-gray-400">
                in workspace <span className="font-medium">{workspace.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Module Information Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
                Description
              </h2>
            </div>
            <div className="px-6 py-4">
              {module.description ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {module.description}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No description provided
                </p>
              )}
            </div>
          </div>

          {/* Rules */}
          {module.rules && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <TagIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Rules & Guidelines
                </h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {module.rules}
                </p>
              </div>
            </div>
          )}

          {/* Placeholder for future content */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800/50 p-6">
            <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-100 mb-2">
              Coming Soon
            </h3>
            <p className="text-indigo-700 dark:text-indigo-300 mb-4">
              More module details and functionality will be available here, including:
            </p>
            <ul className="list-disc list-inside text-indigo-600 dark:text-indigo-400 space-y-1">
              <li>Module requirements</li>
              <li>Linked parameters</li>
              <li>Test cases</li>
              <li>Version history</li>
              <li>Related assets</li>
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Module Properties */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Properties
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Module ID
                </label>
                <p className="text-gray-900 dark:text-white font-mono text-sm">
                  {module.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Sharing
                </label>
                <div className="flex items-center">
                  {module.shared ? (
                    <>
                      <ShareIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-green-700 dark:text-green-300">Shared</span>
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600 dark:text-gray-400">Private</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created
                </label>
                <div className="flex items-center text-gray-900 dark:text-white">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm">
                    {new Date(module.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Placeholder */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                Module actions will be available here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetail;