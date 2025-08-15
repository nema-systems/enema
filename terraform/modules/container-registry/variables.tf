variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "repositories" {
  description = "List of ECR repositories to create"
  type        = list(string)
  default = [
    "nema-core",
    "client-app", 
    "client-admin",
    "client-landing",
    "temporal-server",
    "temporal-webui"
  ]
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Enable image vulnerability scanning on push"
  type        = bool
  default     = true
}

variable "lifecycle_policy" {
  description = "The policy document for ECR lifecycle policy"
  type        = string
  default     = ""
}

variable "untagged_image_expiry_days" {
  description = "Number of days to keep untagged images"
  type        = number
  default     = 1
}

variable "image_count_more_than" {
  description = "Keep only this many tagged images"
  type        = number
  default     = 10
}