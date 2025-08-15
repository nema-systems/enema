# Nema Sandbox Terraform Variables
# Copy this file and customize for your environment

# Core Configuration
project_name = "nema-sandbox"
environment  = "production"
aws_region   = "us-west-2"
aws_profile  = "Sandbox2"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-west-2a", "us-west-2b"]

# Database Configuration
db_instance_class = "db.t3.micro"
# db_password is required - set via environment variable or terraform.tfvars.local
# db_password = "your-secure-password"

# Container Configuration
container_image_tag = "latest"

# ECS Service Sizing
nema_core_desired_count = 2
nema_core_cpu           = 512
nema_core_memory        = 1024

client_cpu    = 256
client_memory = 512

temporal_cpu    = 512
temporal_memory = 1024

# Feature Toggles
enable_container_insights = true
enable_vpc_flow_logs      = false
enable_multi_az           = false

# Security
allowed_cidr_blocks = ["0.0.0.0/0"]

# Nema Sandbox Terraform Local Variables - Example
# Copy this file to terraform.tfvars.local and update with your values

# Cognito Configuration (from existing deployment)
cognito_user_pool_id      = "your-cognito-user-pool-id"
cognito_app_client_id     = "your-cognito-app-client-id"
cognito_app_client_secret = "your-cognito-app-client-secret"

# JWT Secret
jwt_secret = "your-jwt-secret-key"
