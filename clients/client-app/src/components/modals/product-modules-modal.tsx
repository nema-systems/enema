import { XMarkIcon } from "@heroicons/react/24/outline";
import { CubeIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
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
  name: string;
  default_module?: ModuleInfo;
  modules?: ModuleInfo[];
}

interface ProductModulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  workspaceId: string;
}

const ProductModulesModal = ({ isOpen, onClose, product, workspaceId }: ProductModulesModalProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Separate default module from associated modules
  const defaultModule = product.default_module ? { ...product.default_module, isDefault: true } : null;
  const associatedModules = (product.modules || []).map(module => ({ ...module, isDefault: false }));
  
  const allModules = [
    ...(defaultModule ? [defaultModule] : []),
    ...associatedModules
  ];

  const handleModuleClick = (moduleId: number) => {
    onClose();
    navigate(`/workspace/${workspaceId}/modules/${moduleId}`);
  };

  const getBadgeColor = (module: ModuleInfo & { isDefault?: boolean }) => {
    if (module.isDefault) return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300";
    if (module.shared) return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300";
    return "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300";
  };

  const getBadgeText = (module: ModuleInfo & { isDefault?: boolean }) => {
    if (module.isDefault) return "Default";
    if (module.shared) return "Shared";
    return "Product";
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Modules in "{product.name}"
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {defaultModule ? '1 default module' : 'No default module'}
              {associatedModules.length > 0 && (
                <span> + {associatedModules.length} associated module{associatedModules.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!defaultModule && associatedModules.length === 0 ? (
            <div className="text-center py-8">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                No modules found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This product has no modules.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Default Module Section */}
              {defaultModule && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <CubeIcon className="h-4 w-4 text-blue-500 mr-2" />
                    Default Module
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(permanent)</span>
                  </h4>
                  <div className="bg-blue-50/70 dark:bg-blue-900/20 backdrop-blur border border-blue-200/50 dark:border-blue-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <CubeIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {defaultModule.name}
                          </h5>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                            Default
                          </span>
                        </div>
                        
                        {defaultModule.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                            {defaultModule.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          {defaultModule.requirement_count !== undefined && defaultModule.requirement_count !== null && (
                            <span className="flex items-center">
                              <span className="font-medium">Requirements:</span>
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {defaultModule.requirement_count}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleModuleClick(defaultModule.id)}
                        className="ml-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors flex-shrink-0"
                      >
                        View Module
                        <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Associated Modules Section */}
              {associatedModules.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <CubeIcon className="h-4 w-4 text-purple-500 mr-2" />
                    Associated Modules
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(can be removed)</span>
                  </h4>
                  <div className="space-y-3">
                    {associatedModules.map((module) => (
                      <div
                        key={module.id}
                        className="bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <CubeIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {module.name}
                              </h5>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getBadgeColor(module)}`}>
                                {getBadgeText(module)}
                              </span>
                            </div>
                            
                            {module.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                {module.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              {module.requirement_count !== undefined && module.requirement_count !== null && (
                                <span className="flex items-center">
                                  <span className="font-medium">Requirements:</span>
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    {module.requirement_count}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleModuleClick(module.id)}
                            className="ml-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex-shrink-0"
                          >
                            View Module
                            <ArrowTopRightOnSquareIcon className="ml-1 h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-700/70 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModulesModal;