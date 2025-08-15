# Core Configuration
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "nema-sandbox"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS profile to use"
  type        = string
  default     = "545365949069_PowerUserAccess"
}

# SSL Configuration
variable "certificate_arn" {
  description = "ARN of SSL certificate (leave empty for HTTP only)"
  type        = string
  default     = ""
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b"]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_password" {
  description = "Database password for the nema user"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "nema"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "nema"
}

# Container Configuration
variable "container_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# ECS Configuration
variable "nema_core_cpu" {
  description = "CPU units for nema-core service"
  type        = number
  default     = 512
}

variable "nema_core_memory" {
  description = "Memory (MB) for nema-core service"
  type        = number
  default     = 1024
}

variable "nema_core_desired_count" {
  description = "Desired number of nema-core instances"
  type        = number
  default     = 2
}

variable "client_cpu" {
  description = "CPU units for client services"
  type        = number
  default     = 256
}

variable "client_memory" {
  description = "Memory (MB) for client services"
  type        = number
  default     = 512
}

variable "temporal_cpu" {
  description = "CPU units for temporal service"
  type        = number
  default     = 512
}

variable "temporal_memory" {
  description = "Memory (MB) for temporal service"
  type        = number
  default     = 1024
}

# Feature Toggles
variable "enable_container_insights" {
  description = "Enable ECS Container Insights"
  type        = bool
  default     = true
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

# Security
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Cognito Configuration (from existing setup)
variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
  default     = ""
}

variable "cognito_app_client_id" {
  description = "Cognito App Client ID"
  type        = string
  default     = ""
}

variable "cognito_app_client_secret" {
  description = "Cognito App Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
  default     = "production-super-secret-jwt-key-CHANGEME-very-long-random-string"
}