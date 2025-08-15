-- Initialize Nema database with required extensions and schemas
-- This script runs when the Postgres container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector (embeddings)

-- Create separate schemas for different services
CREATE SCHEMA IF NOT EXISTS nema;           -- Main application data
CREATE SCHEMA IF NOT EXISTS temporal;       -- Temporal workflow data  
CREATE SCHEMA IF NOT EXISTS auth;           -- Authentication/user data
CREATE SCHEMA IF NOT EXISTS embeddings;     -- Vector embeddings

-- Set search path to include all schemas
ALTER DATABASE nema SET search_path = nema,temporal,auth,embeddings,public;

-- Switch to nema schema for main tables
SET search_path = nema,public;

-- Create main application tables
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id VARCHAR(100) NOT NULL,
    workspace_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    global_id BIGINT UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    artifact_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'NEVER_RAN',
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    commit_hash VARCHAR(64) UNIQUE NOT NULL,
    message TEXT,
    author_email VARCHAR(255),
    committed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_group_id UUID REFERENCES groups(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Switch to embeddings schema for vector data
SET search_path = embeddings,public;

CREATE TABLE IF NOT EXISTS artifact_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_global_id BIGINT NOT NULL,
    text_content TEXT,
    embedding vector(1536),  -- OpenAI embedding dimension
    model_name VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artifacts_global_id ON nema.artifacts(global_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON nema.artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON nema.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_artifact_id ON embeddings.artifact_embeddings(artifact_global_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings.artifact_embeddings USING hnsw (embedding vector_cosine_ops);

-- Switch to auth schema for user/tenant data
SET search_path = auth,public;

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) REFERENCES tenants(tenant_id),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, workspace_id)
);

-- Create initial tenant and workspace for development
INSERT INTO auth.tenants (tenant_id, name, domain) 
VALUES ('default', 'Default Tenant', 'localhost') 
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO auth.workspaces (workspace_id, tenant_id, name)
VALUES ('default', 'default', 'Default Workspace')
ON CONFLICT (tenant_id, workspace_id) DO NOTHING;

-- Reset search path
SET search_path = nema,temporal,auth,embeddings,public;

-- Grant permissions (for development - be more restrictive in production)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA nema TO nema;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA temporal TO nema;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO nema;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA embeddings TO nema;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA nema TO nema;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA temporal TO nema;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO nema;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA embeddings TO nema;