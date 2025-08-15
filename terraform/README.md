# Nema Sandbox - Terraform Infrastructure

This directory contains the Terraform configuration for deploying the Nema Sandbox infrastructure on AWS.

## 🏗️ Architecture

The infrastructure is organized into modular components:

- **Networking**: VPC, subnets, NAT gateways, routing
- **Security**: Security groups, IAM roles and policies
- **Database**: RDS PostgreSQL with enhanced monitoring
- **Container Registry**: ECR repositories for all services
- **Load Balancer**: ALB with target groups (TODO)
- **Compute**: ECS Fargate cluster and services (TODO)

## 📋 Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Docker** for building and pushing images
4. **AWS Profile** `545365949069_PowerUserAccess` configured

## 🚀 Quick Start

### 1. Setup Terraform Backend

```bash
# Create S3 bucket and DynamoDB table for state management
cd terraform/scripts
./setup-terraform-backend.sh
```

### 2. Configure Variables

```bash
# Copy and customize variables
cd terraform
cp terraform.tfvars terraform.tfvars.local

# Edit terraform.tfvars.local with your specific values
# At minimum, set:
# - db_password
# - cognito_* values (if using Cognito)
```

### 3. Deploy Infrastructure

```bash
# Run the deployment script
./scripts/terraform-deploy.sh

# Or manually:
terraform init
terraform plan
terraform apply
```

## 📁 Directory Structure

```
terraform/
├── main.tf                          # Root module
├── variables.tf                     # Input variables
├── outputs.tf                       # Output values
├── terraform.tfvars                 # Default variable values
├── backend.tf                       # Remote state configuration
├── providers.tf                     # Provider configurations
├── versions.tf                      # Version constraints
├── modules/
│   ├── networking/                  # VPC and networking
│   ├── security/                    # Security groups and IAM
│   ├── database/                    # RDS PostgreSQL
│   ├── container-registry/          # ECR repositories
│   ├── load-balancer/              # ALB (TODO)
│   └── compute/                    # ECS cluster (TODO)
└── scripts/
    ├── setup-terraform-backend.sh  # Backend setup
    └── terraform-deploy.sh         # Deployment script
```

## 🔧 Configuration

### Environment Variables

Set these environment variables or add to `terraform.tfvars.local`:

```bash
export TF_VAR_db_password="your-secure-password"
export TF_VAR_cognito_user_pool_id="us-west-2_xxxxxxxxx"
export TF_VAR_cognito_app_client_id="xxxxxxxxxxxxxxxxxx"
export TF_VAR_cognito_app_client_secret="xxxxxxxxxxxxxxxx"
export TF_VAR_jwt_secret="your-jwt-secret"
```

### Key Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_name` | Project name for resource naming | `nema-sandbox` |
| `environment` | Environment name | `production` |
| `aws_region` | AWS region | `us-west-2` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |
| `db_password` | Database password | (required) |
| `db_instance_class` | RDS instance type | `db.t3.micro` |
| `enable_multi_az` | Enable RDS Multi-AZ | `false` |

## 📊 Outputs

After deployment, Terraform provides these outputs:

- `vpc_id`: VPC identifier
- `database_endpoint`: RDS endpoint for connections
- `ecr_repository_urls`: Container registry URLs
- `nema_core_repository_url`: Main application registry

## 🔍 Management Commands

```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Show current state
terraform state list

# Show outputs
terraform output

# Destroy infrastructure (careful!)
terraform destroy
```

## 🐳 Container Images

Build and push images to ECR:

```bash
# Get login token
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-west-2.amazonaws.com

# Build and push
docker build -t $(terraform output -raw nema_core_repository_url):latest ../services/nema-core/
docker push $(terraform output -raw nema_core_repository_url):latest
```

## 🔐 Security

### State Management
- Remote state stored in encrypted S3 bucket
- State locking via DynamoDB prevents conflicts
- Sensitive outputs are marked and protected

### AWS Resources
- All resources tagged consistently
- Security groups follow least-privilege principle
- Database in private subnets only
- IAM roles use minimal required permissions

## 🚨 Current Status

### ✅ Implemented
- Networking infrastructure (VPC, subnets, routing)
- Security groups and IAM roles
- RDS PostgreSQL database
- ECR container registries
- Terraform backend and state management

### 🚧 TODO
- Application Load Balancer module
- ECS Fargate cluster and services
- Task definition templates
- Complete CI/CD integration
- Monitoring and alerting setup

## 🔄 Migration from CloudFormation

This Terraform configuration is designed to replace existing CloudFormation stacks. See `AGENT-TF.md` for detailed migration plan and cleanup procedures.

**⚠️ Important**: Do not delete CloudFormation stacks until Terraform deployment is fully tested and validated.

## 🆘 Troubleshooting

### Backend Issues
```bash
# Reinitialize backend
terraform init -reconfigure

# Check state
terraform state list
```

### State Conflicts
```bash
# Release stuck locks (use carefully)
terraform force-unlock <lock-id>
```

### Import Existing Resources
```bash
# Import existing resource
terraform import <resource_type>.<resource_name> <aws_resource_id>
```

## 📚 Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS with Terraform](https://learn.hashicorp.com/tutorials/terraform/ecs)
- [Terraform State Management](https://learn.hashicorp.com/tutorials/terraform/aws-remote)

---

For detailed implementation progress and cleanup tasks, see [AGENT-TF.md](../AGENT-TF.md).