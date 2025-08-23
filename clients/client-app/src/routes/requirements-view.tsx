import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setRequirements,
  addRequirement,
  setLoading,
  setError,
  clearRequirements,
} from "../store/requirements/requirements.slice";
import {
  selectRequirements,
  selectRequirementsLoading,
  selectRequirementsError,
} from "../store/requirements/requirements.selectors";
import { selectSelectedWorkspace } from "../store/workspaces/workspaces.selectors";
import { setSelectedWorkspaceId } from "../store/workspaces/workspaces.slice";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";
import { DocumentTextIcon } from "@heroicons/react/24/outline";


interface Workspace {
  id: string;
  name: string;
  description?: string;
}

const RequirementsView = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();
  
  const requirements = useAppSelector(selectRequirements);
  const loading = useAppSelector(selectRequirementsLoading);
  const error = useAppSelector(selectRequirementsError);
  const workspace = useAppSelector(selectSelectedWorkspace);
  
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");

  const fetchWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setWorkspaceDetails(response.data.data);
    } catch (err: any) {
      console.error("Error fetching workspace:", err);
    }
  };

  const fetchRequirements = async () => {
    if (!workspaceId) return;
    
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(setRequirements(response.data.data?.items || response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching requirements:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch requirements"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const createRequirement = async () => {
    if (!workspaceId) return;

    const name = prompt("Enter requirement name:");
    if (!name) return;

    const definition = prompt("Enter requirement definition:") || "";
    const priority = prompt("Enter priority (HIGH, MEDIUM, LOW, CRITICAL):") || "MEDIUM";
    const level = prompt("Enter level (SYSTEM, SUBSYSTEM, COMPONENT):") || "SYSTEM";

    try {
      const token = await getToken({ template: "default" });
      
      // First create a req_collection for this workspace
      let reqCollectionId: number;
      try {
        const reqCollectionResponse = await axios.post(
          `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections`,
          {
            name: "Default Requirements Collection",
            description: "Default requirements collection for workspace"
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        reqCollectionId = reqCollectionResponse.data.data.id;
      } catch (reqCollectionErr: any) {
        console.error("Failed to create req_collection:", reqCollectionErr);
        alert("Failed to create requirements collection. Please contact support.");
        return;
      }
      
      const response = await axios.post(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements`,
        {
          req_collection_id: reqCollectionId,
          name,
          definition,
          level: level.toUpperCase(),
          priority: priority.toUpperCase(),
          functional: "FUNCTIONAL",
          validation_method: "TEST",
          status: "DRAFT",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      dispatch(addRequirement(response.data.data)); // Add to Redux store
    } catch (err: any) {
      console.error("Error creating requirement:", err);
      alert(err.response?.data?.message || "Failed to create requirement");
    }
  };

  useEffect(() => {
    if (workspaceId) {
      dispatch(setSelectedWorkspaceId(workspaceId));
    }
    
    if (workspaceId) {
      fetchWorkspace();
      fetchRequirements();
    }
    
    return () => {
      dispatch(clearRequirements());
    };
  }, [workspaceId, dispatch]);

  // Filter and sort requirements
  const filteredAndSortedRequirements = requirements
    .filter(req => {
      if (statusFilter !== "all" && req.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "all" && req.priority.toLowerCase() !== priorityFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "priority":
          const priorityOrder = { "critical": 4, "high": 3, "medium": 2, "low": 1 };
          return (priorityOrder[b.priority.toLowerCase() as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority.toLowerCase() as keyof typeof priorityOrder] || 0);
        case "status":
          return a.status.localeCompare(b.status);
        default: // created_at
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBgColorFromId = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-cyan-500'
    ];
    return colors[id % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Requirements</h1>
            {(workspace || workspaceDetails)?.description && (
              <p className="text-gray-600 dark:text-gray-300 mt-1">{(workspace || workspaceDetails)!.description}</p>
            )}
          </div>
          <div>
            <button
              onClick={createRequirement}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Requirements ({filteredAndSortedRequirements.length} of {requirements.length})
            </h2>
          </div>
            
          {/* Filters and Sorting */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
              
            <div className="flex items-center space-x-2">
              <label htmlFor="priority-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority:
              </label>
              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
              
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>
              
            {(statusFilter !== "all" || priorityFilter !== "all") && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="py-6">
                <ErrorMessage 
                  title="Failed to load requirements"
                  message={error}
                  onRetry={fetchRequirements}
                />
              </div>
            ) : filteredAndSortedRequirements.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                  <DocumentTextIcon />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requirements found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {requirements.length === 0 ? "Get started by creating your first requirement." : "Try adjusting your filters to see more results."}
                </p>
                {requirements.length === 0 ? (
                  <button
                    onClick={createRequirement}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Your First Requirement
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAndSortedRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/workspace/${workspaceId}/requirements/${requirement.id}`)}
                  >
                    <div className="flex">
                      <div className={`w-1 ${getBgColorFromId(requirement.id)} flex-shrink-0`} />
                      <div className="p-4 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {requirement.public_id || requirement.name}
                        </h3>
                        {requirement.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                            {requirement.description}
                          </p>
                        )}
                        <div className="flex flex-col space-y-2 mb-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border self-start ${getStatusColor(requirement.status)}`}>
                            {requirement.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border self-start ${getPriorityColor(requirement.priority)}`}>
                            {requirement.priority}
                          </span>
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                          Created: {new Date(requirement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RequirementsView;