output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

# Service ARNs
output "service_arns" {
  description = "Map of service ARNs"
  value = {
    nema-core       = aws_ecs_service.nema_core.id
    client-app      = aws_ecs_service.client_app.id
    client-landing  = aws_ecs_service.client_landing.id
    temporal-server = aws_ecs_service.temporal_server.id
  }
}

# Task Definition ARNs
output "task_definition_arns" {
  description = "Map of task definition ARNs"
  value = {
    nema-core       = aws_ecs_task_definition.nema_core.arn
    client-app      = aws_ecs_task_definition.client_app.arn
    client-landing  = aws_ecs_task_definition.client_landing.arn
    temporal-server = aws_ecs_task_definition.temporal_server.arn
  }
}

# CloudWatch Log Groups
output "log_groups" {
  description = "Map of CloudWatch log group names"
  value = {
    nema-core       = aws_cloudwatch_log_group.nema_core.name
    client-app      = aws_cloudwatch_log_group.client_app.name
    client-landing  = aws_cloudwatch_log_group.client_landing.name
    temporal-server = aws_cloudwatch_log_group.temporal_server.name
  }
}

# Individual service outputs for convenience
output "nema_core_service_name" {
  description = "Name of the nema-core service"
  value       = aws_ecs_service.nema_core.name
}

output "nema_core_service_arn" {
  description = "ARN of the nema-core service"
  value       = aws_ecs_service.nema_core.id
}

output "temporal_server_service_name" {
  description = "Name of the temporal-server service"
  value       = aws_ecs_service.temporal_server.name
}

