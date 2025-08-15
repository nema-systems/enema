#!/bin/bash

# =============================================================================
# Full Deployment Script for Nema Sandbox
# Builds containers -> Pushes to ECR -> Runs Terraform -> Updates ECS services
# =============================================================================

set -e

# Configuration
PROJECT_NAME="nema-sandbox"
ENVIRONMENT="production"
AWS_REGION="us-west-2"
AWS_PROFILE="Sandbox2"
ACCOUNT_ID="545365949069"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check required tools
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws")
    fi
    
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
        log_error "AWS CLI not configured or profile '$AWS_PROFILE' not found"
        log_info "Please configure AWS CLI with: aws configure --profile $AWS_PROFILE"
        exit 1
    fi
    
    # Check Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Build and push Docker images
build_and_push_images() {
    log_step "Building and pushing Docker images..."
    
    # Navigate to terraform scripts directory and run the build script
    cd "$(dirname "$0")"/../terraform/scripts
    
    if [ ! -f "./build-and-push-images.sh" ]; then
        log_error "build-and-push-images.sh not found in terraform/scripts"
        exit 1
    fi
    
    # Make executable if needed
    chmod +x ./build-and-push-images.sh
    
    # Run the build script
    ./build-and-push-images.sh
    
    log_success "All Docker images built and pushed"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_step "Deploying infrastructure with Terraform..."
    
    cd "$(dirname "$0")"/../terraform
    
    # Check if terraform.tfvars.local exists
    if [ ! -f "terraform.tfvars.local" ]; then
        log_warn "terraform.tfvars.local not found. Creating from example..."
        
        if [ -f "terraform.tfvars.local.example" ]; then
            cp terraform.tfvars.local.example terraform.tfvars.local
            log_info "Please edit terraform.tfvars.local with your values"
            log_info "Press Enter to continue after editing, or Ctrl+C to exit"
            read
        else
            log_error "terraform.tfvars.local.example not found"
            exit 1
        fi
    fi
    
    # Get database password if not set
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
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan changes
    log_info "Planning Terraform changes..."
    terraform plan -out=tfplan
    
    echo ""
    log_warn "Review the plan above carefully!"
    echo -n "Do you want to apply these changes? (yes/no): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]es$ ]]; then
        log_info "Infrastructure deployment cancelled by user"
        rm -f tfplan
        return 1
    fi
    
    # Apply changes
    log_info "Applying Terraform changes..."
    terraform apply tfplan
    rm -f tfplan
    
    log_success "Infrastructure deployed successfully"
}

# Update ECS services to use new images
update_ecs_services() {
    log_step "Updating ECS services to use new container images..."
    
    # Get ECS cluster name from Terraform output
    cd "$(dirname "$0")"/../terraform
    
    local cluster_name=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "nema-sandbox-production-cluster")
    
    if [ -z "$cluster_name" ]; then
        log_error "Could not get ECS cluster name from Terraform output"
        return 1
    fi
    
    log_info "Updating services in cluster: $cluster_name"
    
    # List of services to update
    local services=(
        "nema-sandbox-production-nema-core"
        "nema-sandbox-production-client-app"
        "nema-sandbox-production-client-admin"
        "nema-sandbox-production-client-landing"
    )
    
    # Update each service
    for service in "${services[@]}"; do
        log_info "Updating service: $service"
        
        # Check if service exists
        if aws ecs describe-services --cluster "$cluster_name" --services "$service" --region "$AWS_REGION" --profile "$AWS_PROFILE" --query 'services[0].serviceName' --output text 2>/dev/null | grep -q "$service"; then
            
            # Force new deployment to pull latest images
            aws ecs update-service \
                --cluster "$cluster_name" \
                --service "$service" \
                --force-new-deployment \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE" \
                --query 'service.serviceName' \
                --output text > /dev/null
            
            log_success "Updated service: $service"
        else
            log_warn "Service not found: $service (may not be deployed yet)"
        fi
    done
    
    log_success "All ECS services updated"
}

# Wait for services to stabilize
wait_for_services() {
    log_step "Waiting for ECS services to stabilize..."
    
    cd "$(dirname "$0")"/../terraform
    local cluster_name=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "nema-sandbox-production-cluster")
    
    local services=(
        "nema-sandbox-production-nema-core"
        "nema-sandbox-production-client-app"
    )
    
    log_info "Waiting for critical services to become stable (timeout: 10 minutes)..."
    
    for service in "${services[@]}"; do
        if aws ecs describe-services --cluster "$cluster_name" --services "$service" --region "$AWS_REGION" --profile "$AWS_PROFILE" --query 'services[0].serviceName' --output text 2>/dev/null | grep -q "$service"; then
            
            log_info "Waiting for $service to stabilize..."
            
            # Wait for service to be stable (max 10 minutes)
            if aws ecs wait services-stable \
                --cluster "$cluster_name" \
                --services "$service" \
                --region "$AWS_REGION" \
                --profile "$AWS_PROFILE" \
                --cli-read-timeout 600 \
                --cli-connect-timeout 60; then
                log_success "$service is stable"
            else
                log_warn "$service did not stabilize within timeout (check AWS Console)"
            fi
        fi
    done
}

# Health check
health_check() {
    log_step "Performing health checks..."
    
    cd "$(dirname "$0")"/../terraform
    
    # Get load balancer URL
    local lb_url=$(terraform output -raw load_balancer_url 2>/dev/null || echo "")
    
    if [ -z "$lb_url" ]; then
        log_warn "Could not get load balancer URL from Terraform output"
        return 1
    fi
    
    log_info "Testing health endpoints..."
    
    # Test main health endpoint
    if curl -f -s "$lb_url/health" > /dev/null; then
        log_success "Main health endpoint responding"
    else
        log_warn "Main health endpoint not responding (may still be starting up)"
    fi
    
    # Test API health endpoint  
    if curl -f -s "$lb_url/api/health" > /dev/null; then
        log_success "API health endpoint responding"
    else
        log_warn "API health endpoint not responding (may still be starting up)"
    fi
    
    # Test API docs
    if curl -f -s "$lb_url/api/docs" > /dev/null; then
        log_success "API documentation accessible"
    else
        log_warn "API documentation not accessible (may still be starting up)"
    fi
}

# Show deployment summary
show_deployment_summary() {
    log_step "Deployment Summary"
    
    cd "$(dirname "$0")"/../terraform
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "🔗 Infrastructure Information:"
    terraform output -raw load_balancer_url 2>/dev/null && echo "  Load Balancer URL: $(terraform output -raw load_balancer_url)"
    terraform output -raw database_endpoint 2>/dev/null && echo "  Database Endpoint: $(terraform output -raw database_endpoint)"
    terraform output -raw ecs_cluster_name 2>/dev/null && echo "  ECS Cluster: $(terraform output -raw ecs_cluster_name)"
    echo ""
    echo "🚀 Application URLs:"
    local lb_url=$(terraform output -raw load_balancer_url 2>/dev/null || echo "")
    if [ -n "$lb_url" ]; then
        echo "  Main App: $lb_url"
        echo "  API Docs: $lb_url/api/docs"
        echo "  Health Check: $lb_url/api/health"
    fi
    echo ""
    echo "📊 Service Status:"
    echo "  Check ECS services in AWS Console or run:"
    echo "  aws ecs list-services --cluster $(terraform output -raw ecs_cluster_name 2>/dev/null || echo 'CLUSTER_NAME')"
    echo ""
    echo "💡 Next Steps:"
    echo "  1. Services may take a few minutes to fully start up"
    echo "  2. Check service health with: curl $lb_url/api/health"
    echo "  3. Monitor ECS services in AWS Console"
    echo "  4. Check application logs if needed"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 Full Nema Sandbox Deployment"
    echo "================================="
    echo ""
    echo "This will:"
    echo "  1. Build all Docker containers"
    echo "  2. Push images to AWS ECR"
    echo "  3. Deploy/update infrastructure with Terraform"
    echo "  4. Update ECS services with new images"
    echo "  5. Perform health checks"
    echo ""
    echo -n "Continue? (yes/no): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]es$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    echo ""
    
    # Change to script directory
    cd "$(dirname "$0")"
    
    # Execute deployment steps
    check_prerequisites
    build_and_push_images
    
    # Deploy infrastructure (may be cancelled by user)
    if deploy_infrastructure; then
        update_ecs_services
        wait_for_services
        health_check
        show_deployment_summary
    else
        log_info "Skipping service updates since infrastructure deployment was cancelled"
    fi
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Full deployment script for Nema Sandbox"
        echo ""
        echo "Commands:"
        echo "  (no args)     Full deployment (build + terraform + update services)"
        echo "  build         Build and push Docker images only"
        echo "  terraform     Run Terraform deployment only"
        echo "  services      Update ECS services only"
        echo "  health        Perform health checks only"
        echo "  help          Show this help"
        echo ""
        echo "Environment Variables:"
        echo "  TF_VAR_db_password    Database password (optional, will prompt if not set)"
        echo ""
        exit 0
        ;;
    "build")
        check_prerequisites
        build_and_push_images
        ;;
    "terraform")
        check_prerequisites  
        deploy_infrastructure
        ;;
    "services")
        check_prerequisites
        update_ecs_services
        wait_for_services
        ;;
    "health")
        health_check
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Run '$0 help' for usage information"
        exit 1
        ;;
esac