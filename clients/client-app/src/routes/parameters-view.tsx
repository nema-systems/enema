import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  fetchParameters, 
  createParameter, 
  updateParameter,
  deleteParameter,
  createParameterVersion,
  clearError 
} from "../store/parameters/parameters.slice";
import { 
  selectParameters, 
  selectParametersLoading, 
  selectParametersError 
} from "../store/parameters/parameters.selectors";
import LoadingSpinner from "../components/ui/loading-spinner";
import Modal from "../components/ui/modal";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

const ParametersView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();

  const parameters = useAppSelector(selectParameters);
  const loading = useAppSelector(selectParametersLoading);
  const error = useAppSelector(selectParametersError);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<any>(null);

  const [newParameter, setNewParameter] = useState({
    name: "",
    type: "string",
    description: "",
    value: "",
    group_id: "",
    metadata: {}
  });

  useEffect(() => {
    const fetchData = async () => {
      if (workspaceId) {
        const token = await getToken({ template: "default" });
        dispatch(fetchParameters({ 
          workspaceId: parseInt(workspaceId),
          token: token!,
          search: searchQuery || undefined,
          type: selectedType || undefined,
          group_id: selectedGroup || undefined,
          sort: sortBy,
          order: sortOrder
        }));
      }
    };
    fetchData();
  }, [dispatch, workspaceId, searchQuery, selectedType, selectedGroup, sortBy, sortOrder, getToken]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId) {
      dispatch(fetchParameters({ 
        workspaceId: parseInt(workspaceId),
        search: searchQuery || undefined,
        type: selectedType || undefined,
        group_id: selectedGroup || undefined,
        sort: sortBy,
        order: sortOrder
      }));
    }
  };

  const handleCreateParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId) {
      try {
        await dispatch(createParameter({
          workspaceId: parseInt(workspaceId),
          parameter: newParameter
        })).unwrap();
        
        setIsCreateModalOpen(false);
        setNewParameter({
          name: "",
          type: "string",
          description: "",
          value: "",
          group_id: "",
          metadata: {}
        });
      } catch (error) {
        console.error("Failed to create parameter:", error);
      }
    }
  };

  const handleEditParameter = (parameter: any) => {
    setEditingParameter({
      id: parameter.id,
      name: parameter.name,
      type: parameter.type,
      description: parameter.description || "",
      value: parameter.value || "",
      group_id: parameter.group_id || "",
      metadata: parameter.metadata || {}
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParameter || !workspaceId) return;

    try {
      await dispatch(updateParameter({
        workspaceId: parseInt(workspaceId),
        parameterId: editingParameter.id,
        updates: {
          name: editingParameter.name,
          type: editingParameter.type,
          description: editingParameter.description,
          value: editingParameter.value,
          group_id: editingParameter.group_id,
          metadata: editingParameter.metadata
        }
      })).unwrap();
      
      setIsEditModalOpen(false);
      setEditingParameter(null);
    } catch (error) {
      console.error("Failed to update parameter:", error);
    }
  };

  const handleDeleteParameter = async (parameterId: number) => {
    if (workspaceId && confirm("Are you sure you want to delete this parameter?")) {
      try {
        await dispatch(deleteParameter({
          workspaceId: parseInt(workspaceId),
          parameterId
        })).unwrap();
      } catch (error) {
        console.error("Failed to delete parameter:", error);
      }
    }
  };

  const renderValue = (value: any, type: string) => {
    if (value === null || value === undefined) return "—";
    
    switch (type) {
      case 'boolean':
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            value ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {String(value)}
          </span>
        );
      case 'array':
      case 'object':
        return (
          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {JSON.stringify(value)}
          </code>
        );
      default:
        return <span className="text-sm text-gray-900 dark:text-gray-100">{String(value)}</span>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'string': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
      case 'number': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
      case 'boolean': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
      case 'array': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800';
      case 'object': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Parameters</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage configuration parameters for this workspace
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Parameter
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
                placeholder="Search parameters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Group ID"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
          {parameters.map((parameter) => (
            <div
              key={parameter.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-2">
                      {parameter.name}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(parameter.type)}`}>
                        {parameter.type}
                      </span>
                      {parameter.group_id && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                          {parameter.group_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditParameter(parameter)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title="Edit parameter"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteParameter(parameter.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      title="Delete parameter"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {parameter.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {parameter.description}
                  </p>
                )}

                <div className="mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Value:</div>
                  {renderValue(parameter.value, parameter.type)}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>v{parameter.version_number}</span>
                  <span>{new Date(parameter.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {parameters.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            <AdjustmentsHorizontalIcon />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No parameters found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || selectedType || selectedGroup
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first parameter."
            }
          </p>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Parameter"
      >
        <form onSubmit={handleCreateParameter} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={newParameter.name}
                onChange={(e) => setNewParameter({ ...newParameter, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Parameter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                required
                value={newParameter.type}
                onChange={(e) => setNewParameter({ ...newParameter, type: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
                <option value="object">Object</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group ID
            </label>
            <input
              type="text"
              value={newParameter.group_id}
              onChange={(e) => setNewParameter({ ...newParameter, group_id: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional group identifier"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value
            </label>
            <textarea
              value={newParameter.value}
              onChange={(e) => setNewParameter({ ...newParameter, value: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Parameter value (JSON for arrays/objects)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newParameter.description}
              onChange={(e) => setNewParameter({ ...newParameter, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Parameter description (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Parameter
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingParameter(null);
        }}
        title="Edit Parameter"
      >
        {editingParameter && (
          <form onSubmit={handleUpdateParameter} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingParameter.name}
                  onChange={(e) => setEditingParameter({ ...editingParameter, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={editingParameter.type}
                  onChange={(e) => setEditingParameter({ ...editingParameter, type: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group ID
              </label>
              <input
                type="text"
                value={editingParameter.group_id}
                onChange={(e) => setEditingParameter({ ...editingParameter, group_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Value
              </label>
              <textarea
                value={editingParameter.value}
                onChange={(e) => setEditingParameter({ ...editingParameter, value: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editingParameter.description}
                onChange={(e) => setEditingParameter({ ...editingParameter, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingParameter(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update Parameter
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ParametersView;