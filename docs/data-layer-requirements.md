# Requirement Management System - Database Requirements

## Core Entities and Business Rules

### Workspace and Products
- **Workspace**: Container for multiple products with metadata (JSONB field reserved for future use)
- **Product**: Contains hierarchical modules with an optional default module, with metadata (JSONB field reserved for future use)
- **Module Sharing**: Modules can be shared across multiple products
- **Relationship**: Multiple products can exist within each workspace

### Requirements Structure
- **Req (Requirement)**: Core requirement entity that belongs to exactly one Module, contains all version information in a single table
- **Requirement Versioning**: Multiple rows in the REQ table represent different versions of the same logical requirement
- **Base Req ID**: Shared integer identifier across all versions of the same logical requirement (base_req_id field)
- **Module Membership**: Each requirement belongs to exactly one Module (no sharing across modules)
- **Requirement Attributes**: Requirements have base_req_id, level, priority, functional type, validation method, status, name, definition, version information, and metadata (JSONB field reserved for future use)
- **Requirement Ownership**: Requirements have author (creator) relationship to User table
- **Requirement Grouping**: Requirements can be associated with tags for organization and classification
- **Comments**: Associated with requirements, contain text, ID, timestamp, author (User), and metadata (JSONB field reserved for future use)
- **Version Management**: Each requirement version has an associated user (revision author) and version number
- **Version Linking**: Requirements link to their previous version through prev_version field, maintaining history within the same base_req_id

### Parameters and Alternatives
- **Parameters**: Standalone entities that can be shared across multiple requirement versions, contains all version information in a single table, with metadata (JSONB field reserved for future use)
- **Parameter Versioning**: Multiple rows in the PARAM table represent different versions of the same logical parameter
- **Base Param ID**: Shared integer identifier across all versions of the same logical parameter (base_param_id field)
- **Parameter Sharing**: Parameters are linked to requirement versions through a junction table (many-to-many relationship with REQ table)
- **Parameter Independence**: Parameters exist independently and can be reused across different requirement versions
- **Parameter Groups**: Parameters have a group_id to identify alternatives
- **Parameter Alternatives**: Multiple parameter versions with the same group_id represent alternatives
- **Parameter Value Storage**: Parameters store values as JSONB to support all common primitives (string, number, boolean, arrays) with type field for validation and UI rendering
- **Parameter Version Linking**: Parameters link to their previous version through prev_version field, maintaining history within the same base_param_id
- **Abstract Requirements**: A requirement is abstract if any of its associated parameters have multiple versions with the same group_id (computed, not stored)

### Module Hierarchy
- **Module**: A workspace-scoped requirement container with hierarchical structure, includes description, sharing controls, and metadata (JSONB field reserved for future use)
- **Module Hierarchy**: Modules can contain sub-modules through parent_module_id relationships
- **Module Sharing**: Modules have a shared flag - if false, only available within their workspace context
- **Product Default Module**: Each product has an optional default module for primary requirements
- **Recursive Structure**: Modules can be nested to create organizational hierarchies

### Views and Selection
- **Tags**: Workspace-scoped entities associated with requirements, parameters, and test cases for organizational filtering
- **Module Selection**: Uses junction tables to explicitly select which requirements and parameters are included in the module view
- **Module Rules**: String field containing business logic and validation rules for the view
- **Module Requirement Selection**: Module explicitly associates with specific requirements via COMPONENTREQ junction table
- **Module Parameter Selection**: Module explicitly associates with specific parameters via COMPONENTPARAM junction table
- **Alternative Selection**: Module must select exactly one parameter from each group_id for concrete views

### Versioning and Releases
- **Requirement Versioning**: Each REQ table row represents a version with associated user (revision author) and version number
- **Requirement Version History**: Each requirement version links to the previous version with the same base_req_id through prev_version field
- **Parameter Versioning**: Each PARAM table row represents a version with associated user (revision author) and version number
- **Parameter Version History**: Each parameter version links to the previous version with the same base_param_id through prev_version field
- **Parameter Associations**: Parameters are linked to requirement versions through junction table (many-to-many with REQ table rows)
- **Parameter Sharing**: Same parameters can be associated with multiple requirement versions
- **Parameter Independence**: Parameters maintain their own versioning lifecycle separate from requirements
- **Non-versioned Entities**: ReqCollection and Module are not versioned
- **Releases**: Workspace-scoped entities that belong to a specific module and can be associated with REQ table rows and PARAM table rows
- **Release Module Association**: Each release belongs to exactly one module within the workspace
- **Release Hierarchy**: Releases can link to previous releases through prev_release field, maintaining release history within the workspace
- **Release Draft Mode**: Releases have a draft boolean flag - when true, associated requirements and parameters can be edited; when false, they become immutable
- **Release Descriptions**: Releases have description fields for detailed release notes and metadata (JSONB field reserved for future use)
- **Release Restrictions**: Abstract ReqCollections cannot be released

### Immutability and Constraints
- **Module Immutability**: Modules cannot be modified once created (if needed for business rules)
- **Non-abstract Constraint**: Modules must not be abstract (computed constraint)
- **Parameter Selection**: Module must select exactly one parameter from each group_id
- **Parameter Sharing Constraint**: Parameters can be shared across multiple requirement versions via junction table
- **Parameter Independence**: Parameters exist independently of any specific requirement version
- **Module Sharing**: Modules with shared=true can be referenced by multiple products
- **Default Module Rule**: Each product automatically gets a base/default module (shared=false) for product-specific requirements
- **System Module Rule**: All modules not created as the product's default module must be shared (shared=true) to enable reuse across products
- **Module Ownership**: Each product has exactly one dedicated non-shared module (the default/base module) for product-specific views
- **ReqCollection Membership**: Each requirement belongs to exactly one ReqCollection (1:N relationship)
- **Product Independence**: Products access ReqCollections only through modules, not directly
- **No Direct Abstract Storage**: Abstract status is never stored directly but always computed from parameter alternatives
- **Test Run Uniqueness**: Each test run belongs to exactly one test case
- **Asset Reusability**: Assets can be associated with multiple test runs
- **Test Case Flexibility**: Test cases can be associated with multiple requirement versions and parameters
- **Group Sharing**: Groups can be shared between requirements and test cases for consistent organization
- **Optional User Fields**: Test run executor and asset creator are optional for flexible usage
- **Requirement Attributes**: Requirements must have level, priority, functional type, validation method for completeness
- **Release Draft Constraints**: Requirements and parameters associated with draft releases can be modified; those in non-draft releases are immutable

### User Management
- **External User Provider**: User authentication and management handled by Clerk (3rd party service)
- **Enhanced User Profile**: User table stores Clerk user ID, email, first_name, last_name, image_url, and soft delete flag
- **User Synchronization**: Users are automatically created/updated in local database when they authenticate via Clerk
- **User Association**: Each version of Req and Param has an associated user via local User table reference
- **Comment Authorship**: Each comment has an associated User and timestamp
- **Test Execution**: Test runs have optional executor (User) for tracking who performed the test
- **Asset Creation**: Assets have optional creator (User) for ownership tracking
- **Clerk Integration**: Frontend uses Clerk React modules, backend verifies Clerk JWT tokens
- **Soft Delete**: Users marked as deleted instead of hard deleted for data integrity

### Organization Management
- **Clerk Organization Integration**: Organizations synchronized with Clerk's organization system via clerk_org_id
- **Organization Membership**: Users belong to organizations with specific roles (admin, member, etc.)
- **Multi-Organization Support**: Users can be members of multiple organizations with different roles
- **Organization Profile**: Organizations have name, image_url, and soft delete capabilities
- **Role-Based Access**: Organization membership roles control user permissions within the organization

### Organization-Workspace Access Control
- **Flexible Access Model**: Organizations can access multiple workspaces through junction table
- **Workspace Permissions**: Each organization-workspace relationship has specific role permissions
- **Multi-Tenant Access**: Multiple organizations can access the same workspace with different permission levels
- **Access Roles**: Organization-workspace access controlled by role field (owner, admin, contributor, viewer)
- **Access Management**: Soft delete capability for access relationships without losing audit trail

### Testing Framework
- **Test Cases**: Workspace-scoped entities that define test procedures with name, method, expected results, execution mode, notes, and metadata (JSONB field reserved for future use)
- **Test Case Associations**: Test cases can be linked to requirement versions and parameters via junction tables within the same workspace
- **Test Case Tagging**: Test cases can be tagged for filtering and organization using workspace-scoped tags
- **Test Runs**: Execution instances of test cases with results, execution timestamps, optional executor, and metadata (JSONB field reserved for future use)
- **Test Run Assets**: Test runs can be associated with workspace-scoped assets (files, documents, etc.) through junction tables
- **Asset Management**: Assets are workspace-scoped entities with file paths, types, descriptions, and optional creator

### Group Management
- **Workspace-Scoped Groups**: Groups are workspace-scoped entities that can organize both requirements and test cases within the same workspace
- **Group Flexibility**: Same groups can be used for requirements and test cases for consistent organization within a workspace
- **Group Structure**: Groups have names, descriptions, and workspace_id for clear categorization and isolation

### Testing Relationships
- **Test Case → Requirement Versions**: Many-to-many relationship for traceability
- **Test Case → Parameters**: Many-to-many relationship for parameter-specific testing
- **Test Case → Groups**: Many-to-many relationship for flexible grouping (shared with requirements)
- **Test Case → Tags**: Many-to-many relationship for filtering and categorization
- **Test Case → Test Runs**: One-to-many relationship (test case can have multiple runs)
- **Test Run → Assets**: Many-to-many relationship for evidence and documentation
- **Test Run → User**: Optional many-to-one relationship for executor tracking
- **Asset → User**: Optional many-to-one relationship for creator tracking
- **Requirement → Groups**: Many-to-many relationship for requirement organization

### Public Identifier Management
- **JIRA-Style IDs**: Requirements, test cases, releases, and assets have human-readable public IDs (e.g., REQ-1, TEST-1, REL-1, ASSET-1)
- **Workspace-Scoped Counters**: Each workspace maintains independent monotonic counters for each entity type
- **Unique Within Workspace**: Public IDs are unique within a workspace but can be duplicated across different workspaces
- **Database Constraints**: Composite unique constraints ensure workspace-scoped uniqueness:
  - REQ: UNIQUE(req_collection_id→workspace_id, public_id) 
  - TESTCASE: UNIQUE(workspace_id, public_id)
  - RELEASE: UNIQUE(module_id→workspace_id, public_id)
  - ASSET: UNIQUE(workspace_id, public_id)
- **Monotonic Sequence**: Counters never reuse numbers, even after entity deletion (REQ-1 deleted → next is REQ-2, not REQ-1)
- **Database Sequences**: Implemented using PostgreSQL sequences with workspace-specific naming (e.g., ws_1_req_seq, ws_2_req_seq)
- **Auto-Generation**: Public IDs are automatically generated on entity creation using database triggers
- **Thread-Safe**: Sequence-based approach ensures concurrent insert safety
- **Public ID Format**: Prefix (REQ/TEST/REL/ASSET) + hyphen + monotonic number within workspace scope
- **Cross-Product Uniqueness**: Within a workspace, REQ-1, TEST-1, REL-1, ASSET-1 can only exist once across all products in that workspace