import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { apiUrl } from "../utils/api";
import { 
  ArrowLeftIcon,
  CubeIcon,
  CalendarDaysIcon,
  ShareIcon,
  LockClosedIcon
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";
import RequirementsViews from "../components/requirements/requirements-views";
import { useGlobalFilter } from "../contexts/global-filter-context";

interface Module {
  id: number;
  workspace_id: number;
  public_id: string;
  name: string;
  description?: string;
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
  const { setModule: setGlobalModule, setWorkspace: setGlobalWorkspace } = useGlobalFilter();
  
  const [module, setModule] = useState<Module | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        apiUrl(`/api/v1/workspaces/${workspaceId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const workspaceData = response.data.data;
      setWorkspace(workspaceData);
      
      // Set workspace in global filter
      if (workspaceId) {
        setGlobalWorkspace(workspaceId);
      }
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
        apiUrl(`/api/v1/workspaces/${workspaceId}/modules/${moduleId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const moduleData = response.data.data;
      setModule(moduleData);
      
      // Set module in global filter
      setGlobalModule(moduleData);
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
              <span className="ml-3 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {module.public_id}
              </span>
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
            {module.description && (
              <p className="text-gray-700 dark:text-gray-300 mt-2">
                {module.description}
              </p>
            )}
          </div>
          <div className="ml-6 text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-end mb-1">
                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                Created {new Date(module.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements Views */}
      <RequirementsViews 
        workspaceId={workspaceId!}
        standalone={true}
      />
    </div>
  );
};

export default ModuleDetail;