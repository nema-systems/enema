# Enema

> A modern requirements management platform built for engineering teams

Enema provides a comprehensive solution for managing requirements, organizing products, and tracking development progress with hierarchical modules, version control, and collaborative workflows.

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Development](#-development)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Documentation](#-documentation)

---

## ✨ Features

### Core Capabilities
- 🏗️ **Hierarchical Organization** - Products contain modules in a tree structure for logical organization
- 📋 **Requirements Management** - Full CRUD operations with versioning and status tracking
- 🔐 **Enterprise Authentication** - Clerk integration with organization-level access control
- 🚀 **Modern Stack** - FastAPI backend, React frontend, PostgreSQL database
- 📊 **RESTful API** - Complete OpenAPI documentation with workspace-scoped endpoints
- 🐳 **Containerized** - Docker Compose setup for development and production
- ☁️ **Cloud Ready** - AWS ECS Fargate deployment with Terraform

### Built for Teams
- **Multi-tenancy** - Organization and workspace isolation
- **Role-based Access** - Granular permissions for different user types
- **Collaborative** - Multiple users can work on requirements simultaneously
- **Audit Trail** - Full version history and change tracking
- **Scalable** - Designed to handle enterprise-scale requirement sets

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for backend development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/nema-systems/enema.git
   cd enema
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - **Main Dashboard**: http://localhost:3000
   - **API Documentation**: http://localhost:8000/api/docs
   - **Landing Page**: http://localhost:3002
   - **Temporal UI**: http://localhost:8088

4. **Login credentials**
   ```
   Username: admin@nema.io
   Password: password123
   ```

### Production Deployment

See [Deployment Guide](#-deployment) for AWS ECS deployment instructions.


## 🏗️ Architecture

### System Components

#### Core Services

- **nema-core**: Python FastAPI service (artifact management, auth, workflows, projects)
- **postgres**: PostgreSQL database with schemas for nema, auth, temporal, embeddings
- **temporal**: Workflow orchestration engine
- **client-app**: React frontend dashboard with project and artifact management
- **client-landing**: Marketing landing page

#### Database Schema

- **workspace**: Workspace-level isolation and permissions
- **product**: Product organization and management
- **module**: Hierarchical module system for requirement organization
- **req**: Requirements with versioning and metadata
- **user**: User management with Clerk integration
- **organization**: Organization-level multi-tenancy

#### API Architecture

- **SQLAlchemy Models**: Proper ORM with relationships and constraints
- **Pydantic Schemas**: Request/response validation with type safety
- **FastAPI Routes**: RESTful endpoints with authentication middleware
- **Database Sessions**: Async session management with connection pooling

### Project Structure

```
enema/
├── docker-compose.yml              # Local development
├── services/nema-core/              # Unified backend service
│   ├── src/
│   │   ├── main.py                  # FastAPI application
│   │   ├── api/v1/                  # API endpoints
│   │   │   ├── products.py          # Product management
│   │   │   ├── requirements.py      # Requirements management
│   │   │   └── modules.py           # Module management
│   │   ├── auth/                    # Authentication
│   │   ├── database/                # Database models and sessions
│   │   └── config/                  # Configuration management
├── clients/                         # Frontend applications
│   ├── client-app/                  # Main React dashboard
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
- **Authentication** via Clerk (external SaaS)
- **IAM roles** with least-privilege access
- **CloudWatch** monitoring and logging

#### Services Configuration

1. **nema-core** (512 CPU, 1024 MB) - FastAPI backend, 2 instances
2. **client-app** (256 CPU, 512 MB) - React frontend, 1 instance
3. **client-landing** (256 CPU, 512 MB) - Landing page, 1 instance
4. **temporal-server** (512 CPU, 1024 MB) - Workflow engine, 1 instance
5. **temporal-webui** (256 CPU, 512 MB) - Temporal monitoring, 1 instance

#### Load Balancer Routing

- **/** → nema-core (API and default)
- **/landing** → client-landing
- **/temporal** → temporal-webui
- **/api/**, **/docs**, **/health** → nema-core

---

#### Creating Products

**Via Frontend:**

1. Go to http://localhost:3000 (or production URL)
2. Login with credentials
3. Click "Create Product" in the Products card
4. Enter product name and description
5. Configure default module settings

**Via API:**

```bash
curl -X POST http://localhost:8000/api/v1/workspaces/1/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My Product",
    "description": "Product description",
    "create_default_module": true
  }'
```

#### Product-Module Architecture

- **Hierarchical Structure**: Products contain modules in a tree structure
- **Default Module**: Each product can have a default module for requirements
- **Recursive Modules**: Modules can contain sub-modules for organization
- **Requirement Assignment**: Requirements belong to specific modules
- **Database Integrity**: Enforced referential integrity between products, modules, and requirements

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

- Verify Clerk configuration and API keys are correct
- Check JWT token validation and signature

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
