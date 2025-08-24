#!/bin/bash

# =============================================================================
# Docker Build and Push Script for Nema Sandbox
# =============================================================================

set -e

# Configuration
PROJECT_NAME="nema-sandbox"
ENVIRONMENT="production"
AWS_REGION="us-west-2"
AWS_PROFILE="Sandbox2"  # Updated to use the correct profile
ACCOUNT_ID="545365949069"

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
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
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
    
    log_success "All prerequisites satisfied"
}

# Login to ECR
ecr_login() {
    log_info "Logging in to Amazon ECR..."
    aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | \
        docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    log_success "ECR login successful"
}

# Build and push a single service
build_and_push_service() {
    local service_name=$1
    local dockerfile_path=$2
    local context_path=$3
    
    local repository_name="$PROJECT_NAME/$ENVIRONMENT/$service_name"
    local repository_url="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$repository_name"
    
    log_info "Building $service_name for x86_64 (AWS Fargate)..."
    
    # Build the image for x86_64 architecture (required for AWS Fargate)
    docker build --platform linux/amd64 -t $repository_name:latest -f "$dockerfile_path" "$context_path"
    
    # Tag for ECR
    docker tag $repository_name:latest $repository_url:latest
    
    # Push to ECR
    log_info "Pushing $service_name to ECR..."
    docker push $repository_url:latest
    
    log_success "$service_name image built and pushed successfully"
    
    # Clean up local image to save space
    docker rmi $repository_name:latest || true
    docker rmi $repository_url:latest || true
}

# Main build and push function
build_and_push_all() {
    log_info "Building and pushing all Docker images..."
    
    # Change to the sandbox root directory
    cd "$(dirname "$0")/../.."
    
    # Validate we're in the correct directory
    if [[ ! -d "services" || ! -d "clients" ]]; then
        log_error "Invalid directory structure. Expected to find 'services' and 'clients' directories."
        log_error "Current directory: $(pwd)"
        log_error "Please run this script from the nema/sandbox directory or ensure the directory structure is correct."
        exit 1
    fi
    
    log_info "Working from directory: $(pwd)"
    
    # Build and push nema-core
    if [ -f "services/nema-core/Dockerfile" ]; then
        build_and_push_service "nema-core" "services/nema-core/Dockerfile" "services/nema-core"
    else
        log_warn "services/nema-core/Dockerfile not found, skipping nema-core"
    fi
    
    # Build and push client services
    for client in client-app client-landing; do
        if [ -f "clients/$client/Dockerfile" ]; then
            build_and_push_service "$client" "clients/$client/Dockerfile" "clients/$client"
        else
            log_warn "clients/$client/Dockerfile not found, skipping $client"
        fi
    done
    
    # Note: temporal-server uses the official Temporal image, no build needed
    log_info "temporal-server uses official temporalio/auto-setup:1.21.0 image (no build needed)"
}

# Show completion info
show_completion_info() {
    log_success "All images built and pushed successfully!"
    echo ""
    echo "🐳 Images pushed to ECR:"
    echo "  • $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/$ENVIRONMENT/nema-core:latest"
    echo "  • $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/$ENVIRONMENT/client-app:latest"
    echo "  • $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/$ENVIRONMENT/client-landing:latest"
    echo ""
    echo "🚀 ECS services should automatically restart with new images"
    echo ""
    echo "💡 Next steps:"
    echo "  1. Check ECS service status in AWS Console"
    echo "  2. Test the load balancer endpoint"
    echo "  3. Verify application health"
}

# Main function
main() {
    echo "🐳 Building and Pushing Docker Images for Nema Sandbox"
    echo ""
    
    check_prerequisites
    ecr_login
    build_and_push_all
    show_completion_info
}

# Handle script arguments
case "${1:-}" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [service-name]"
        echo ""
        echo "Build and push all Docker images to ECR, or a specific service"
        echo ""
        echo "Examples:"
        echo "  $0                    # Build and push all services"
        echo "  $0 nema-core          # Build and push only nema-core"
        echo "  $0 client-app         # Build and push only client-app"
        echo ""
        exit 0
        ;;
    "")
        main
        ;;
    *)
        # Build specific service
        service_name=$1
        echo "🐳 Building and Pushing $service_name"
        echo ""
        
        check_prerequisites
        ecr_login
        
        cd "$(dirname "$0")/../.."
        
        # Validate we're in the correct directory
        if [[ ! -d "services" || ! -d "clients" ]]; then
            log_error "Invalid directory structure. Expected to find 'services' and 'clients' directories."
            log_error "Current directory: $(pwd)"
            log_error "Please run this script from the nema/sandbox directory or ensure the directory structure is correct."
            exit 1
        fi
        
        log_info "Working from directory: $(pwd)"
        
        case "$service_name" in
            "nema-core")
                build_and_push_service "nema-core" "services/nema-core/Dockerfile" "services/nema-core"
                ;;
            "client-app"|"client-landing")
                build_and_push_service "$service_name" "clients/$service_name/Dockerfile" "clients/$service_name"
                ;;
            *)
                log_error "Unknown service: $service_name"
                log_info "Available services: nema-core, client-app, client-landing"
                exit 1
                ;;
        esac
        
        log_success "$service_name built and pushed successfully!"
        ;;
esac