import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setWorkspaces, setLoading, setError, addWorkspace } from "../store/workspaces/workspaces.slice";
import { selectWorkspaces, selectWorkspacesLoading, selectWorkspacesError } from "../store/workspaces/workspaces.selectors";
import axios from "axios";
import { apiUrl } from "../utils/api";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const WorkspaceSelector = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const workspaces = useAppSelector(selectWorkspaces);
  const loading = useAppSelector(selectWorkspacesLoading);
  const error = useAppSelector(selectWorkspacesError);

  const fetchWorkspaces = async () => {
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(apiUrl('/api/v1/workspaces/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      dispatch(setWorkspaces(response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching workspaces:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch workspaces"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const createWorkspace = async () => {
    const name = prompt("Enter workspace name:");
    if (!name) return;

    try {
      const token = await getToken({ template: "default" });
      const response = await axios.post(
        apiUrl('/api/v1/workspaces/'),
        { name, description: "" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      dispatch(addWorkspace(response.data.data)); // Add to Redux store
    } catch (err: any) {
      console.error("Error creating workspace:", err);
      alert(err.response?.data?.message || "Failed to create workspace");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
            <div>
              <button
                onClick={createWorkspace}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Workspace
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <div className="py-6">
                <ErrorMessage 
                  title="Failed to load workspaces"
                  message={error}
                  onRetry={fetchWorkspaces}
                />
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">No workspaces found</div>
                <button
                  onClick={createWorkspace}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Create Your First Workspace
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{workspace.name}</h3>
                    {workspace.description && (
                      <p className="text-gray-600 text-sm mb-3">{workspace.description}</p>
                    )}
                    <p className="text-gray-400 text-xs mb-4">
                      Created: {new Date(workspace.created_at).toLocaleDateString()}
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${workspace.id}/products`);
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-3 rounded text-sm transition-colors"
                      >
                        Products
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/workspace/${workspace.id}/requirements`);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
                      >
                        Requirements
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSelector;