import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import RequirementCreationModal, { RequirementFormData } from "../components/modals/requirement-creation-modal";
import SuccessToast from "../components/ui/success-toast";
import { DocumentTextIcon, PencilSquareIcon } from "@heroicons/react/24/outline";


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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const requirements = useAppSelector(selectRequirements);
  const loading = useAppSelector(selectRequirementsLoading);
  const error = useAppSelector(selectRequirementsError);
  const workspace = useAppSelector(selectSelectedWorkspace);
  
  const [workspaceDetails, setWorkspaceDetails] = useState<Workspace | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || "all");
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || "all");
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || "created_at");
  const [productFilter, setProductFilter] = useState<string>(searchParams.get('product') || "all");
  
  // Pagination state for automatic loading
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastCreatedRequirement, setLastCreatedRequirement] = useState<any>(null);
  const [reqCollections, setReqCollections] = useState<any[]>([]);
  
  // Edit state
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Product data for filtering
  const [products, setProducts] = useState<any[]>([]);

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

  const fetchRequirements = async (page = 1, append = false) => {
    if (!workspaceId) return;
    
    try {
      if (!append) {
        dispatch(setLoading(true));
        setCurrentPage(1);
        setHasMorePages(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page,
            limit: 100, // Load more items per page to reduce requests
            sort: 'created_at',
            order: 'desc'
          }
        }
      );
      
      const newRequirements = response.data.data?.items || [];
      const pagination = response.data.data?.pagination;
      
      if (append) {
        // Append new requirements to existing ones
        dispatch(setRequirements([...requirements, ...newRequirements]));
      } else {
        // Replace requirements with new data
        dispatch(setRequirements(newRequirements));
      }
      
      // Update pagination state
      setCurrentPage(page);
      setHasMorePages(pagination?.hasNext || false);
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching requirements:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch requirements"));
    } finally {
      dispatch(setLoading(false));
      setIsLoadingMore(false);
    }
  };
  
  const loadMoreRequirements = () => {
    if (hasMorePages && !isLoadingMore && !loading) {
      fetchRequirements(currentPage + 1, true);
    }
  };

  const fetchReqCollections = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: 100, // Use maximum allowed limit
            sort: 'id',
            order: 'asc'
          }
        }
      );
      setReqCollections(response.data.data?.items || []);
    } catch (err: any) {
      console.error("Error fetching req collections:", err);
    }
  };
  
  const fetchProducts = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/products`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProducts(response.data.data?.items || response.data.data || []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
    }
  };

  const handleCreateOrUpdateRequirement = async (formData: RequirementFormData) => {
    if (!workspaceId) return;

    const isEditing = !!editingRequirement;
    isEditing ? setIsUpdating(true) : setIsCreating(true);
    
    try {
      const token = await getToken({ template: "default" });
      
      const payload = {
        req_collection_id: formData.req_collection_id,
        parent_req_id: formData.parent_req_id,
        name: formData.name,
        definition: formData.definition,
        level: formData.level,
        priority: formData.priority,
        functional: formData.functional,
        validation_method: formData.validation_method,
        status: formData.status,
        rationale: formData.rationale,
        notes: formData.notes,
      };
      
      console.log(`${isEditing ? 'Updating' : 'Creating'} requirement with payload:`, payload);
      
      const response = isEditing 
        ? await axios.put(
            `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements/${editingRequirement.id}`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          )
        : await axios.post(
            `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
      
      const requirement = response.data.data;
      
      if (isEditing) {
        // Update the requirements list with the updated requirement
        fetchRequirements();
      } else {
        dispatch(addRequirement(requirement));
      }
      
      // Store for success toast
      setLastCreatedRequirement(requirement);
      
      // Close modal and show success
      setIsModalOpen(false);
      setEditingRequirement(null);
      setShowSuccessToast(true);
      
    } catch (err: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} requirement:`, err);
      console.error('API Error Details:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} requirement`;
      alert(`Error ${isEditing ? 'updating' : 'creating'} requirement: ${errorMessage}`);
    } finally {
      isEditing ? setIsUpdating(false) : setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setEditingRequirement(null);
    setIsModalOpen(true);
  };
  
  const openEditModal = (requirement: any) => {
    setEditingRequirement(requirement);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (workspaceId) {
      dispatch(setSelectedWorkspaceId(workspaceId));
    }
    
    if (workspaceId) {
      fetchWorkspace();
      fetchRequirements();
      fetchReqCollections();
      fetchProducts();
    }
    
    return () => {
      dispatch(clearRequirements());
    };
  }, [workspaceId, dispatch]);

  // Update URL when filters change
  const updateSearchParams = (newFilters: { [key: string]: string }) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === "all" || value === "created_at" && key === "sortBy") {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }
    });
    
    setSearchParams(newSearchParams);
  };
  
  // Filter and sort requirements
  const filteredAndSortedRequirements = requirements
    .filter(req => {
      if (statusFilter !== "all" && req.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "all" && req.priority.toLowerCase() !== priorityFilter) {
        return false;
      }
      if (productFilter !== "all") {
        const selectedProduct = products.find(p => p.id.toString() === productFilter);
        if (selectedProduct?.req_collection) {
          if (req.req_collection_id !== selectedProduct.req_collection.id) {
            return false;
          }
        } else {
          // If product has no req_collection, show no requirements
          return false;
        }
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
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
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
      case 'approved': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
      case 'review': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
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
              onClick={openCreateModal}
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  setStatusFilter(newValue);
                  updateSearchParams({ status: newValue });
                }}
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
                onChange={(e) => {
                  const newValue = e.target.value;
                  setPriorityFilter(newValue);
                  updateSearchParams({ priority: newValue });
                }}
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
              <label htmlFor="product-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product:
              </label>
              <select
                id="product-filter"
                value={productFilter}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setProductFilter(newValue);
                  updateSearchParams({ product: newValue });
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Products</option>
                {products.filter(p => p.req_collection).map((product) => (
                  <option key={product.id} value={product.id.toString()}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
              
            <div className="flex items-center space-x-2">
              <label htmlFor="sort-by" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSortBy(newValue);
                  updateSearchParams({ sortBy: newValue });
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="created_at">Date Created</option>
                <option value="name">Name</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>
              
            {(statusFilter !== "all" || priorityFilter !== "all" || productFilter !== "all") && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setProductFilter("all");
                  updateSearchParams({ status: "all", priority: "all", product: "all" });
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
                    onClick={openCreateModal}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create Your First Requirement
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setProductFilter("all");
                      updateSearchParams({ status: "all", priority: "all", product: "all" });
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredAndSortedRequirements.map((requirement) => (
                  <div
                    key={requirement.id}
                    className="bg-white dark:bg-gray-800 rounded-md shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative"
                  >
                    {/* Edit button */}
                    <div className="absolute top-1.5 right-1.5 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(requirement);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-1.5 rounded-md shadow-lg border border-gray-200 dark:border-gray-600"
                        title="Edit requirement"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => navigate(`/workspace/${workspaceId}/requirements/${requirement.id}`)}
                    >
                      <div className="flex">
                        <div className={`w-1 ${getBgColorFromId(requirement.id)} flex-shrink-0`} />
                        <div className="p-3 flex-1">
                          <div className="mb-2 pr-6">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-0.5 text-sm leading-tight">
                              {requirement.name}
                            </h3>
                            {requirement.public_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {requirement.public_id}
                              </p>
                            )}
                          </div>
                          {requirement.definition && (
                            <p className="text-gray-600 dark:text-gray-300 text-xs mb-2 line-clamp-2 leading-tight">
                              {requirement.definition}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(requirement.status)}`}>
                              {requirement.status}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getPriorityColor(requirement.priority)}`}>
                              {requirement.priority}
                            </span>
                          </div>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">
                            {new Date(requirement.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {hasMorePages && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMoreRequirements}
                  disabled={isLoadingMore}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingMore ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading more requirements...
                    </>
                  ) : (
                    <>
                      Load More Requirements
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        (Page {currentPage + 1})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Requirement Creation/Edit Modal */}
      <RequirementCreationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRequirement(null);
        }}
        onSubmit={handleCreateOrUpdateRequirement}
        isLoading={isCreating || isUpdating}
        reqCollections={reqCollections}
        workspaceId={workspaceId!}
        editRequirement={editingRequirement}
      />

      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        title={editingRequirement ? "Requirement Updated Successfully!" : "Requirement Created Successfully!"}
        message={editingRequirement ? `"${lastCreatedRequirement?.name}" has been updated.` : `"${lastCreatedRequirement?.name}" has been added to the requirement collection.`}
        createdResources={[
          ...(lastCreatedRequirement ? [{
            type: 'requirement' as const,
            id: lastCreatedRequirement.id,
            name: lastCreatedRequirement.name
          }] : [])
        ]}
      />
    </div>
  );
};

export default RequirementsView;