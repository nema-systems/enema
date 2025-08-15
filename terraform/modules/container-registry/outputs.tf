output "repository_urls" {
  description = "Map of repository names to their URLs"
  value = {
    for name, repo in aws_ecr_repository.repositories : 
    name => repo.repository_url
  }
}

output "repository_arns" {
  description = "Map of repository names to their ARNs"
  value = {
    for name, repo in aws_ecr_repository.repositories : 
    name => repo.arn
  }
}

output "repository_registry_ids" {
  description = "Map of repository names to their registry IDs"
  value = {
    for name, repo in aws_ecr_repository.repositories : 
    name => repo.registry_id
  }
}

# Individual repository outputs for convenience
output "nema_core_repository_url" {
  description = "URL of the nema-core ECR repository"
  value       = try(aws_ecr_repository.repositories["nema-core"].repository_url, null)
}

output "client_app_repository_url" {
  description = "URL of the client-app ECR repository"
  value       = try(aws_ecr_repository.repositories["client-app"].repository_url, null)
}

output "client_admin_repository_url" {
  description = "URL of the client-admin ECR repository"
  value       = try(aws_ecr_repository.repositories["client-admin"].repository_url, null)
}

output "client_landing_repository_url" {
  description = "URL of the client-landing ECR repository"
  value       = try(aws_ecr_repository.repositories["client-landing"].repository_url, null)
}

output "temporal_server_repository_url" {
  description = "URL of the temporal-server ECR repository"
  value       = try(aws_ecr_repository.repositories["temporal-server"].repository_url, null)
}

output "temporal_webui_repository_url" {
  description = "URL of the temporal-webui ECR repository"
  value       = try(aws_ecr_repository.repositories["temporal-webui"].repository_url, null)
}