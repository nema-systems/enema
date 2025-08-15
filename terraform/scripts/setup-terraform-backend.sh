#!/bin/bash

# =============================================================================
# Terraform Backend Setup Script
# Creates S3 bucket and DynamoDB table for Terraform state management
# =============================================================================

set -e

# Configuration
PROJECT_NAME="nema-sandbox"
AWS_REGION="us-west-2"
AWS_PROFILE="Sandbox2"

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

# Get AWS Account ID
get_account_id() {
    aws sts get-caller-identity --profile $AWS_PROFILE --query 'Account' --output text
}

# Check if AWS CLI is configured
check_aws_cli() {
    log_info "Checking AWS CLI configuration..."
    if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
        log_error "AWS CLI not configured or profile '$AWS_PROFILE' not found"
        exit 1
    fi
    log_success "AWS CLI configured with profile: $AWS_PROFILE"
}

# Create S3 bucket for Terraform state
create_s3_bucket() {
    local account_id=$(get_account_id)
    local bucket_name="${PROJECT_NAME}-terraform-state-${account_id}"
    
    log_info "Creating S3 bucket: $bucket_name"
    
    # Check if bucket exists
    if aws s3api head-bucket --bucket $bucket_name --profile $AWS_PROFILE 2>/dev/null; then
        log_warn "S3 bucket $bucket_name already exists"
        return 0
    fi
    
    # Create bucket
    aws s3api create-bucket \
        --bucket $bucket_name \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --create-bucket-configuration LocationConstraint=$AWS_REGION
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket $bucket_name \
        --versioning-configuration Status=Enabled \
        --profile $AWS_PROFILE
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket $bucket_name \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }' \
        --profile $AWS_PROFILE
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket $bucket_name \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }' \
        --profile $AWS_PROFILE
    
    log_success "S3 bucket created: $bucket_name"
    echo $bucket_name
}

# Create DynamoDB table for state locking
create_dynamodb_table() {
    local table_name="terraform-state-locks"
    
    log_info "Creating DynamoDB table: $table_name"
    
    # Check if table exists
    if aws dynamodb describe-table --table-name $table_name --profile $AWS_PROFILE 2>/dev/null; then
        log_warn "DynamoDB table $table_name already exists"
        return 0
    fi
    
    # Create table
    aws dynamodb create-table \
        --table-name $table_name \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --tags Key=Name,Value="Terraform State Locks" Key=Project,Value=$PROJECT_NAME
    
    # Wait for table to be active
    log_info "Waiting for DynamoDB table to be active..."
    aws dynamodb wait table-exists \
        --table-name $table_name \
        --profile $AWS_PROFILE
    
    log_success "DynamoDB table created: $table_name"
}

# Update backend configuration
update_backend_config() {
    local bucket_name=$1
    local backend_file="../backend.tf"
    
    log_info "Updating backend configuration..."
    
    # Create backup
    if [ -f $backend_file ]; then
        cp $backend_file "${backend_file}.backup"
    fi
    
    # Update bucket name in backend.tf
    sed -i.bak "s/nema-terraform-state-ACCOUNT_ID/$bucket_name/g" $backend_file
    rm "${backend_file}.bak"
    
    log_success "Backend configuration updated"
    log_info "Next steps:"
    echo "  1. cd ../  # Go to terraform directory"
    echo "  2. terraform init  # Initialize Terraform with new backend"
    echo "  3. terraform plan   # Review planned changes"
    echo "  4. terraform apply  # Apply the infrastructure"
}

# Main execution
main() {
    echo "🚀 Setting up Terraform Backend for Nema Sandbox"
    echo ""
    
    check_aws_cli
    
    local bucket_name
    bucket_name=$(create_s3_bucket)
    create_dynamodb_table
    update_backend_config $bucket_name
    
    echo ""
    log_success "Terraform backend setup complete!"
    echo ""
    echo "Backend Configuration:"
    echo "  S3 Bucket: $bucket_name"
    echo "  DynamoDB Table: terraform-state-locks"
    echo "  Region: $AWS_REGION"
    echo ""
}

# Check if running directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi