#!/bin/bash

# =============================================================================
# ECS Services Auto-Update Script
# Forces ECS services to pull latest Docker images and redeploy
# =============================================================================

set -e

# Configuration
PROJECT_NAME="nema-sandbox"
ENVIRONMENT="production"
AWS_REGION="us-west-2"
AWS_PROFILE="Sandbox2"
CLUSTER_NAME="nema-sandbox-production-cluster"

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

# Show help
show_help() {
    echo "ECS Services Auto-Update Script"
    echo ""
    echo "Usage: $0 [OPTIONS] [SERVICE_NAMES...]"
    echo ""
    echo "Options:"
    echo "  --wait, -w      Wait for services to stabilize after update"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Update all services"
    echo "  $0 --wait                    # Update all services and wait"
    echo "  $0 nema-core client-app      # Update specific services"
    echo "  $0 -w nema-core              # Update nema-core and wait"
    echo ""
    echo "Available services:"
    echo "  - nema-core"
    echo "  - client-app"
    echo "  - client-admin"
    echo "  - client-landing"
    echo "  - temporal-server"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
        log_error "AWS CLI not configured or profile '$AWS_PROFILE' not found"
        log_info "Please configure AWS CLI with: aws configure --profile $AWS_PROFILE"
        exit 1
    fi
    
    log_success "All prerequisites satisfied"
}

# Get full service name
get_service_name() {
    local service_short_name=$1
    echo "${PROJECT_NAME}-${ENVIRONMENT}-${service_short_name}"
}

# Update a single ECS service
update_service() {
    local service_short_name=$1
    local service_name=$(get_service_name $service_short_name)
    
    log_info "Updating service: $service_name"
    
    # Check if service exists
    if aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'services[0].serviceName' \
        --output text 2>/dev/null | grep -q "$service_name"; then
        
        # Force new deployment
        if aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$service_name" \
            --force-new-deployment \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE" \
            --query 'service.serviceName' \
            --output text > /dev/null; then
            
            log_success "Successfully triggered update for: $service_short_name"
            return 0
        else
            log_error "Failed to update service: $service_short_name"
            return 1
        fi
    else
        log_warn "Service not found: $service_short_name (may not be deployed yet)"
        return 1
    fi
}

# Wait for service to stabilize
wait_for_service() {
    local service_short_name=$1
    local service_name=$(get_service_name $service_short_name)
    
    log_info "Waiting for $service_short_name to stabilize..."
    
    if aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --cli-read-timeout 600 \
        --cli-connect-timeout 60; then
        log_success "$service_short_name is stable"
        return 0
    else
        log_warn "$service_short_name did not stabilize within timeout (check AWS Console)"
        return 1
    fi
}

# Get service status
get_service_status() {
    local service_short_name=$1
    local service_name=$(get_service_name $service_short_name)
    
    local status=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$service_name" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'services[0].deployments[?status==`PRIMARY`].{Running:runningCount,Desired:desiredCount}[0]' \
        --output json 2>/dev/null)
    
    if [ "$status" != "null" ] && [ "$status" != "" ]; then
        echo "$status"
    else
        echo '{"Running": 0, "Desired": 0}'
    fi
}

# Show deployment summary
show_summary() {
    local services=("$@")
    
    log_step "Deployment Summary"
    echo ""
    echo "🚀 Service Status:"
    
    for service in "${services[@]}"; do
        local status=$(get_service_status $service)
        local running=$(echo $status | grep -o '"Running":[0-9]*' | cut -d':' -f2)
        local desired=$(echo $status | grep -o '"Desired":[0-9]*' | cut -d':' -f2)
        
        if [ "$running" = "$desired" ] && [ "$running" -gt 0 ]; then
            echo "  ✅ $service: $running/$desired tasks running"
        elif [ "$running" -lt "$desired" ]; then
            echo "  🔄 $service: $running/$desired tasks running (deploying...)"
        else
            echo "  ❌ $service: $running/$desired tasks running"
        fi
    done
    
    echo ""
    echo "💡 Next Steps:"
    echo "  1. Monitor service health in AWS Console"
    echo "  2. Check application logs if needed"
    echo "  3. Test endpoints to verify deployment"
}

# Main function
main() {
    local wait_for_stability=false
    local specific_services=()
    local all_services=("nema-core" "client-app" "client-admin" "client-landing" "temporal-server")
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --wait|-w)
                wait_for_stability=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            -*|--*)
                log_error "Unknown option $1"
                show_help
                exit 1
                ;;
            *)
                specific_services+=("$1")
                shift
                ;;
        esac
    done
    
    # Determine which services to update
    local services_to_update
    if [ ${#specific_services[@]} -eq 0 ]; then
        services_to_update=("${all_services[@]}")
        log_info "Updating all services"
    else
        services_to_update=("${specific_services[@]}")
        log_info "Updating specific services: ${specific_services[*]}"
    fi
    
    echo "🔄 ECS Services Auto-Update"
    echo "=========================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Update services
    log_step "Updating ECS services..."
    local updated_services=()
    local failed_services=()
    
    for service in "${services_to_update[@]}"; do
        if update_service "$service"; then
            updated_services+=("$service")
        else
            failed_services+=("$service")
        fi
    done
    
    echo ""
    
    # Show immediate results
    if [ ${#updated_services[@]} -gt 0 ]; then
        log_success "Updated services: ${updated_services[*]}"
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        log_warn "Failed to update: ${failed_services[*]}"
    fi
    
    # Wait for stability if requested
    if [ "$wait_for_stability" = true ] && [ ${#updated_services[@]} -gt 0 ]; then
        echo ""
        log_step "Waiting for services to stabilize..."
        
        for service in "${updated_services[@]}"; do
            wait_for_service "$service" &
        done
        
        # Wait for all background jobs to complete
        wait
    fi
    
    echo ""
    
    # Show final summary
    show_summary "${services_to_update[@]}"
}

# Run main function with all arguments
main "$@"