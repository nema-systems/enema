# Requirements Views Usage

This document explains how to use the new requirements views system that provides list, tree, and graph visualizations.

## Overview

The requirements views system consists of:

1. **RequirementsViews** - Main component with three view modes
2. **RequirementsViewsPage** - Standalone page for requirements
3. **ModuleRequirements** - Component for module-specific requirements
4. **ProductRequirements** - Component for product-specific requirements

## View Modes

### List View
- Traditional table/list display with search and filtering
- Server-side search across name, definition, and public_id
- Filters: status, priority, level, functional type
- Pagination and sorting support

### Tree View  
- Hierarchical display showing parent-child relationships
- Collapsible/expandable nodes
- Visual indentation based on hierarchy depth
- Same filtering as list view

### Graph View
- React Flow based visual graph with dagre layout
- Nodes colored by priority and status
- Edges show parent-child relationships
- Interactive pan/zoom controls

## Components

### RequirementsViews

Main component that provides all three views:

```tsx
import RequirementsViews from "../components/requirements/requirements-views";

<RequirementsViews 
  workspaceId={workspaceId}
  moduleId={moduleId} // Optional - filter by specific module
  productId={productId} // Optional - filter by product modules
  className="custom-styles"
/>
```

### Standalone Page

```tsx
// Route: /workspace/:workspaceId/requirements
// Supports URL params: ?module=123&product=456
import RequirementsViewsPage from "./requirements-views-page";
```

### Module Integration

```tsx
import ModuleRequirements from "../components/modules/module-requirements";

<ModuleRequirements 
  workspaceId={workspaceId}
  moduleId={moduleId}
/>
```

### Product Integration

```tsx
import ProductRequirements from "../components/products/product-requirements";

<ProductRequirements 
  workspaceId={workspaceId}
  productId={productId}
/>
```

## API Enhancements

The requirements API now supports:

- `product_id` parameter for filtering by product modules
- `search` parameter for full-text search
- Enhanced search across name, definition, and public_id fields

Example API calls:
```
GET /api/v1/workspaces/123/requirements/?product_id=456
GET /api/v1/workspaces/123/requirements/?module_id=789
GET /api/v1/workspaces/123/requirements/?search=login&status=approved
```

## Features

### Search & Filtering
- Real-time search with debouncing
- Status filter (draft, approved, rejected, obsolete)
- Priority filter (critical, high, medium, low)  
- Level filter (L0-L5)
- Functional type filter (functional, non-functional)

### View Switching
- Toggle between list, tree, and graph views
- State maintained during view switches
- Responsive design for mobile/tablet

### Interactive Features
- Clickable requirement cards
- Module navigation links
- Expandable tree nodes
- Graph pan/zoom/fit-to-view

## Integration Examples

### In Module Details Page
```tsx
const ModuleDetailsPage = () => {
  return (
    <div>
      {/* Module info */}
      <ModuleHeader />
      
      {/* Requirements for this module */}
      <ModuleRequirements 
        workspaceId={workspaceId}
        moduleId={moduleId}
      />
    </div>
  );
};
```

### In Product Details Page
```tsx
const ProductDetailsPage = () => {
  return (
    <div>
      {/* Product info */}
      <ProductHeader />
      
      {/* Requirements across all product modules */}
      <ProductRequirements 
        workspaceId={workspaceId}
        productId={productId}
      />
    </div>
  );
};
```

### Filtering by URL Parameters
```tsx
// URL: /workspace/123/requirements?product=456&status=approved&view=graph
// The component automatically picks up URL parameters for initial state
```

## Future Enhancements

- Requirement creation/editing within views
- Drag-and-drop hierarchy management in tree view
- Export functionality (PDF, CSV)
- Real-time collaboration features
- Custom view configurations
- Advanced graph layouts (force-directed, circular)