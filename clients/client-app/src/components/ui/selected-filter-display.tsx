import React from 'react';
import { useGlobalFilter } from '../../contexts/global-filter-context';
import { 
  CubeIcon,
  CubeTransparentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SelectedFilterDisplayProps {
  collapsed?: boolean;
}

const SelectedFilterDisplay: React.FC<SelectedFilterDisplayProps> = ({ collapsed = false }) => {
  const { filter, clearFilter, hasFilter } = useGlobalFilter();

  if (!hasFilter) {
    return null;
  }

  const { product, module } = filter;
  const activeItem = product || module;
  const itemType = product ? 'Product' : 'Module';
  const Icon = product ? CubeTransparentIcon : CubeIcon;

  if (collapsed) {
    // Collapsed view - just show the icon
    return (
      <div className="px-2 py-3 mb-3">
        <div className="flex justify-center">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
            <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 mb-3">
      <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start min-w-0 flex-1">
            <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-indigo-800 dark:text-indigo-200 uppercase tracking-wide">
                {itemType}
              </div>
              <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 truncate mt-0.5">
                {activeItem?.name}
              </div>
              {activeItem?.public_id && (
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {activeItem.public_id}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={clearFilter}
            className="ml-2 p-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded transition-colors flex-shrink-0"
            title="Clear filter"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectedFilterDisplay;