# Modal Creation Guidelines

This document explains the standard approach for creating modals in the `/src/components/modals/` directory. All modals should follow these consistent patterns for layout, functionality, and user experience.

## 📁 File Structure and Naming Conventions

Create modal components in the `src/components/modals/` directory following these naming rules:

### Naming Rules:
1. **Unified Modals** (supporting both create and edit): Use entity name only
   - `product-modal.tsx` (for creating and editing products)
   - `module-modal.tsx` (for creating and editing modules) 
   - `user-modal.tsx` (for creating and editing users)

2. **Creation-Only Modals**: Use `entity-creation-modal.tsx`
   - `req-collection-creation-modal.tsx`
   - `test-cases-creation-modal.tsx`

3. **Specialized Modals**: Use descriptive names
   - `confirmation-modal.tsx`
   - `settings-modal.tsx`
   - `import-data-modal.tsx`

### Current Modal Files:
- `product-modal.tsx` (unified create/edit)
- `module-modal.tsx` (unified create/edit) 
- `req-collection-modal.tsx` (unified create/edit)
- `test-cases-modal.tsx` (unified create/edit)

## 🔄 Unified Create/Edit Modals

For entities that support both creation and editing, use a single modal component that adapts based on props:

### Key Features:
- **Single Component**: One modal handles both create and edit operations
- **Conditional Behavior**: Form validation and UI elements adapt based on edit mode
- **Dynamic Titles**: Modal title changes ("Create New X" vs "Edit X")
- **Context-Aware Validation**: Different validation rules for create vs edit
- **Selective UI Elements**: Hide/show sections based on operation mode

### Implementation Pattern:
```typescript
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EntityFormData) => Promise<void>;
  isLoading?: boolean;
  // Edit mode support
  editEntity?: Entity | null;  // Pass entity to edit, null for create
}

// Usage for creating
<EntityModal 
  isOpen={isCreateOpen}
  onClose={() => setIsCreateOpen(false)}
  onSubmit={handleCreate}
  // editEntity is undefined = create mode
/>

// Usage for editing  
<EntityModal 
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  onSubmit={handleEdit}
  editEntity={selectedEntity}  // Pass entity = edit mode
/>
```

### Modal Behavior:
- **Create Mode**: `editEntity` is null/undefined
  - Show all form sections and options
  - Validate all required fields
  - Submit button: "Create [Entity]"

- **Edit Mode**: `editEntity` contains the entity to edit
  - Pre-populate form with existing data
  - Hide immutable sections (e.g., initial setup options)
  - Context-aware validation
  - Submit button: "Save Changes"

## 🏗️ Standard Modal Structure

### 1. Imports and Types

```typescript
import { useState } from "react";
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from "@heroicons/react/24/outline";
import { /* Relevant icons */ } from "@heroicons/react/24/solid";

interface YourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: YourFormData) => Promise<void>;
  isLoading?: boolean;
  // Additional props as needed
}

export interface YourFormData {
  // Define form fields
}
```

### 2. Component Setup

```typescript
const YourModal = ({ isOpen, onClose, onSubmit, isLoading = false }: YourModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<YourFormData>({
    // Initialize form data
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Form validation and submission logic
  // Close handler with cleanup
  
  if (!isOpen) return null;
```

### 3. Modal Layout Structure

All modals must follow this exact structure:

```typescript
return (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm h-full w-full z-50 flex items-center justify-center p-4">
    <div className={`relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-xl shadow-2xl flex flex-col ${
      isFullscreen 
        ? 'w-full max-w-4xl h-[90vh]' 
        : 'w-full max-w-lg max-h-[90vh]'
    }`}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
        {/* Header content */}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Form content */}
      </div>

      {/* Fixed Footer */}
      <div className="p-6 border-t border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
        {/* Footer buttons */}
      </div>
    </div>
  </div>
);
```

## 🎯 Required Features

### 1. Fixed Header
- Always visible at the top
- Contains modal title and action buttons
- Includes fullscreen toggle and close button

```typescript
<div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
    Your Modal Title
  </h3>
  <div className="flex items-center space-x-2">
    <button
      onClick={() => setIsFullscreen(!isFullscreen)}
      disabled={isLoading}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 p-1"
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? (
        <ArrowsPointingInIcon className="h-5 w-5" />
      ) : (
        <ArrowsPointingOutIcon className="h-5 w-5" />
      )}
    </button>
    <button
      onClick={handleClose}
      disabled={isLoading}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 p-1"
    >
      <XMarkIcon className="h-6 w-6" />
    </button>
  </div>
</div>
```

### 2. Scrollable Content Area
- Flexible height that grows to fill available space
- Scrolls independently when content overflows
- Adapts layout for fullscreen mode

```typescript
<div className="flex-1 overflow-y-auto">
  <div className={`p-6 ${isFullscreen ? 'grid grid-cols-2 gap-6' : ''}`}>
    <div className={`space-y-4 ${isFullscreen ? 'col-span-2' : ''}`}>
      {/* Form fields go here */}
    </div>
  </div>
</div>
```

### 3. Fixed Footer
- Always visible at the bottom
- Contains action buttons (Cancel, Submit)
- Maintains consistent button styling

```typescript
<div className="p-6 border-t border-gray-200/30 dark:border-gray-700/30 flex-shrink-0">
  <form onSubmit={handleSubmit}>
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-700/70 backdrop-blur border border-gray-300/50 dark:border-gray-600/50 rounded-lg shadow-sm hover:bg-gray-50/80 dark:hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-200"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600/90 hover:bg-indigo-700/90 backdrop-blur border border-transparent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/50 disabled:opacity-50 flex items-center transition-all duration-200"
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        Create {/* Your Entity Name */}
      </button>
    </div>
  </form>
</div>
```

### 4. Fullscreen Mode
- Toggle between normal (max-w-lg) and fullscreen (max-w-4xl) modes
- In fullscreen mode, content spans the full width (col-span-2)
- No placeholder boxes or empty space in fullscreen mode

## 🎨 Styling Standards

### Design System
- **Glassmorphism**: Use backdrop-blur effects with semi-transparent backgrounds
- **Dark Mode**: Support both light and dark themes
- **Colors**: Consistent color palette using Tailwind classes
- **Borders**: Semi-transparent borders with appropriate opacity
- **Shadows**: Use shadow-2xl for modal containers

### Input Styling
```typescript
className={`w-full px-3 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:text-white ${
  errors.fieldName ? 'border-red-500/70' : 'border-gray-300/50 dark:border-gray-600/50'
} disabled:opacity-50 placeholder:text-gray-400/70 transition-all duration-200`}
```

### Information Boxes
Use colored information boxes for helpful context:

```typescript
<div className="bg-blue-50/70 dark:bg-blue-900/30 backdrop-blur border border-blue-200/40 dark:border-blue-800/40 rounded-lg p-4">
  <div className="flex items-start">
    <div className="ml-0 text-sm">
      <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
        📋 Title
      </p>
      <p className="text-blue-700 dark:text-blue-300">
        Description text
      </p>
    </div>
  </div>
</div>
```

## ✅ Form Validation

### Validation Pattern
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const newErrors: {[key: string]: string} = {};
  
  if (!formData.requiredField.trim()) {
    newErrors.requiredField = "Field is required";
  }
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  setErrors({});
  await onSubmit(formData);
};
```

### Error Display
```typescript
{errors.fieldName && (
  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fieldName}</p>
)}
```

## 🔧 State Management

### Required State
- `isFullscreen`: Boolean for fullscreen mode toggle
- `formData`: Form field values
- `errors`: Validation error messages

### Cleanup on Close
Always reset form state when closing:

```typescript
const handleClose = () => {
  if (!isLoading) {
    setFormData({ /* reset to initial state */ });
    setErrors({});
    onClose();
  }
};
```

## 📱 Responsive Behavior

- **Mobile**: Modals should be responsive with proper padding (p-4)
- **Desktop**: Use appropriate max-widths
- **Fullscreen**: Expands to max-w-4xl with better space utilization
- **Height**: Always use max-h-[90vh] to prevent overflow

## 🚫 Common Mistakes to Avoid

1. **Don't use placeholder boxes in fullscreen mode** - Let content span the full width
2. **Don't put forms inside the content area** - Keep form submission in the footer
3. **Don't forget loading states** - Always disable buttons and show loading indicators
4. **Don't skip validation** - Always validate required fields
5. **Don't forget cleanup** - Reset state when closing modals

## 🔄 Updating These Guidelines

**⚠️ Important**: This document should be updated whenever modal patterns or standards change. When making changes to the modal system:

1. Update this document first to reflect new patterns
2. Update existing modals to follow new standards
3. Ensure all new modals follow the updated guidelines
4. Test changes across all screen sizes and modes

## 📚 Reference Examples

See these existing modals for reference implementations:

### Unified Create/Edit Modals:
- `module-modal.tsx` - **BEST EXAMPLE** of unified create/edit modal
  - Supports both module creation and editing
  - Conditional form sections based on mode
  - Context-aware validation
  - Dynamic title and button text

### Additional Unified Create/Edit Modals:
- `product-modal.tsx` - Form with automatic base module/req collection creation + optional shared module selection
- `req-collection-modal.tsx` - Simple form with name and description
- `test-cases-modal.tsx` - Complex form with dropdowns, steps, and expected results

### When to Use Each Pattern:
- **Unified Modal**: Default choice for all entities that need both create and edit functionality
- **Creation-Only**: Only use when entity creation and editing require completely different interfaces

---

*Last updated: 2024-08-24 - Updated all modals to use unified create/edit pattern with new naming conventions*
*If you modify the modal patterns, please update this document accordingly.*