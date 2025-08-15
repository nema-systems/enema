output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_hosted_zone_id" {
  description = "Hosted zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_canonical_hosted_zone_id" {
  description = "Canonical hosted zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "target_group_arns" {
  description = "Map of target group ARNs"
  value = {
    for name, tg in aws_lb_target_group.main : name => tg.arn
  }
}

output "target_group_names" {
  description = "Map of target group names"
  value = {
    for name, tg in aws_lb_target_group.main : name => tg.name
  }
}

# Individual target group outputs for convenience
output "nema_core_target_group_arn" {
  description = "ARN of the nema-core target group"
  value       = aws_lb_target_group.main["nema-core"].arn
}

output "client_app_target_group_arn" {
  description = "ARN of the client-app target group"
  value       = aws_lb_target_group.main["client-app"].arn
}

output "client_admin_target_group_arn" {
  description = "ARN of the client-admin target group"
  value       = aws_lb_target_group.main["client-admin"].arn
}

output "client_landing_target_group_arn" {
  description = "ARN of the client-landing target group"
  value       = aws_lb_target_group.main["client-landing"].arn
}


output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = var.certificate_arn != "" ? aws_lb_listener.https[0].arn : null
}

output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = var.certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}