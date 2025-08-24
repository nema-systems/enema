#!/bin/bash

# =============================================================================
# Terraform Deployment Script for Nema Sandbox
# =============================================================================

set -e

# Configuration
PROJECT_NAME="nema-sandbox"
ENVIRONMENT="production"
AWS_REGION="us-west-2"
AWS_PROFILE="545365949069_PowerUserAccess"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
        log_error "AWS CLI not configured or profile '$AWS_PROFILE' not found"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Get database password
get_db_password() {
    if [ -z "$TF_VAR_db_password" ]; then
        echo -n "Enter database password (will be hidden): "
        read -s TF_VAR_db_password
        echo
        export TF_VAR_db_password
        
        if [ ${#TF_VAR_db_password} -lt 8 ]; then
            log_error "Database password must be at least 8 characters long"
            exit 1
        fi
    fi
}

# Initialize Terraform
terraform_init() {
    log_info "Initializing Terraform..."
    
    if [ ! -f .terraform/terraform.tfstate ]; then
        terraform init
    else
        terraform init -upgrade
    fi
    
    log_success "Terraform initialized"
}

# Validate Terraform configuration
terraform_validate() {
    log_info "Validating Terraform configuration..."
    terraform validate
    log_success "Terraform configuration is valid"
}

# Plan Terraform changes
terraform_plan() {
    log_info "Planning Terraform changes..."
    terraform plan -out=tfplan
    
    echo ""
    log_warn "Review the plan above carefully!"
    echo -n "Do you want to apply these changes? (yes/no): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]es$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
}

# Apply Terraform changes
terraform_apply() {
    log_info "Applying Terraform changes..."
    terraform apply tfplan
    rm -f tfplan
    log_success "Infrastructure deployed successfully!"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get ECR repository URLs from Terraform output
    local nema_core_repo=$(terraform output -raw nema_core_repository_url 2>/dev/null || echo "")
    
    if [ -z "$nema_core_repo" ]; then
        log_warn "ECR repositories not found in Terraform output. Skipping image build."
        return 0
    fi
    
    # Login to ECR
    log_info "Logging in to Amazon ECR..."
    aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | \
        docker login --username AWS --password-stdin $(echo $nema_core_repo | cut -d'/' -f1)
    
    # Build and push nema-core
    if [ -f "../../services/nema-core/Dockerfile" ]; then
        log_info "Building and pushing nema-core image..."
        docker build -t $nema_core_repo:latest ../../services/nema-core/
        docker push $nema_core_repo:latest
        log_success "nema-core image pushed"
    fi
    
    # TODO: Build and push client images
    # for client in client-app client-landing; do
    #     if [ -f "../../clients/$client/Dockerfile" ]; then
    #         local repo_url=$(terraform output -raw ${client//-/_}_repository_url 2>/dev/null || echo "")
    #         if [ -n "$repo_url" ]; then
    #             log_info "Building and pushing $client image..."
    #             docker build -t $repo_url:latest ../../clients/$client/
    #             docker push $repo_url:latest
    #             log_success "$client image pushed"
    #         fi
    #     fi
    # done
}

# Display deployment information
show_deployment_info() {
    log_success "Deployment completed!"
    echo ""
    echo "🔗 Infrastructure Information:"
    echo "  VPC ID: $(terraform output -raw vpc_id)"
    echo "  Database Endpoint: $(terraform output -raw database_endpoint)"
    echo "  Database Port: $(terraform output -raw database_port)"
    echo "  Load Balancer DNS: $(terraform output -raw load_balancer_dns_name)"
    echo "  Load Balancer URL: $(terraform output -raw load_balancer_url)"
    echo "  ECS Cluster: $(terraform output -raw ecs_cluster_name)"
    echo ""
    echo "🐳 Container Registries:"
    terraform output ecr_repository_urls
    echo ""
    echo "🚀 Application URLs:"
    local lb_url=$(terraform output -raw load_balancer_url)
    echo "  Main App: $lb_url"
    echo "  Admin: $lb_url (use admin.* subdomain when configured)"  
    echo "  Landing: $lb_url (use landing.* subdomain when configured)"
    echo "  Temporal: $lb_url (use temporal.* subdomain when configured)"
    echo "  API Docs: $lb_url/docs"
    echo "  Health Check: $lb_url/health"
    echo ""
    echo "📊 Service Status:"
    echo "  Check ECS services in AWS Console or use:"
    echo "  aws ecs list-services --cluster $(terraform output -raw ecs_cluster_name)"
    echo ""
    echo "📝 Next Steps:"
    echo "  1. Build and push container images to ECR"
    echo "  2. Wait for ECS services to become healthy"
    echo "  3. Configure DNS records (optional)"
    echo "  4. Set up SSL certificates (optional)"
    echo ""
    echo "💡 Useful Commands:"
    echo "  terraform output                    # Show all outputs"
    echo "  terraform state list                # List all resources"
    echo "  aws ecs describe-services --cluster \$(terraform output -raw ecs_cluster_name) --services nema-core"
    echo "  terraform destroy                   # Destroy infrastructure"
}

# Main deployment function
main() {
    echo "🚀 Deploying Nema Sandbox with Terraform"
    echo ""
    
    # Change to terraform directory
    cd "$(dirname "$0")/.."
    
    check_prerequisites
    get_db_password
    terraform_init
    terraform_validate
    terraform_plan
    terraform_apply
    build_and_push_images
    show_deployment_info
}

# Handle script arguments
case "${1:-}" in
    "init")
        cd "$(dirname "$0")/.."
        terraform_init
        ;;
    "plan")
        cd "$(dirname "$0")/.."
        get_db_password
        terraform plan
        ;;
    "apply") 
        cd "$(dirname "$0")/.."
        get_db_password
        terraform apply
        ;;
    "destroy")
        cd "$(dirname "$0")/.."
        echo -n "Are you sure you want to destroy all infrastructure? (yes/no): "
        read -r response
        if [[ "$response" =~ ^[Yy]es$ ]]; then
            terraform destroy
        fi
        ;;
    *)
        main "$@"
        ;;
esac