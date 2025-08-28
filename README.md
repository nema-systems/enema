# Enema

> A modern requirements management platform built for engineering teams

Enema provides a comprehensive solution for managing requirements, organizing products, and tracking development progress with hierarchical modules, version control, and collaborative workflows.

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

## 🏗️ Architecture

### Technology Stack
- **Backend**: FastAPI (Python) with async/await
- **Frontend**: React with TypeScript and Vite
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Clerk for user management
- **Orchestration**: Temporal for workflows
- **Deployment**: Docker containers on AWS ECS

### Core Components
```
Workspace → Product → Module → Requirements
    └─ Users (via Organizations)
```

- **Workspaces**: Top-level isolation boundaries
- **Products**: Project containers with default modules
- **Modules**: Hierarchical requirement organization
- **Requirements**: Versioned specifications with metadata
- **Organizations**: Multi-tenant access control

### API Overview
```
GET    /api/v1/workspaces/{id}/products     # List products
POST   /api/v1/workspaces/{id}/products     # Create product
GET    /api/v1/workspaces/{id}/modules      # List modules
GET    /api/v1/workspaces/{id}/requirements # List requirements
POST   /api/v1/workspaces/{id}/requirements # Create requirement
```

All endpoints are workspace-scoped and require authentication.

## 👩‍💻 Development

### Development Workflow

1. **Backend Development**
   ```bash
   cd services/nema-core
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend Development**
   ```bash
   cd clients/client-app
   npm install
   npm run dev
   ```

3. **Database Setup**
   ```bash
   docker-compose up -d postgres
   # Database will be automatically initialized
   ```

### Port Reference
| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API | 8000 | http://localhost:8000 |
| Database | 5432 | postgres://nema:nema_password@localhost:5432/nema |
| Temporal UI | 8088 | http://localhost:8088 |

## 📊 API Documentation

### Authentication
All API requests require a Bearer token from Clerk authentication.

```bash
# Get authentication token (development)
curl -X POST "http://localhost:8000/api/dev/get-clerk-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@nemasystems.io","password":"dev"}'
```

### Core Endpoints

#### Products
```bash
# List products in workspace
GET /api/v1/workspaces/{workspace_id}/products

# Create product with default module
POST /api/v1/workspaces/{workspace_id}/products
{
  "name": "My Product",
  "description": "Product description",
  "create_default_module": true
}
```

#### Requirements
```bash
# List requirements in workspace
GET /api/v1/workspaces/{workspace_id}/requirements?module_id=1

# Create requirement
POST /api/v1/workspaces/{workspace_id}/requirements
{
  "module_id": 1,
  "name": "User Authentication",
  "definition": "System shall authenticate users via OAuth",
  "level": "L1",
  "priority": "high",
  "functional": "functional",
  "validation_method": "test",
  "status": "draft"
}
```

**Interactive API Documentation:** http://localhost:8000/api/docs

## 🚀 Deployment

### AWS Production Deployment

Enema includes complete infrastructure as code for AWS deployment.

**What you get:**
- Auto-scaling ECS Fargate services
- RDS PostgreSQL with backups
- Application Load Balancer
- CloudWatch monitoring
- Container registry (ECR)


#### Deploy to AWS

1. **Setup Terraform backend**
   ```bash
   cd terraform/scripts
   ./setup-terraform-backend.sh
   ```

2. **Configure secrets**
   ```bash
   cp terraform.tfvars.local.example terraform.tfvars.local
   # Edit terraform.tfvars.local with your Clerk keys and AWS settings
   ```

3. **Deploy**
   ```bash
   ./scripts/terraform-deploy.sh
   ```

4. **Update services**
   ```bash
   ./scripts/update-services.sh
   ```

## 📁 Documentation

- [Complete Project Guide](COMPREHENSIVE_GUIDE.md) - Detailed documentation including troubleshooting and advanced configuration
- [Database Schema](docs/database-schema.md) - Entity relationship diagrams and data model
- [API Requirements](docs/api-layer-requirements.md) - Detailed API specifications and requirements
- [Development Authentication](docs/dev-api-authentication.md) - Development and testing authentication guide
