# Agent Instructions - Database Documentation Management

## Overview
This document describes the relationship between the database requirements document and the database schema diagram in the docs folder, and provides instructions for maintaining consistency between them.

## Files Managed
- **data-layer-requirements.md**: Contains detailed business rules, constraints, and functional requirements for the database layer
- **database-schema.md**: Contains the Mermaid ER diagram that visually represents the database schema and relationships
- **api-layer-requirements.md**: Contains API endpoint specifications and interface requirements

## Key Responsibilities
1. **Synchronized Updates**: Whenever data-layer-requirements.md is updated, the database-schema.md must be updated to reflect any structural changes
2. **Consistency Maintenance**: Ensure that all entities, attributes, and relationships mentioned in data-layer-requirements.md are accurately represented in the database schema diagram
3. **Bidirectional Validation**: Changes to either document should be validated against the other for consistency
4. **Multi-Layer Coordination**: Ensure API layer requirements align with data layer capabilities

## Current System Overview
The system manages:
- **Organizations & Workspaces**: Multi-tenant organizational hierarchy with flexible access control
- **Users & Membership**: Enhanced user profiles with organization membership and role-based access
- **Requirements Collections & Modules**: Requirement organization with explicit selection via junction tables
- **Parameters & Versioning**: Flexible parameter management with alternatives and version history
- **Testing Framework**: Test cases, runs, and asset management with public ID tracking
- **Releases**: Module-based releases with draft mode and hierarchy
- **Tagging & Grouping**: Workspace-scoped organization mechanisms

## Key Relationships to Maintain
1. **Multi-Tenant Hierarchy**: Organization → User (membership) → Workspace (access) → Product → Module → ReqCollection → Req
2. **Versioning**: Collapsed versioning with base_req_id/base_param_id and prev_version linking
3. **Explicit Selection**: Module uses junction tables to select specific requirements and parameters
4. **Workspace Scoping**: All entities properly scoped to workspace with junction table workspace_id fields
5. **Computed Properties**: Abstract status (never stored directly)

## Update Protocol
When updating data layer requirements:
1. Identify structural changes (new entities, attributes, relationships)
2. Update the database schema diagram to reflect these changes
3. Ensure junction tables use proper naming convention ({PARENT}_{CHILD_PLURAL})
4. Include workspace_id in all junction tables for workspace isolation
5. Validate that computed properties are not represented as stored fields
6. Maintain constraint documentation in both files
7. Update API layer requirements if data changes affect endpoints

## Constraints to Enforce
- Abstract status is always computed, never stored
- Modules cannot be modified once created (business rule)
- Parameters can be shared across requirement versions via junction tables
- Modules control sharing through boolean flag
- Users are optional in some relationships (executor, creator, owner)
- Workspace scoping must be maintained across all relationships
- Public IDs must be unique within workspace scope
- Soft delete consistency for user-related entities
- Draft releases allow editing, published releases are immutable

## Database Schema Standards
- Use junction tables for many-to-many relationships with {PARENT}_{CHILD_PLURAL} naming
- Include all foreign keys (FK) and primary keys (PK)
- Add workspace_id to all junction tables for isolation
- Use proper cardinality notation (||--o{, }o--||, etc.)
- Group related entities logically in the diagram
- Include metadata JSONB fields for future extensibility
- Use consistent data types (jsonb for JSON data)
- Document composite unique constraints for public IDs
- Maintain soft delete fields where appropriate