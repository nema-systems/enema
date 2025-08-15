# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.db_instance_endpoint
}

output "database_port" {
  description = "RDS instance port"
  value       = module.database.db_instance_port
}

output "database_name" {
  description = "Database name"
  value       = module.database.db_instance_name
}

output "database_secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret containing database credentials"
  value       = module.database.secrets_manager_secret_name
}

# Container Registry Outputs
output "ecr_repository_urls" {
  description = "Map of ECR repository URLs"
  value       = module.container_registry.repository_urls
}

output "nema_core_repository_url" {
  description = "URL of the nema-core ECR repository"
  value       = module.container_registry.nema_core_repository_url
}

# Security Outputs
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = module.security.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"  
  value       = module.security.ecs_security_group_id
}

# Load Balancer Outputs
output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.load_balancer.alb_dns_name
}

output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = module.load_balancer.load_balancer_url
}

output "target_group_arns" {
  description = "Map of target group ARNs"
  value       = module.load_balancer.target_group_arns
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.compute.cluster_arn
}

output "ecs_service_arns" {
  description = "Map of ECS service ARNs"
  value       = module.compute.service_arns
}

# Environment Info
output "aws_region" {
  description = "AWS region"
  value       = data.aws_region.current.name
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}