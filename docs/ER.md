# Entity Relationship Diagram

```mermaid
---
config:
  layout: elk
title: Sample title
---
erDiagram
    WORKSPACE {
        int id PK
        string name
        datetime created_at
    }
    
    PROJECT {
        int id PK
        int workspace_id FK
        string name
        string description
        datetime created_at
    }
    
    USER {
        int id PK
        string clerk_user_id UNIQUE
        string username
        string email
        datetime created_at
        datetime last_seen_at
    }
    
    REQTREE {
        int id PK
        string name
        datetime created_at
    }
    
    COMPONENT {
        int id PK
        string name
        text description
        text rules
        boolean shared
        datetime created_at
    }
    
    REQTREEVIEW {
        int id PK
        int component_id FK
        int req_tree_id FK
        string name
        datetime created_at
    }
    
    REQ {
        int id PK
        int parent_req_id FK
        int req_tree_id FK
        string identifier
        string public_id
        string level
        string priority
        string functional
        string validation_method
        text rationale
        text notes
        datetime created_at
    }
    
    REQVERSION {
        int id PK
        int req_id FK
        int author_id FK
        string name
        text definition
        int version_number
        datetime created_at
    }
    
    PARAM {
        int id PK
        string name
        string type
        datetime created_at
    }
    
    PARAMVERSION {
        int id PK
        int param_id FK
        int author_id FK
        string name
        text description
        json value
        string group_id
        int version_number
        datetime created_at
    }
    
    TAG {
        int id PK
        string name
        string color
        datetime created_at
    }
    
    RELEASE {
        int id PK
        string name
        string public_id
        string version
        text description
        datetime release_date
        datetime created_at
    }
    
    COMMENT {
        int id PK
        int req_id FK
        int user_id FK
        text content
        datetime created_at
    }
    
    GROUP {
        int id PK
        string name
        text description
        datetime created_at
    }
    
    TESTCASE {
        int id PK
        string name
        string public_id
        string test_method
        text expected_results
        string execution_mode
        text notes
        datetime created_at
    }
    
    TESTRUN {
        int id PK
        int test_case_id FK
        int executor_id FK
        string result
        datetime executed_at
        datetime created_at
    }
    
    ASSET {
        int id PK
        int creator_id FK
        string name
        string file_path
        string file_type
        text description
        datetime created_at
    }
    
    %% Junction Tables
    PROJECTCOMPONENT {
        int project_id FK
        int component_id FK
    }
    
    REQVERSIONPARAM {
        int req_version_id FK
        int param_id FK
    }
    
    
    REQVERSIONTAG {
        int req_version_id FK
        int tag_id FK
    }
    
    PARAMVERSIONTAG {
        int param_version_id FK
        int tag_id FK
    }
    
    REQTREEVIEWPARAMVERSION {
        int req_tree_view_id FK
        int param_version_id FK
    }
    
    TESTCASEREQVERSION {
        int test_case_id FK
        int req_version_id FK
    }
    
    TESTCASEPARAMVERSION {
        int test_case_id FK
        int param_version_id FK
    }
    
    TESTCASEGROUP {
        int test_case_id FK
        int group_id FK
    }
    
    REQGROUP {
        int req_id FK
        int group_id FK
    }
    
    TESTCASETAG {
        int test_case_id FK
        int tag_id FK
    }
    
    TESTRUNASSET {
        int test_run_id FK
        int asset_id FK
    }
    
    REQVERSIONRELEASE {
        int req_version_id FK
        int release_id FK
    }
    
    PARAMVERSIONRELEASE {
        int param_version_id FK
        int release_id FK
    }
    
    %% Direct Relationships
    WORKSPACE ||--o{ PROJECT : contains
    COMPONENT ||--|| REQTREEVIEW : "is a"
    REQTREEVIEW }o--|| REQTREE : "views"
    REQTREE ||--o{ REQ : "contains"
    
    REQ ||--o{ REQ : "parent-child"
    REQ ||--o{ REQVERSION : "has versions"
    REQ ||--o{ COMMENT : "has comments"
    
    PARAM ||--o{ PARAMVERSION : "has versions"
    TESTCASE ||--o{ TESTRUN : "has runs"
    
    USER ||--o{ REQVERSION : "authors"
    USER ||--o{ PARAMVERSION : "authors"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ TESTRUN : "executes"
    USER ||--o{ ASSET : "creates"
    
    %% Many-to-Many through junction tables
    PROJECT ||--o{ PROJECTCOMPONENT : ""
    PROJECTCOMPONENT }o--|| COMPONENT : ""
    
    REQVERSION ||--o{ REQVERSIONPARAM : ""
    REQVERSIONPARAM }o--|| PARAM : ""
    
    REQVERSION ||--o{ REQVERSIONTAG : ""
    REQVERSIONTAG }o--|| TAG : ""
    
    PARAMVERSION ||--o{ PARAMVERSIONTAG : ""
    PARAMVERSIONTAG }o--|| TAG : ""
    
    REQTREEVIEW ||--o{ REQTREEVIEWPARAMVERSION : ""
    REQTREEVIEWPARAMVERSION }o--|| PARAMVERSION : ""
    
    TESTCASE ||--o{ TESTCASEREQVERSION : ""
    TESTCASEREQVERSION }o--|| REQVERSION : ""
    
    TESTCASE ||--o{ TESTCASEPARAMVERSION : ""
    TESTCASEPARAMVERSION }o--|| PARAMVERSION : ""
    
    TESTCASE ||--o{ TESTCASEGROUP : ""
    TESTCASEGROUP }o--|| GROUP : ""
    
    REQ ||--o{ REQGROUP : ""
    REQGROUP }o--|| GROUP : ""
    
    TESTCASE ||--o{ TESTCASETAG : ""
    TESTCASETAG }o--|| TAG : ""
    
    TESTRUN ||--o{ TESTRUNASSET : ""
    TESTRUNASSET }o--|| ASSET : ""
    
    REQVERSION ||--o{ REQVERSIONRELEASE : ""
    REQVERSIONRELEASE }o--|| RELEASE : ""
    
    PARAMVERSION ||--o{ PARAMVERSIONRELEASE : ""
    PARAMVERSIONRELEASE }o--|| RELEASE : ""
```