import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { selectReqCollections, selectReqCollectionsLoading, selectReqCollectionsError } from "../store/req_collections/req_collections.selectors";
import { setReqCollections, addReqCollection, updateReqCollection, deleteReqCollection, setLoading, setError } from "../store/req_collections/req_collections.slice";
import { ReqCollection } from "../store/req_collections/req_collections.slice";
import LoadingSpinner from "../components/ui/loading-spinner";
import ErrorMessage from "../components/ui/error-message";
import { CubeTransparentIcon, PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import DeleteReqCollectionModal from "../components/modals/delete-req-collection-modal";
import ReqCollectionModal, { ReqCollectionFormData } from "../components/modals/req-collection-modal";

const ReqCollectionsView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();
  
  const reqCollections = useAppSelector(selectReqCollections);
  const loading = useAppSelector(selectReqCollectionsLoading);
  const error = useAppSelector(selectReqCollectionsError);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ReqCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<ReqCollection | null>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

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

  const fetchReqCollections = async () => {
    if (!workspaceId) return;
    
    try {
      dispatch(setLoading(true));
      const token = await getToken({ template: "default" });
      
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(setReqCollections(response.data.data?.items || response.data.data || []));
      dispatch(setError(null));
    } catch (err: any) {
      console.error("Error fetching requirement collections:", err);
      dispatch(setError(err.response?.data?.message || "Failed to fetch requirement collections"));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchRequirements = async () => {
    if (!workspaceId) return;
    
    try {
      const token = await getToken({ template: "default" });
      const response = await axios.get(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/requirements`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setRequirements(response.data.data?.items || response.data.data || []);
    } catch (err: any) {
      console.error("Error fetching requirements:", err);
    }
  };

  const handleModalSubmit = async (formData: ReqCollectionFormData) => {
    if (!workspaceId) return;
    
    try {
      setIsSubmittingModal(true);
      const token = await getToken({ template: "default" });
      
      if (editingCollection) {
        // Update existing collection
        const response = await axios.put(
          `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections/${editingCollection.id}`,
          {
            name: formData.name.trim(),
            metadata: formData.metadata,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        dispatch(updateReqCollection(response.data.data));
      } else {
        // Create new collection
        const response = await axios.post(
          `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections`,
          {
            name: formData.name.trim(),
            metadata: formData.metadata,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        dispatch(addReqCollection(response.data.data));
      }
      
      setIsModalOpen(false);
      setEditingCollection(null);
    } catch (err: any) {
      console.error("Error saving requirement collection:", err);
      dispatch(setError(err.response?.data?.message || "Failed to save requirement collection"));
    } finally {
      setIsSubmittingModal(false);
    }
  };


  const deleteReqCollectionData = async () => {
    if (!workspaceId || !deletingCollection) return;
    
    try {
      setIsDeletingCollection(true);
      const token = await getToken({ template: "default" });
      await axios.delete(
        `http://localhost:8000/api/v1/workspaces/${workspaceId}/req_collections/${deletingCollection.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      dispatch(deleteReqCollection(deletingCollection.id));
      setDeletingCollection(null);
    } catch (err: any) {
      console.error("Error deleting requirement collection:", err);
      dispatch(setError(err.response?.data?.message || "Failed to delete requirement collection"));
    } finally {
      setIsDeletingCollection(false);
    }
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setIsModalOpen(true);
  };

  const handleEditCollection = (collection: ReqCollection) => {
    setEditingCollection(collection);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCollection(null);
  };

  const handleCollectionClick = (collection: ReqCollection) => {
    navigate(`/workspace/${workspaceId}/req_collections/${collection.id}`);
  };

  useEffect(() => {
    fetchReqCollections();
    fetchRequirements();
  }, [workspaceId]);

  // Helper function to get requirement count for a collection
  const getRequirementCount = (collectionId: number) => {
    return requirements.filter(req => req.req_collection_id === collectionId).length;
  };

  // Filter and sort collections
  const filteredCollections = reqCollections
    .filter(collection =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Requirement Collections</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage workspace requirement collections</p>
        </div>
        <button
          onClick={handleCreateCollection}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Collection
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search collections..."
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

      {/* Collections List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Collections ({reqCollections.length})
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
                title="Failed to load requirement collections"
                message={error}
                onRetry={fetchReqCollections}
              />
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <CubeTransparentIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {reqCollections.length === 0 ? "No requirement collections" : "No collections found"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {reqCollections.length === 0 
                  ? "Get started by creating your first requirement collection." 
                  : "Try adjusting your search terms"
                }
              </p>
              {reqCollections.length === 0 && (
                <button
                  onClick={handleCreateCollection}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Collection
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCollections.map((collection) => (
                <div
                  key={collection.id}
                  onClick={() => handleCollectionClick(collection)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group hover:scale-[1.02]"
                >
                  <div className="flex">
                    <div className={`w-1 ${getBgColorFromId(collection.id)} flex-shrink-0`} />
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                          {collection.name}
                        </h3>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCollection(collection);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Edit collection"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCollection(collection);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete collection"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-gray-400 dark:text-gray-500 text-xs">
                          Created: {new Date(collection.created_at).toLocaleDateString()}
                        </p>
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-full">
                          {getRequirementCount(collection.id)} requirements
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified Create/Edit Collection Modal */}
      <ReqCollectionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        isLoading={isSubmittingModal}
        editReqCollection={editingCollection}
      />

      {/* Delete Collection Modal */}
      <DeleteReqCollectionModal
        isOpen={!!deletingCollection}
        onClose={() => setDeletingCollection(null)}
        onConfirm={deleteReqCollectionData}
        reqCollection={deletingCollection}
        requirements={requirements}
        isLoading={isDeletingCollection}
      />
    </div>
  );
};

export default ReqCollectionsView;