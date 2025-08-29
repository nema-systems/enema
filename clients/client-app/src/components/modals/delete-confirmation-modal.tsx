import { useState, useEffect } from "react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";

interface DeletionPreview {
  modules: Array<{
    id: number;
    name: string;
    description?: string;
    requirements_count: number;
    is_default?: boolean;
  }>;
  requirements_count: number;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  itemType: string;
  isLoading?: boolean;
  warningMessage?: string;
  deletionPreview?: DeletionPreview;
  isLoadingPreview?: boolean;
}

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType,
  isLoading = false,
  warningMessage,
  deletionPreview,
  isLoadingPreview = false
}: DeleteConfirmationModalProps) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState("");

  const isConfirmationValid = confirmationText.trim() === itemName.trim();

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfirmationValid) {
      setError(`Please type "${itemName}" exactly to confirm deletion.`);
      return;
    }

    setError("");
    
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || "Failed to delete item. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
              Delete {itemType}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="bg-red-50/80 dark:bg-red-900/30 backdrop-blur border border-red-200/50 dark:border-red-800/50 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Warning: This action cannot be undone
                  </h4>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      You are about to permanently delete <strong>"{itemName}"</strong>.
                    </p>
                    {warningMessage && (
                      <p className="mt-2">{warningMessage}</p>
                    )}
                    
                    {/* Deletion Preview */}
                    {isLoadingPreview && (
                      <div className="mt-3 flex items-center">
                        <svg className="animate-spin h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-red-600 dark:text-red-400">Loading deletion details...</span>
                      </div>
                    )}
                    
                    {deletionPreview && !isLoadingPreview && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          This will also delete:
                        </p>
                        
                        {deletionPreview.modules.length > 0 && (
                          <div className="ml-2">
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                              Modules ({deletionPreview.modules.length}):
                            </p>
                            <ul className="ml-4 text-sm text-red-600 dark:text-red-400 space-y-2">
                              {deletionPreview.modules.map((module) => (
                                <li key={module.id} className="flex flex-col">
                                  <div className="flex items-center">
                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2 flex-shrink-0"></span>
                                    <span className="font-medium">{module.name}</span>
                                    {module.is_default && (
                                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 rounded">
                                        Default Module
                                      </span>
                                    )}
                                  </div>
                                  <div className="ml-4 text-xs text-red-500 dark:text-red-400">
                                    Contains {module.requirements_count} requirement{module.requirements_count !== 1 ? 's' : ''}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        
                        {deletionPreview.modules.length > 0 && (
                          <div className="ml-2 mt-2 p-2 bg-red-100/70 dark:bg-red-900/40 backdrop-blur rounded-lg border border-red-200/40 dark:border-red-800/40">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Total Requirements to Delete: <span className="font-bold">{deletionPreview.requirements_count}</span>
                            </p>
                            {deletionPreview.requirements_count === 0 && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                No requirements will be lost, but the module structure will be removed.
                              </p>
                            )}
                          </div>
                        )}
                        
                        {deletionPreview.modules.length === 0 && (
                          <p className="text-sm text-red-600 dark:text-red-400 ml-2">
                            No additional resources will be deleted.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmation-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To confirm deletion, please type the {itemType.toLowerCase()} name:
            </label>
            <div className="mb-2">
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {itemName}
              </code>
            </div>
            <input
              id="confirmation-text"
              type="text"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setError(""); // Clear error when user types
              }}
              disabled={isLoading}
              className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 dark:text-white ${
                error ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
              } disabled:opacity-50 placeholder:text-gray-400/70`}
              placeholder={`Type "${itemName}" here`}
              autoComplete="off"
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-700/70 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500/50 disabled:opacity-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmationValid || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600/90 hover:bg-red-700/90 backdrop-blur border border-transparent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-200"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete {itemType}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;