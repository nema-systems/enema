import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectModules, selectModulesLoading, selectModulesError } from "../store/modules/modules.selectors";
import { setModules, addModule, updateModule, deleteModule, setLoading, setError } from "../store/modules/modules.slice";
import { Module } from "../store/modules/modules.slice";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";
import { CubeIcon, PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import ModuleModal, { ModuleFormData } from "../components/modals/module-modal";

const ModulesView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();
  
  const modules = useAppSelector(selectModules);
  const loading = useAppSelector(selectModulesLoading);
  const error = useAppSelector(selectModulesError);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newModule, setNewModule] = useState({
    name: "",
    description: "",
  });

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

  const fetchModules = async () => {
    if (!workspaceId) return;
    
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(setModules(response.data.data?.items || response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching modules:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch modules"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCreateModule = async (formData: ModuleFormData) => {
    if (!workspaceId) return;
    
    try {
      setIsCreating(true);
      const token = await getToken({ template: "default" });
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rules: formData.rules.trim() || null,
        shared: formData.shared,
        create_new_req_collection: formData.create_new_req_collection,
        new_req_collection_name: formData.create_new_req_collection ? formData.new_req_collection_name?.trim() : undefined,
        req_collection_id: formData.create_new_req_collection ? undefined : formData.req_collection_id,
      };

      const response = await axios.post(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(addModule(response.data.data));
      setIsCreateModalOpen(false);
      
      // Optionally show success message
      console.log("Module created successfully:", response.data.data.name);
      
    } catch (err: any) {
      console.error("Error creating module:", err);
      dispatch(setError(err.response?.data?.message || "Failed to create module"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditModule = async (formData: ModuleFormData) => {
    if (!workspaceId || !editingModule) return;
    
    try {
      setIsUpdating(true);
      const token = await getToken({ template: "default" });
      
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        rules: formData.rules.trim() || null,
      };

      const response = await axios.put(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules/${editingModule.id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(updateModule(response.data.data));
      setIsEditModalOpen(false);
      setEditingModule(null);
      
      // Optionally show success message
      console.log("Module updated successfully:", response.data.data.name);
      
    } catch (err: any) {
      console.error("Error updating module:", err);
      dispatch(setError(err.response?.data?.message || "Failed to update module"));
    } finally {
      setIsUpdating(false);
    }
  };

  const updateModuleData = async (moduleId: number, data: Partial<Module>) => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.put(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules/${moduleId}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(updateModule(response.data.data));
      setEditingModule(null);
    } catch (err: any) {
      console.error("Error updating module:", err);
      dispatch(setError(err.response?.data?.message || "Failed to update module"));
    }
  };

  const deleteModuleData = async (moduleId: number) => {
    if (!workspaceId || !confirm("Are you sure you want to delete this module?")) return;
    
    try {
      const token = await getToken({ template: "default" });
      await axios.delete(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/modules/${moduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(deleteModule(moduleId));
    } catch (err: any) {
      console.error("Error deleting module:", err);
      dispatch(setError(err.response?.data?.message || "Failed to delete module"));
    }
  };

  useEffect(() => {
    fetchModules();
  }, [workspaceId]);

  // Filter and sort modules
  const filteredModules = modules
    .filter(module =>
      module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = sortBy === "name" ? a.name : new Date(a.created_at).getTime();
      const bVal = sortBy === "name" ? b.name : new Date(b.created_at).getTime();
      
      if (sortBy === "name") {
        return sortOrder === "asc" ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
      } else {
        return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });

  // Remove this block to use inline loading like projects view

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modules</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your system modules</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Module
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search modules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "created_at")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="created_at">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Modules List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Modules ({modules.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="py-6">
              <ErrorMessage 
                title="Failed to load modules"
                message={error}
                onRetry={fetchModules}
              />
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="text-center py-12">
              <CubeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {modules.length === 0 ? "No modules" : "No modules found"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {modules.length === 0 
                  ? "Get started by creating your first module." 
                  : "Try adjusting your search terms"
                }
              </p>
              {modules.length === 0 && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Module
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredModules.map((module) => (
                <div
                  key={module.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
                >
                  <div className="flex">
                    <div className={`w-1 ${getBgColorFromId(module.id)} flex-shrink-0`} />
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                          {module.name}
                        </h3>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModule(module);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Edit module"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {/* Only show delete button for shared modules (shared=true) */}
                          {module.shared && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteModuleData(module.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete module"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                          {!module.shared && (
                            <div 
                              className="p-1 text-gray-300 dark:text-gray-600"
                              title="Base modules cannot be deleted"
                            >
                              <TrashIcon className="h-4 w-4 opacity-30" />
                            </div>
                          )}
                        </div>
                      </div>
                      {module.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                          {module.description}
                        </p>
                      )}
                      <p className="text-gray-400 dark:text-gray-500 text-xs">
                        Created: {new Date(module.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Module Modal */}
      <ModuleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateModule}
        isLoading={isCreating}
        workspaceId={workspaceId!}
      />

      {/* Edit Module Modal */}
      <ModuleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingModule(null);
        }}
        onSubmit={handleEditModule}
        isLoading={isUpdating}
        workspaceId={workspaceId!}
        editModule={editingModule}
      />
    </div>
  );
};

export default ModulesView;