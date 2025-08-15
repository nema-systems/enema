variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of the private subnets"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for ECS services"
  type        = list(string)
}

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "target_group_arns" {
  description = "Map of target group ARNs for load balancer integration"
  type        = map(string)
}

# Database connection
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "database_endpoint" {
  description = "Database endpoint"
  type        = string
}

# Container images
variable "container_images" {
  description = "Map of container image URLs"
  type        = map(string)
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

# Cognito configuration
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
}

# Service configurations
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

variable "client_desired_count" {
  description = "Desired number of client instances"
  type        = number
  default     = 1
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

variable "temporal_desired_count" {
  description = "Desired number of temporal instances"
  type        = number
  default     = 1
}

# Feature toggles
variable "enable_container_insights" {
  description = "Enable ECS Container Insights"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = true
}

variable "enable_fargate_spot" {
  description = "Enable Fargate Spot capacity provider"
  type        = bool
  default     = true
}

# Log retention
variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

# Load balancer integration
variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}