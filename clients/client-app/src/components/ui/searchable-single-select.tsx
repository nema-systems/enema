import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

export interface SelectableItem {
  id: number;
  name: string;
  description?: string;
  public_id?: string;
}

interface SearchableSingleSelectProps<T extends SelectableItem> {
  selectedItem: T | null;
  onSelectionChange: (item: T | null) => void;
  searchFunction: (query: string) => Promise<T[]>;
  placeholder?: string;
  noResultsText?: string;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  maxHeight?: string;
  clearable?: boolean;
}

const SearchableSingleSelect = <T extends SelectableItem>({
  selectedItem,
  onSelectionChange,
  searchFunction,
  placeholder = "Search and select an item...",
  noResultsText = "No items found",
  loadingText = "Searching...",
  className = "",
  disabled = false,
  maxHeight = "max-h-48",
  clearable = true
}: SearchableSingleSelectProps<T>) => {
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
        // Check if click is on the dropdown portal
        const target = event.target as Element;
        if (target.closest('[data-searchable-dropdown]')) {
          return; // Don't close if clicking inside dropdown
        }
        setIsOpen(false);
        if (!selectedItem) {
          setSearchQuery("");
        }
        setSearchResults([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedItem]);

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

  const handleItemSelect = (item: T) => {
    onSelectionChange(item);
    setIsOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClear = () => {
    onSelectionChange(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const getDisplayValue = () => {
    if (selectedItem) {
      return selectedItem.public_id 
        ? `${selectedItem.public_id} - ${selectedItem.name}` 
        : selectedItem.name;
    }
    return searchQuery;
  };

  const getPlaceholderText = () => {
    if (selectedItem) {
      return clearable ? "Click to change selection" : "Selected item";
    }
    return placeholder;
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        data-searchable-dropdown
        className="fixed bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-xl z-[9999]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`${maxHeight} overflow-y-auto`}>
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              {loadingText}
            </div>
          ) : searchResults.length === 0 && searchQuery.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {noResultsText}
            </div>
          ) : searchResults.length === 0 && !searchQuery.trim() ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Start typing to search...
            </div>
          ) : (
            searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleItemSelect(item);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50 flex items-start justify-between group transition-colors duration-150 border-b border-gray-100/50 dark:border-gray-700/50 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {item.public_id && (
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {item.public_id}
                      </span>
                    )}
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {item.name}
                    </div>
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {item.description}
                    </div>
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
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          onChange={(e) => {
            if (!selectedItem) {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (!selectedItem) {
              setIsOpen(true);
              updateDropdownPosition();
              if (searchQuery.trim()) {
                setDebouncedQuery(searchQuery);
              }
            }
          }}
          onClick={() => {
            if (selectedItem && clearable) {
              handleClear();
              setIsOpen(true);
            } else if (!selectedItem) {
              setIsOpen(true);
              updateDropdownPosition();
            }
          }}
          disabled={disabled}
          readOnly={!!selectedItem}
          className={`w-full pl-10 pr-10 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200 ${
            selectedItem ? 'cursor-pointer' : ''
          }`}
          placeholder={getPlaceholderText()}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {selectedItem && clearable ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          )}
        </div>
      </div>

      {/* Render dropdown using portal */}
      {renderDropdown()}
    </div>
  );
};

export default SearchableSingleSelect;