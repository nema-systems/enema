# Nema Sandbox - Complete Project Guide

A comprehensive data platform with artifact management, project organization, workflow orchestration, and AI capabilities. This guide consolidates all project information including development, deployment, and operational procedures.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Current Status](#current-status)
- [Architecture](#architecture)
- [Development Guide](#development-guide)
- [Deployment Options](#deployment-options)
- [Project Management](#project-management)
- [API Documentation](#api-documentation)
- [Infrastructure Details](#infrastructure-details)
- [Troubleshooting](#troubleshooting)
- [Security & Performance](#security--performance)
- [Cost Management](#cost-management)

---

## 📖 Project Overview

### What is Nema Sandbox?

A complete data science platform that provides:

- **Project Management**: Organize work into projects with proper isolation
- **Artifact Management**: Track data artifacts, models, and analysis results with full metadata
- **Workflow Orchestration**: Temporal-based workflow engine for data processing
- **Authentication**: AWS Cognito integration with role-based access control
- **REST API**: Full FastAPI backend with OpenAPI documentation
- **Modern Frontend**: React-based dashboard with project and artifact management
- **Containerized Architecture**: Full Docker Compose setup for development and production

### Key Features ✅

- **Project Organization**: Create and manage projects, select projects for artifact creation
- **Artifact Management**: Full CRUD operations with PostgreSQL persistence
- **Authentication**: AWS Cognito integration with JWT tokens
- **Database**: PostgreSQL with proper schemas (nema, auth, temporal, embeddings)
- **API**: FastAPI backend with complete OpenAPI documentation
- **Frontend**: React dashboard with project and artifact management UI
- **Containerization**: Complete Docker Compose setup for all services
- **Production Ready**: AWS ECS Fargate deployment with Terraform

---

## 🚀 Quick Start

### Local Development

```bash
# Start all services
docker-compose up -d

# Access the applications
# Main Dashboard: http://localhost:3000
# API Documentation: http://localhost:8000/api/docs
# Landing Page: http://localhost:3002
# Temporal UI: http://localhost:8088
# Database: postgres://nema:nema_password@localhost:5432/nema

# Login credentials
# Username: admin@nema.io
# Password: password123
```

### Production Deployment (AWS)

```bash
# Setup Terraform backend
cd terraform/scripts && ./setup-terraform-backend.sh

# Configure secrets
cd ../ && cp terraform.tfvars.local.example terraform.tfvars.local
# Edit terraform.tfvars.local with your values

# Deploy infrastructure
./scripts/terraform-deploy.sh

# Update services after code changes
./scripts/update-services.sh
```

---

### 🔄 Currently Active Services

#### Production URLs

- **Main Application**: http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com
- **Admin Panel**: http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/admin
- **Landing Page**: http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/landing
- **API Docs**: http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/api/docs
- **Health Check**: http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/api/health

#### Infrastructure Status

- **ECS Cluster**: `nema-sandbox-production-cluster` ✅ Running
- **Database**: `nema-sandbox-production.cluster-xyz.us-west-2.rds.amazonaws.com` ✅ Operational
- **Load Balancer**: `nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com` ✅ Active
- **Container Images**: All latest images built and deployed ✅

---

## 🏗️ Architecture

### System Components

#### Core Services

- **nema-core**: Python FastAPI service (artifact management, auth, workflows, projects)
- **postgres**: PostgreSQL database with schemas for nema, auth, temporal, embeddings
- **temporal**: Workflow orchestration engine
- **client-app**: React frontend dashboard with project and artifact management
- **client-admin**: React admin panel
- **client-landing**: Marketing landing page

#### Database Schema

- **nema.artifacts**: Core artifact storage with metadata and project relationships
- **nema.projects**: Project organization and workspace management
- **auth.tenants**: Multi-tenancy support for organizations
- **auth.workspaces**: Workspace-level isolation and permissions
- **temporal.**: Workflow execution state and history
- **embeddings.artifact_embeddings**: Vector embeddings for semantic search

#### API Architecture

- **SQLAlchemy Models**: Proper ORM with relationships and constraints
- **Pydantic Schemas**: Request/response validation with type safety
- **FastAPI Routes**: RESTful endpoints with authentication middleware
- **Database Sessions**: Async session management with connection pooling

### Project Structure

```
sandbox/
├── docker-compose.yml              # Local development
├── services/nema-core/              # Unified backend service
│   ├── src/
│   │   ├── main.py                  # FastAPI application
│   │   ├── artifacts/               # Artifact management
│   │   ├── projects/                # Project management (NEW)
│   │   ├── auth/                    # Authentication
│   │   ├── database/                # Database models and sessions
│   │   └── config/                  # Configuration management
├── clients/                         # Frontend applications
│   ├── client-app/                  # Main React dashboard
│   ├── client-admin/                # Admin panel
│   └── client-landing/              # Landing page
├── terraform/                       # Infrastructure as Code
│   ├── modules/                     # Terraform modules
│   └── scripts/                     # Deployment scripts
├── scripts/                         # Development and deployment scripts
│   └── update-services.sh           # ECS service update script
└── docs/                           # Documentation
```

---

## 👩‍💻 Development Guide

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for client development)
- Python 3.11+ (for core service development)
- AWS CLI (for production deployment)
- Terraform >= 1.0 (for infrastructure)

### Local Development Setup

#### Starting Services

```bash
# Start all services
docker-compose up -d
```

#### Development Workflows

#### Port Reference

- **3000**: React frontend dashboard (client-app)
- **3001**: Admin panel (client-admin)
- **3002**: Landing page (client-landing)
- **8000**: FastAPI backend API (nema-core)
- **8088**: Temporal Web UI
- **5432**: PostgreSQL database
- **7233**: Temporal gRPC

---

## 🚀 Deployment Options

### 1. AWS with Terraform (Production) ⭐

**Cost**: ~$170/month • **Setup**: 10 minutes • **Scalability**: High

#### Full Deployment Process

```bash
# 1. Setup Terraform backend
cd terraform/scripts
./setup-terraform-backend.sh

# 2. Configure secrets
cd ../
cp terraform.tfvars.local.example terraform.tfvars.local
# Edit terraform.tfvars.local with your values

# 3. Deploy infrastructure
./scripts/terraform-deploy.sh

# 4. Update services after code changes
./scripts/update-services.sh

# 5. Check deployment status
terraform output
```

#### What Gets Deployed

- **ECS Fargate Cluster** with 6 services (auto-scaling)
- **Application Load Balancer** with intelligent routing
- **RDS PostgreSQL** (managed database with backups)
- **ECR Repositories** for container images
- **VPC** with proper networking and security groups
- **Cognito User Pool** for authentication
- **IAM roles** with least-privilege access
- **CloudWatch** monitoring and logging

#### Services Configuration

1. **nema-core** (512 CPU, 1024 MB) - FastAPI backend, 2 instances
2. **client-app** (256 CPU, 512 MB) - React frontend, 1 instance
3. **client-admin** (256 CPU, 512 MB) - Admin panel, 1 instance
4. **client-landing** (256 CPU, 512 MB) - Landing page, 1 instance
5. **temporal-server** (512 CPU, 1024 MB) - Workflow engine, 1 instance
6. **temporal-webui** (256 CPU, 512 MB) - Temporal monitoring, 1 instance

#### Load Balancer Routing

- **/** → nema-core (API and default)
- **/admin** → client-admin
- **/landing** → client-landing
- **/temporal** → temporal-webui
- **/api/**, **/docs**, **/health** → nema-core

---

#### Creating Projects

**Via Frontend:**

1. Go to http://localhost:3000 (or production URL)
2. Login with credentials
3. Click "Create Project" in the Projects card
4. Enter project name and description

**Via API:**

```bash
curl -X POST http://localhost:8000/api/projects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Project",
    "description": "Project description",
    "tenant_id": "default",
    "workspace_id": "default"
  }'
```

#### Project Selection

- **UI Integration**: Projects card shows all available projects
- **Visual Selection**: Click any project to select it for artifact creation
- **Current Selection**: Artifacts card displays which project is selected
- **Automatic Loading**: Projects load automatically when user logs in

#### Project-Artifact Relationship

- All artifacts must belong to a project
- Project selection is required for artifact creation
- Projects provide organizational structure for data assets
- Database enforces referential integrity between projects and artifacts

---

## 📋 API Documentation

#### Authentication

```bash
# Login
POST /api/auth/login
{
  "username": "admin@nema.io",
  "password": "password123"
}

# Get current user
GET /api/auth/me
Authorization: Bearer <token>

# Health check
GET /api/auth/health
```

#### System Health

```bash
# Service health check
GET /api/health

# Individual service health
GET /api/auth/health
GET /api/workflows/health
GET /api/data/health
GET /api/ai/health
GET /api/admin/health
```

### Authentication Flow

```bash
# 1. Login to get access token
LOGIN_RESPONSE=$(curl -s -X POST \
  http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@nema.io", "password": "password123"}')

# 2. Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

# 3. Use token for protected endpoints
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8000/api/projects/
```

---

## 🛠️ Infrastructure Details

### AWS Resources

#### Terraform Infrastructure (Current)

- **Networking**: VPC (10.0.0.0/16), public/private subnets, NAT gateways
- **Security**: Security groups, IAM roles with least privilege
- **Database**: RDS PostgreSQL 15.8 with enhanced monitoring
- **Container Registry**: ECR repositories with lifecycle policies
- **Load Balancer**: ALB with target groups and health checks
- **Compute**: ECS Fargate cluster with auto-scaling services
- **Monitoring**: CloudWatch logs and metrics

### Container Images

All images built for linux/amd64 and pushed to ECR:

- `545365949069.dkr.ecr.us-west-2.amazonaws.com/nema-sandbox/production/nema-core:latest`
- `545365949069.dkr.ecr.us-west-2.amazonaws.com/nema-sandbox/production/client-app:latest`
- `545365949069.dkr.ecr.us-west-2.amazonaws.com/nema-sandbox/production/client-admin:latest`
- `545365949069.dkr.ecr.us-west-2.amazonaws.com/nema-sandbox/production/client-landing:latest`

### Service Updates

Use the auto-update script for easy deployments:

```bash
# Update all services
./scripts/update-services.sh

# Update specific services
./scripts/update-services.sh nema-core client-app

# Update and wait for stability
./scripts/update-services.sh --wait
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failures

**Symptoms**: Login returns 500 errors or invalid credentials
**Solutions**:

- Ensure SECRET_HASH is calculated correctly in cognito.py
- Verify IAM role has Cognito permissions

#### 2. Database Connection Issues

**Symptoms**: 500 errors on protected endpoints
**Solutions**:

- Check RDS instance status in AWS Console
- Verify security group rules allow ECS access
- Test database connectivity: `docker-compose exec postgres psql -U nema -d nema`
- Review CloudWatch logs for connection errors

#### 3. Service Health Check Failures

**Symptoms**: ECS services showing unhealthy
**Solutions**:

- Check target group health in ALB console
- Verify service is listening on correct port (8000 for nema-core)
- Review ECS task logs: `docker-compose logs -f nema-core`
- Ensure container has proper health check endpoint

#### 4. Frontend Issues

**Symptoms**: Blank pages or JavaScript errors
**Solutions**:

- Check if using production build (not dev mode)
- Verify API URL configuration in `.env.production`
- Check allowedHosts in vite.config.ts
- Review browser console for CORS or fetch errors

#### 5. Project Management Issues

**Symptoms**: Projects not loading or creation failing
**Solutions**:

- Verify projects API endpoints: `GET /api/projects/`
- Check database for projects table: `SELECT * FROM nema.projects;`
- Ensure user authentication token is valid
- Review backend logs for SQL errors

### Monitoring and Logs

#### CloudWatch Log Groups

- `/aws/ecs/nema-sandbox-production/nema-core` - Core service logs
- `/aws/ecs/nema-sandbox-production/client-app` - Frontend logs
- `/aws/rds/instance/nema-sandbox-production/postgresql` - Database logs

#### Health Check URLs

```bash
# Primary health check
curl http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/api/health

# Individual service health
curl http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/api/auth/health
curl http://nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com/api/projects/
```
