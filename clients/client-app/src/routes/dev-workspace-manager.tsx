import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/ui/loading-spinner';
import ErrorMessage from '../components/ui/error-message';

interface Workspace {
  id: number;
  name: string;
  meta_data?: any;
  created_at: string;
}

interface WorkspaceFormData {
  name: string;
  metadata?: Record<string, any>;
}

const DevWorkspaceManager: React.FC = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    metadata: {}
  });

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: 'default' });
      
      const response = await axios.get('http://localhost:8000/api/v1/workspaces/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setWorkspaces(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching workspaces:', err);
      setError(err.response?.data?.detail || 'Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  // Create or update workspace
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      const token = await getToken({ template: 'default' });
      
      const payload = {
        name: formData.name.trim(),
        metadata: formData.metadata || {},
      };

      if (editingWorkspace) {
        // Update existing workspace
        await axios.put(
          `http://localhost:8000/api/v1/workspaces/${editingWorkspace.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        // Create new workspace
        await axios.post('http://localhost:8000/api/v1/workspaces/', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Reset form and close modal
      setFormData({ name: '', metadata: {} });
      setEditingWorkspace(null);
      setIsModalOpen(false);
      
      // Refresh workspaces
      fetchWorkspaces();
    } catch (err: any) {
      console.error('Error saving workspace:', err);
      setError(err.response?.data?.detail || 'Failed to save workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete workspace
  const handleDelete = async (workspace: Workspace) => {
    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = await getToken({ template: 'default' });
      
      await axios.delete(`http://localhost:8000/api/v1/workspaces/${workspace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Refresh workspaces
      fetchWorkspaces();
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      setError(err.response?.data?.detail || 'Failed to delete workspace');
    }
  };

  // Handle edit
  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setFormData({
      name: workspace.name,
      metadata: workspace.meta_data || {},
    });
    setIsModalOpen(true);
  };

  // Handle create new
  const handleCreateNew = () => {
    setEditingWorkspace(null);
    setFormData({ name: '', metadata: {} });
    setIsModalOpen(true);
  };

  // Navigate to workspace
  const handleNavigateToWorkspace = (workspace: Workspace) => {
    navigate(`/workspace/${workspace.id}/products`);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWorkspace(null);
    setFormData({ name: '', metadata: {} });
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dev Workspace Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage workspaces for development and testing
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Workspace
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6">
          <ErrorMessage
            title="Error"
            message={error}
            onRetry={() => setError(null)}
          />
        </div>
      )}

      {/* Workspaces list */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Workspaces ({workspaces.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No workspaces found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first workspace to get started.
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {workspace.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {workspace.id}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEdit(workspace)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Edit workspace"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workspace)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete workspace"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    Created: {new Date(workspace.created_at).toLocaleDateString()}
                  </div>

                  {workspace.meta_data && Object.keys(workspace.meta_data).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <details>
                        <summary className="cursor-pointer">Metadata</summary>
                        <pre className="mt-1 text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {JSON.stringify(workspace.meta_data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleNavigateToWorkspace(workspace)}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      <ArrowRightIcon className="h-4 w-4 mr-2" />
                      Go to Workspace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={closeModal}
                  className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
                  </h3>

                  <form onSubmit={handleSubmit} className="mt-6">
                    <div className="mb-4">
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter workspace name"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label
                        htmlFor="metadata"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Metadata (JSON)
                      </label>
                      <textarea
                        id="metadata"
                        value={JSON.stringify(formData.metadata, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFormData({ ...formData, metadata: parsed });
                          } catch {
                            // Invalid JSON, keep the string value for user to fix
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                        rows={4}
                        placeholder="{}"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.name.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            {editingWorkspace ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          editingWorkspace ? 'Update Workspace' : 'Create Workspace'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevWorkspaceManager;