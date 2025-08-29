import { 
  CubeIcon, 
  DocumentTextIcon, 
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  PencilIcon
} from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ModuleInfo {
  id: number;
  name: string;
  description?: string;
  shared: boolean;
  requirement_count?: number;
}


interface Product {
  id: number;
  workspace_id: number;
  public_id: string;
  name: string;
  description?: string;
  metadata?: any;
  created_at: string;
  default_module?: ModuleInfo;
  modules?: ModuleInfo[];
  total_module_requirements?: number;
}

interface EnhancedProductCardProps {
  product: Product;
  workspaceId: string;
  onClick?: () => void;
  onDelete?: (product: Product) => void;
  onShowModules?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

const EnhancedProductCard = ({ product, workspaceId, onClick, onDelete, onShowModules, onEdit }: EnhancedProductCardProps) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getBgColorFromId = (id: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    return colors[id % colors.length];
  };

  const handleViewRequirements = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workspace/${workspaceId}/requirements?product=${product.id}`);
  };

  const handleViewModules = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/workspace/${workspaceId}/modules?product=${product.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (onDelete) {
      onDelete(product);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (onEdit) {
      onEdit(product);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // In simplified architecture, all products with modules are considered properly set up
  const hasDefaultModule = product.default_module;
  const isFullyConfigured = hasDefaultModule; // Products with default modules are ready to use

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden border border-gray-200 dark:border-gray-700 h-full"
      onClick={onClick}
    >
      <div className="flex h-full">
        <div className={`w-1 ${getBgColorFromId(product.id)} flex-shrink-0`} />
        <div className="p-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
                {product.public_id}
              </p>
              {product.description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-2">
                  {product.description}
                </p>
              )}
            </div>
            
            {/* Setup Status Indicator and Actions */}
            <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
              {isFullyConfigured ? (
                <div className="flex items-center text-green-600 dark:text-green-400" title="Ready to use">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex items-center text-gray-400 dark:text-gray-500" title="No default module">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                </div>
              )}
              
              {/* Actions Dropdown */}
              {(onDelete || onEdit) && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="More actions"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="py-1">
                        {onEdit && (
                          <button
                            onClick={handleEditClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit Product
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={handleDeleteClick}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete Product
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Setup Status Info */}
          <div className="space-y-2 mb-4">
            {/* Module Status */}
            <div className="flex items-center text-sm">
              <CubeIcon className="h-4 w-4 mr-2 text-blue-500" />
              {product.default_module ? (
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Default Module:</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/workspace/${workspaceId}/modules/${product.default_module!.id}`);
                    }}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                  >
                    {product.default_module.name}
                  </button>
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  No default module
                </span>
              )}
            </div>

            {/* Requirements Status */}
            <div className="flex items-center text-sm">
              <DocumentTextIcon className="h-4 w-4 mr-2 text-green-500" />
              {product.total_module_requirements !== undefined && product.total_module_requirements > 0 ? (
                <span className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Requirements:</span>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                    {product.total_module_requirements} reqs
                  </span>
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  No requirements
                </span>
              )}
            </div>

            {/* Associated Modules Summary */}
            {product.modules && product.modules.length > 0 && (
              <div className="flex items-center text-sm">
                <CubeIcon className="h-4 w-4 mr-2 text-purple-500" />
                <div className="flex items-center flex-wrap gap-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Associated Modules ({product.modules.length}):
                  </span>
                  {product.modules.slice(0, 3).map((module, index) => (
                    <button
                      key={module.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workspace/${workspaceId}/modules/${module.id}`);
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline text-xs"
                    >
                      {module.name}{index < Math.min(product.modules!.length, 3) - 1 ? ',' : ''}
                    </button>
                  ))}
                  {product.modules.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onShowModules) {
                          onShowModules(product);
                        }
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline text-xs font-medium"
                    >
                      +{product.modules.length - 3} more
                    </button>
                  )}
                  {product.total_module_requirements !== undefined && product.total_module_requirements > 0 && (
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">
                      {product.total_module_requirements} reqs
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {isFullyConfigured && (
            <div className="flex space-x-2 mb-3">
              <button
                onClick={handleViewRequirements}
                className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <DocumentTextIcon className="h-3 w-3 mr-1" />
                Requirements
                {product.total_module_requirements !== undefined && product.total_module_requirements > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200">
                    {product.total_module_requirements}
                  </span>
                )}
                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
              </button>
              
              <button
                onClick={handleViewModules}
                className="flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <CubeIcon className="h-3 w-3 mr-1" />
                Modules
                {product.modules && product.modules.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200">
                    {product.modules.length}
                  </span>
                )}
                <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1" />
              </button>
            </div>
          )}

          {/* Module Status Information */}
          {!isFullyConfigured && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 mb-3">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <p className="font-medium mb-1">No default module</p>
                  <p>Create a module to start organizing requirements for this product.</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto">
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              Created: {new Date(product.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProductCard;