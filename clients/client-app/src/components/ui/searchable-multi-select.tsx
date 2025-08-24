import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";

export interface SelectableItem {
  id: number;
  name: string;
  description?: string;
}

interface SearchableMultiSelectProps<T extends SelectableItem> {
  selectedItems: T[];
  onSelectionChange: (items: T[]) => void;
  searchFunction: (query: string) => Promise<T[]>;
  placeholder?: string;
  noResultsText?: string;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
}

const SearchableMultiSelect = <T extends SelectableItem>({
  selectedItems,
  onSelectionChange,
  searchFunction,
  placeholder = "Search and select items...",
  noResultsText = "No items found",
  loadingText = "Searching...",
  className = "",
  disabled = false,
  maxHeight = "max-h-48"
}: SearchableMultiSelectProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<{top: number; left: number; width: number}>({top: 0, left: 0, width: 0});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchFunction(debouncedQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchFunction]);

  // Update dropdown position when opened
  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update position when dropdown opens or window resizes
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      
      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  const handleItemToggle = (item: T) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      // Remove item
      onSelectionChange(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      // Add item
      onSelectionChange([...selectedItems, item]);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    onSelectionChange(selectedItems.filter(selected => selected.id !== itemId));
  };

  const isItemSelected = (item: T) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  const filteredResults = searchResults.filter(
    result => !selectedItems.some(selected => selected.id === result.id)
  );

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        className="fixed bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-xl z-[9999]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
        }}
      >
        <div className={`${maxHeight} overflow-y-auto`}>
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              {loadingText}
            </div>
          ) : filteredResults.length === 0 && searchQuery.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {noResultsText}
            </div>
          ) : filteredResults.length === 0 && !searchQuery.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Start typing to search...
            </div>
          ) : (
            filteredResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemToggle(item)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50 flex items-start justify-between group transition-colors duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {item.description}
                    </div>
                  )}
                </div>
                <div className="ml-2 flex-shrink-0">
                  {isItemSelected(item) ? (
                    <CheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <div className="h-4 w-4 border border-gray-300 dark:border-gray-600 rounded group-hover:border-indigo-500 transition-colors duration-150"></div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Selected Items Tags */}
      {selectedItems.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
            >
              <span className="mr-1">{item.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                disabled={disabled}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            updateDropdownPosition();
            if (searchQuery.trim()) {
              // Re-trigger search if there's already a query
              setDebouncedQuery(searchQuery);
            }
          }}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <ChevronDownIcon 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </div>
      </div>

      {/* Render dropdown using portal */}
      {renderDropdown()}
    </div>
  );
};

export default SearchableMultiSelect;