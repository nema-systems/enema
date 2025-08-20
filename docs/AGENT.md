# Agent Instructions - Requirements and ER Diagram Management

## Overview
This document describes the relationship between the requirements document (`requirements.md`) and the Entity Relationship diagram (`ER.md`) in the docs folder, and provides instructions for maintaining consistency between them.

## Files Managed
- **requirements.md**: Contains detailed business rules, constraints, and functional requirements for the Requirement Management System
- **ER.md**: Contains the Mermaid ER diagram that visually represents the database schema and relationships

## Key Responsibilities
1. **Synchronized Updates**: Whenever requirements.md is updated, the ER.md must be updated to reflect any structural changes
2. **Consistency Maintenance**: Ensure that all entities, attributes, and relationships mentioned in requirements.md are accurately represented in the ER diagram
3. **Bidirectional Validation**: Changes to either document should be validated against the other for consistency

## Current System Overview
The system manages:
- **Workspaces & Projects**: Organizational hierarchy
- **Requirements Trees & Components**: Requirement organization and sharing
- **Parameters & Versioning**: Flexible parameter management with alternatives
- **Testing Framework**: Test cases, runs, and asset management  
- **User Management**: Authorship and execution tracking
- **Tagging & Grouping**: Cross-cutting organization mechanisms

## Key Relationships to Maintain
1. **Hierarchical**: Workspace → Project → Component → ReqTreeView → ReqTree → Req
2. **Versioning**: Req → ReqVersion, Param → ParamVersion
3. **Many-to-Many**: Requirements ↔ Parameters, Test Cases ↔ Requirements/Parameters
4. **Computed Properties**: Abstract status (never stored directly)

## Update Protocol
When updating requirements:
1. Identify structural changes (new entities, attributes, relationships)
2. Update the ER diagram to reflect these changes
3. Ensure junction tables are properly represented for many-to-many relationships
4. Validate that computed properties are not represented as stored fields
5. Maintain constraint documentation in both files

## Constraints to Enforce
- Abstract status is always computed, never stored
- ReqTreeViews are immutable once created
- Parameters can be shared across requirement versions
- Components control sharing through boolean flag
- Users are optional in some relationships (executor, creator)

## Mermaid Diagram Standards
- Use junction tables for many-to-many relationships
- Include all foreign keys (FK) and primary keys (PK)
- Maintain consistent naming conventions
- Use proper cardinality notation (||--o{, }o--||, etc.)
- Group related entities logically in the diagram