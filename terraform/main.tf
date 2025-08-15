# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Networking Module
module "networking" {
  source = "./modules/networking"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  enable_vpc_flow_logs = var.enable_vpc_flow_logs
}

# Security Module
module "security" {
  source = "./modules/security"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  allowed_cidr_blocks = var.allowed_cidr_blocks

  depends_on = [module.networking]
}

# Database Module
module "database" {
  source = "./modules/database"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_ids = [module.security.rds_security_group_id]

  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  db_instance_class = var.db_instance_class
  multi_az          = var.enable_multi_az

  depends_on = [module.networking, module.security]
}

# Container Registry Module
module "container_registry" {
  source = "./modules/container-registry"

  project_name = var.project_name
  environment  = var.environment

  repositories = [
    "nema-core",
    "client-app",
    "client-admin", 
    "client-landing",
    "temporal-server",
    "temporal-webui"
  ]
}

# Load Balancer Module
module "load_balancer" {
  source = "./modules/load-balancer"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  security_group_ids = [module.security.alb_security_group_id]
  certificate_arn    = var.certificate_arn
  
  # Use default target groups from variables.tf
  
  depends_on = [module.networking, module.security]
}

# Compute Module (ECS)
module "compute" {
  source = "./modules/compute"
  
  project_name            = var.project_name
  environment             = var.environment
  vpc_id                  = module.networking.vpc_id
  private_subnet_ids      = module.networking.private_subnet_ids
  security_group_ids      = [module.security.ecs_security_group_id]
  task_execution_role_arn = module.security.ecs_task_execution_role_arn
  task_role_arn           = module.security.ecs_task_role_arn
  
  # Load balancer integration
  target_group_arns = module.load_balancer.target_group_arns
  alb_dns_name     = module.load_balancer.alb_dns_name
  
  # Database connection
  database_url      = module.database.database_url
  database_endpoint = module.database.db_instance_endpoint
  
  # Container images
  container_images = module.container_registry.repository_urls
  image_tag        = var.container_image_tag
  
  # Cognito configuration
  cognito_user_pool_id      = var.cognito_user_pool_id
  cognito_app_client_id     = var.cognito_app_client_id
  cognito_app_client_secret = var.cognito_app_client_secret
  jwt_secret                = var.jwt_secret
  
  # Service configuration
  nema_core_cpu           = var.nema_core_cpu
  nema_core_memory        = var.nema_core_memory
  nema_core_desired_count = var.nema_core_desired_count
  client_cpu              = var.client_cpu
  client_memory           = var.client_memory
  temporal_cpu            = var.temporal_cpu
  temporal_memory         = var.temporal_memory
  
  # Feature toggles
  enable_container_insights = var.enable_container_insights
  
  depends_on = [module.networking, module.security, module.database, module.container_registry, module.load_balancer]
}