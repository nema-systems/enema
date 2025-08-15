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

variable "public_subnet_ids" {
  description = "IDs of the public subnets"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of SSL certificate (leave empty for HTTP only)"
  type        = string
  default     = ""
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for the ALB"
  type        = bool
  default     = false
}

variable "enable_http2" {
  description = "Enable HTTP/2 on the ALB"
  type        = bool
  default     = true
}

variable "idle_timeout" {
  description = "The time in seconds that the connection is allowed to be idle"
  type        = number
  default     = 60
}

variable "enable_access_logs" {
  description = "Enable access logs for the ALB"
  type        = bool
  default     = false
}

variable "access_logs_bucket" {
  description = "S3 bucket for ALB access logs"
  type        = string
  default     = ""
}

variable "target_groups" {
  description = "Map of target group configurations"
  type = map(object({
    name                 = string
    port                 = number
    protocol             = string
    target_type          = string
    health_check_path    = string
    health_check_matcher = string
    health_check_port    = string
  }))
  default = {
    nema-core = {
      name                 = "api"
      port                 = 8000
      protocol             = "HTTP"
      target_type          = "ip"
      health_check_path    = "/api/health"
      health_check_matcher = "200"
      health_check_port    = "traffic-port"
    }
    client-app = {
      name                 = "app"
      port                 = 3000
      protocol             = "HTTP"
      target_type          = "ip"
      health_check_path    = "/"
      health_check_matcher = "200"
      health_check_port    = "traffic-port"
    }
    client-admin = {
      name                 = "admin"
      port                 = 3001
      protocol             = "HTTP"
      target_type          = "ip"
      health_check_path    = "/"
      health_check_matcher = "200"
      health_check_port    = "traffic-port"
    }
    client-landing = {
      name                 = "landing"
      port                 = 3002
      protocol             = "HTTP"
      target_type          = "ip"
      health_check_path    = "/"
      health_check_matcher = "200"
      health_check_port    = "traffic-port"
    }
    temporal-webui = {
      name                 = "temporal"
      port                 = 8080
      protocol             = "HTTP"
      target_type          = "ip"
      health_check_path    = "/"
      health_check_matcher = "200"
      health_check_port    = "traffic-port"
    }
  }
}