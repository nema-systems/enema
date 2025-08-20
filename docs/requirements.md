# Requirement Management System - Database Requirements

## Core Entities and Business Rules

### Workspace and Projects
- **Workspace**: Container for multiple projects with metadata (JSONB field reserved for future use)
- **Project**: Contains references to components (does not own ReqTrees directly), with metadata (JSONB field reserved for future use)
- **Component Sharing**: Components can be shared across multiple projects
- **Relationship**: Multiple projects can exist within each workspace

### Requirements Structure
- **Req (Requirement)**: Core requirement entity that belongs to exactly one ReqTree, contains all version information in a single table
- **Requirement Versioning**: Multiple rows in the REQ table represent different versions of the same logical requirement
- **Base Req ID**: Shared integer identifier across all versions of the same logical requirement (base_req_id field)
- **Requirement Hierarchy**: Requirements form a tree structure with parent-child relationships within a ReqTree
- **Requirement Attributes**: Requirements have base_req_id, level, priority, functional type, validation method, rationale, notes, name, definition, version information, and metadata (JSONB field reserved for future use)
- **Requirement Grouping**: Requirements can be associated with groups for organization and classification
- **ReqTree Membership**: Each requirement belongs to exactly one ReqTree (no sharing across trees)
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
- **Parameter Version Linking**: Parameters link to their previous version through prev_version field, maintaining history within the same base_param_id
- **Abstract Requirements**: A requirement is abstract if any of its associated parameters have multiple versions with the same group_id (computed, not stored)

### Trees and Views
- **ReqTree**: A standalone requirement tree structure containing requirements directly, with metadata (JSONB field reserved for future use)
- **ReqTreeView**: A filtered view of a ReqTree using specific tags as filters, with metadata (JSONB field reserved for future use)
- **Component**: A requirement tree view (ReqTreeView) with description, rules, sharing controls, and metadata (JSONB field reserved for future use)
- **Component Sharing**: Components have a shared flag - if false, only available to owning project
- **Component Rules**: Components have a rules field for filtering and business logic
- **Abstract Trees**: A ReqTree is abstract if it contains any abstract requirements (computed, not stored)

### Filtering and Views
- **Tags**: Associated with requirements, parameters, and test cases for filtering
- **ReqTreeView Filtering**: Uses parameter associations instead of tag-based filtering
- **Component Rules**: String field containing business logic and filtering rules
- **ReqTreeView Parameter Selection**: ReqTreeView directly associates with specific parameters
- **Inclusion Rule**: A requirement is included in a ReqTreeView based on component rules and parameter associations
- **Alternative Selection**: ReqTreeView must select exactly one parameter from each group_id

### Versioning and Releases
- **Requirement Versioning**: Each REQ table row represents a version with associated user (revision author) and version number
- **Requirement Version History**: Each requirement version links to the previous version with the same base_req_id through prev_version field
- **Parameter Versioning**: Each PARAM table row represents a version with associated user (revision author) and version number
- **Parameter Version History**: Each parameter version links to the previous version with the same base_param_id through prev_version field
- **Parameter Associations**: Parameters are linked to requirement versions through junction table (many-to-many with REQ table rows)
- **Parameter Sharing**: Same parameters can be associated with multiple requirement versions
- **Parameter Independence**: Parameters maintain their own versioning lifecycle separate from requirements
- **Non-versioned Entities**: ReqTree and ReqTreeView are not versioned
- **Releases**: REQ table rows and PARAM table rows can be associated with one or more releases
- **Release Hierarchy**: Releases can link to previous releases through prev_release field, maintaining release history
- **Release Draft Mode**: Releases have a draft boolean flag - when true, associated requirements and parameters can be edited; when false, they become immutable
- **Release Descriptions**: Releases have description fields for detailed release notes and metadata (JSONB field reserved for future use)
- **Release Restrictions**: Abstract ReqTrees cannot be released

### Immutability and Constraints
- **ReqTreeView Immutability**: ReqTreeViews cannot be modified once created
- **Non-abstract Constraint**: ReqTreeViews must not be abstract (computed constraint)
- **Parameter Selection**: ReqTreeView must select exactly one parameter from each group_id
- **Parameter Sharing Constraint**: Parameters can be shared across multiple requirement versions via junction table
- **Parameter Independence**: Parameters exist independently of any specific requirement version
- **Component Sharing**: Components with shared=true can be referenced by multiple projects
- **Component Ownership**: Each project has dedicated non-shared components for project-specific views
- **ReqTree Membership**: Each requirement belongs to exactly one ReqTree (1:N relationship)
- **Project Independence**: Projects access ReqTrees only through components, not directly
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
- **Local User Reference**: Lightweight User table stores Clerk user ID and basic info for foreign key relationships
- **User Synchronization**: Users are automatically created/updated in local database when they authenticate via Clerk
- **User Association**: Each version of Req and Param has an associated user via local User table reference
- **Comment Authorship**: Each comment has an associated User and timestamp
- **Test Execution**: Test runs have optional executor (User) for tracking who performed the test
- **Asset Creation**: Assets have optional creator (User) for ownership tracking
- **Clerk Integration**: Frontend uses Clerk React components, backend verifies Clerk JWT tokens
- **User Fields**: Local User table contains: id (PK), clerk_user_id (unique), username, email, created_at, last_seen_at

### Testing Framework
- **Test Cases**: Entities that define test procedures with name, method, expected results, execution mode, notes, and metadata (JSONB field reserved for future use)
- **Test Case Associations**: Test cases can be linked to requirement versions and parameters via junction tables
- **Test Case Tagging**: Test cases can be tagged for filtering and organization
- **Test Runs**: Execution instances of test cases with results, execution timestamps, optional executor, and metadata (JSONB field reserved for future use)
- **Test Run Assets**: Test runs can be associated with assets (files, documents, etc.) through junction tables
- **Asset Management**: Assets are standalone entities with file paths, types, descriptions, and optional creator

### Group Management
- **Shared Groups**: Groups are shared entities that can organize both requirements and test cases
- **Group Flexibility**: Same groups can be used for requirements and test cases for consistent organization
- **Group Structure**: Groups have names and descriptions for clear categorization

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
- **JIRA-Style IDs**: Requirements, test cases, and releases have human-readable public IDs (e.g., REQ-1, TEST-1, REL-1)
- **Workspace-Scoped Counters**: Each workspace maintains independent monotonic counters for each entity type
- **Unique Within Workspace**: Public IDs are unique within a workspace but can be duplicated across different workspaces
- **Monotonic Sequence**: Counters never reuse numbers, even after entity deletion (REQ-1 deleted → next is REQ-2, not REQ-1)
- **Database Sequences**: Implemented using PostgreSQL sequences with workspace-specific naming (e.g., ws_1_req_seq, ws_2_req_seq)
- **Auto-Generation**: Public IDs are automatically generated on entity creation using database triggers
- **Thread-Safe**: Sequence-based approach ensures concurrent insert safety
- **Public ID Format**: Prefix (REQ/TEST/REL) + hyphen + monotonic number within workspace scope
- **Cross-Project Uniqueness**: Within a workspace, REQ-1 can only exist once across all projects in that workspace