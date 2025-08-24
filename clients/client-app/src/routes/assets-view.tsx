import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { 
  fetchAssets, 
  uploadAsset, 
  updateAsset,
  deleteAsset,
  downloadAsset,
  clearError 
} from "../store/assets/assets.slice";
import { 
  selectAssets, 
  selectAssetsLoading, 
  selectAssetsError,
  selectAssetsUploading 
} from "../store/assets/assets.selectors";
import LoadingSpinner from "../components/ui/loading-spinner";
import Modal from "../components/ui/modal";
import { FolderIcon } from "@heroicons/react/24/outline";

const AssetsView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = useAppSelector(selectAssets);
  const loading = useAppSelector(selectAssetsLoading);
  const uploading = useAppSelector(selectAssetsUploading);
  const error = useAppSelector(selectAssetsError);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (workspaceId) {
        const token = await getToken({ template: "default" });
        dispatch(fetchAssets({ 
          workspaceId: parseInt(workspaceId),
          token: token!,
          search: searchQuery || undefined,
          file_type: selectedFileType || undefined,
          sort: sortBy,
          order: sortOrder
        }));
      }
    };
    fetchData();
  }, [dispatch, workspaceId, searchQuery, selectedFileType, sortBy, sortOrder, getToken]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId) {
      const token = await getToken({ template: "default" });
      dispatch(fetchAssets({ 
        workspaceId: parseInt(workspaceId),
        token: token!,
        search: searchQuery || undefined,
        file_type: selectedFileType || undefined,
        sort: sortBy,
        order: sortOrder
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !workspaceId) return;

    for (const file of Array.from(files)) {
      try {
        await dispatch(uploadAsset({
          workspaceId: parseInt(workspaceId),
          file
        })).unwrap();
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditAsset = (asset: any) => {
    setEditingAsset({
      id: asset.id,
      name: asset.name,
      description: asset.description || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !workspaceId) return;

    try {
      await dispatch(updateAsset({
        workspaceId: parseInt(workspaceId),
        assetId: editingAsset.id,
        updates: {
          name: editingAsset.name,
          description: editingAsset.description
        }
      })).unwrap();
      
      setIsEditModalOpen(false);
      setEditingAsset(null);
    } catch (error) {
      console.error("Failed to update asset:", error);
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (workspaceId && confirm("Are you sure you want to delete this asset?")) {
      try {
        await dispatch(deleteAsset({
          workspaceId: parseInt(workspaceId),
          assetId
        })).unwrap();
      } catch (error) {
        console.error("Failed to delete asset:", error);
      }
    }
  };

  const handleDownloadAsset = async (assetId: number, assetName: string) => {
    if (workspaceId) {
      try {
        await dispatch(downloadAsset({
          workspaceId: parseInt(workspaceId),
          assetId,
          assetName
        })).unwrap();
      } catch (error) {
        console.error("Failed to download asset:", error);
      }
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (fileType.includes('text') || fileType.includes('json') || fileType.includes('xml')) {
      return (
        <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('gz')) {
      return (
        <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Assets</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage files and documents for this workspace
            </p>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.doc,.docx,.txt,.md,.rtf,.zip,.tar,.gz,.7z,.json,.xml,.csv,.xlsx,.xls,.py,.js,.html,.css,.sql"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="pdf">PDF</option>
                <option value="text">Text</option>
                <option value="json">JSON</option>
                <option value="zip">Archives</option>
              </select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getFileTypeIcon(asset.file_type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {asset.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {asset.file_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditAsset(asset)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                      title="Edit asset"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownloadAsset(asset.id, asset.name)}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1"
                      title="Download asset"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      title="Delete asset"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {asset.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {asset.description}
                  </p>
                )}

                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>ID: {asset.public_id}</span>
                  <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderIcon className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || selectedFileType
              ? "Try adjusting your filters to see more results."
              : "Get started by uploading your first file."
            }
          </p>
        </div>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAsset(null);
        }}
        title="Edit Asset"
      >
        {editingAsset && (
          <form onSubmit={handleUpdateAsset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={editingAsset.name}
                onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter asset name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editingAsset.description}
                onChange={(e) => setEditingAsset({ ...editingAsset, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter asset description (optional)"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAsset(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#001447] via-[#0a2060] to-[#182a7e] hover:from-[#0a225f] hover:via-[#162f7e] hover:to-[#243391] text-white rounded-lg font-medium transition-all duration-300"
              >
                Update Asset
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AssetsView;