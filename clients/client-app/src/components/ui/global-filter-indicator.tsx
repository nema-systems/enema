import React from 'react';
import { useGlobalFilter } from '../../contexts/global-filter-context';
import { 
  XMarkIcon,
  CubeIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline';

const GlobalFilterIndicator: React.FC = () => {
  const { filter, clearFilter, hasFilter } = useGlobalFilter();

  if (!hasFilter) {
    return null;
  }

  const { product, module } = filter;
  const activeItem = product || module;
  const itemType = product ? 'product' : 'module';
  const Icon = product ? CubeTransparentIcon : CubeIcon;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/20 border-l-4 border-indigo-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              <span className="font-medium">Global Filter:</span>{' '}
              Showing content for {itemType}{' '}
              <span className="font-semibold">{activeItem?.name}</span>
              {activeItem?.public_id && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                  {activeItem.public_id}
                </span>
              )}
            </p>
            {activeItem?.description && (
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                {activeItem.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={clearFilter}
            className="bg-indigo-50 dark:bg-indigo-950/40 rounded-md p-1.5 text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-indigo-50 dark:focus:ring-offset-indigo-950"
            title="Clear filter"
          >
            <span className="sr-only">Clear filter</span>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalFilterIndicator;