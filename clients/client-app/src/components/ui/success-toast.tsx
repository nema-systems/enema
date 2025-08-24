import { useEffect, useState } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { CubeIcon, CubeTransparentIcon, EyeIcon } from "@heroicons/react/24/outline";

interface CreatedResource {
  type: 'module' | 'req_collection';
  id: number;
  name: string;
}

interface SuccessToastProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  createdResources?: CreatedResource[];
  onViewRequirements?: () => void;
  onViewModules?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SuccessToast = ({ 
  isVisible, 
  onClose, 
  title, 
  message, 
  createdResources = [],
  onViewRequirements,
  onViewModules,
  autoClose = true,
  autoCloseDelay = 5000 
}: SuccessToastProps) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  if (!isVisible && !isClosing) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
    }`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="flex items-start p-4">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {message}
            </p>

            {/* Created Resources */}
            {createdResources.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Automatically created:
                </p>
                <div className="space-y-1">
                  {createdResources.map((resource, index) => (
                    <div key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      {resource.type === 'module' ? (
                        <CubeIcon className="h-4 w-4 mr-2 text-blue-500" />
                      ) : (
                        <CubeTransparentIcon className="h-4 w-4 mr-2 text-green-500" />
                      )}
                      <span className="truncate">{resource.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {(onViewRequirements || onViewModules) && (
              <div className="mt-4 flex space-x-2">
                {onViewRequirements && (
                  <button
                    onClick={() => {
                      onViewRequirements();
                      handleClose();
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View Requirements
                  </button>
                )}
                {onViewModules && (
                  <button
                    onClick={() => {
                      onViewModules();
                      handleClose();
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <CubeIcon className="h-3 w-3 mr-1" />
                    View Modules
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress bar (for auto-close) */}
        {autoClose && isVisible && !isClosing && (
          <div className="h-1 bg-gray-200 dark:bg-gray-700">
            <div 
              className="h-full bg-green-500 transition-all ease-linear"
              style={{ 
                width: '100%',
                animation: `shrink ${autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default SuccessToast;