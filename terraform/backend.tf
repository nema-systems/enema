# Backend configuration for Terraform state
# Note: The S3 bucket and DynamoDB table must be created before running terraform init
# Run: ./scripts/setup-terraform-backend.sh to create these resources

terraform {
  backend "s3" {
    bucket         = "nema-sandbox-terraform-state-545365949069"
    key            = "sandbox/production/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}