# Data sources
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  # Note: capacity_providers deprecated, using capacity_provider_strategy instead

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "nema_core" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/nema-core"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-${var.environment}-nema-core-logs"
  }
}

resource "aws_cloudwatch_log_group" "client_app" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/client-app"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-${var.environment}-client-app-logs"
  }
}


resource "aws_cloudwatch_log_group" "client_landing" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/client-landing"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-${var.environment}-client-landing-logs"
  }
}

resource "aws_cloudwatch_log_group" "temporal_server" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/temporal-server"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "${var.project_name}-${var.environment}-temporal-server-logs"
  }
}


# Task Definition for Nema Core
resource "aws_ecs_task_definition" "nema_core" {
  family                   = "${var.project_name}-${var.environment}-nema-core"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.nema_core_cpu
  memory                   = var.nema_core_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn           = var.task_role_arn

  container_definitions = templatefile("${path.module}/task-definitions/nema-core.json.tpl", {
    name         = "nema-core"
    image        = "${var.container_images["nema-core"]}:${var.image_tag}"
    cpu          = var.nema_core_cpu
    memory       = var.nema_core_memory
    region       = data.aws_region.current.name
    log_group    = aws_cloudwatch_log_group.nema_core.name
    database_url = var.database_url
    database_endpoint = var.database_endpoint
    cognito_user_pool_id = var.cognito_user_pool_id
    cognito_app_client_id = var.cognito_app_client_id
    cognito_app_client_secret = var.cognito_app_client_secret
    jwt_secret = var.jwt_secret
    project_name = var.project_name
    environment = var.environment
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-nema-core-task"
  }
}

# Task Definition for Client App
resource "aws_ecs_task_definition" "client_app" {
  family                   = "${var.project_name}-${var.environment}-client-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.client_cpu
  memory                   = var.client_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn           = var.task_role_arn

  container_definitions = templatefile("${path.module}/task-definitions/client-app.json.tpl", {
    name      = "client-app"
    image     = "${var.container_images["client-app"]}:${var.image_tag}"
    cpu       = var.client_cpu
    memory    = var.client_memory
    region    = data.aws_region.current.name
    log_group = aws_cloudwatch_log_group.client_app.name
    cognito_user_pool_id = var.cognito_user_pool_id
    cognito_app_client_id = var.cognito_app_client_id
    project_name = var.project_name
    environment = var.environment
    alb_dns_name = var.alb_dns_name
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-client-app-task"
  }
}


# Task Definition for Client Landing
resource "aws_ecs_task_definition" "client_landing" {
  family                   = "${var.project_name}-${var.environment}-client-landing"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.client_cpu
  memory                   = var.client_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn           = var.task_role_arn

  container_definitions = templatefile("${path.module}/task-definitions/client-landing.json.tpl", {
    name      = "client-landing"
    image     = "${var.container_images["client-landing"]}:${var.image_tag}"
    cpu       = var.client_cpu
    memory    = var.client_memory
    region    = data.aws_region.current.name
    log_group = aws_cloudwatch_log_group.client_landing.name
    alb_dns_name = var.alb_dns_name
    project_name = var.project_name
    environment = var.environment
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-client-landing-task"
  }
}

# Task Definition for Temporal Server
resource "aws_ecs_task_definition" "temporal_server" {
  family                   = "${var.project_name}-${var.environment}-temporal-server"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.temporal_cpu
  memory                   = var.temporal_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn           = var.task_role_arn

  container_definitions = templatefile("${path.module}/task-definitions/temporal-server.json.tpl", {
    name         = "temporal-server"
    image        = "temporalio/auto-setup:1.21.0"  # Use official image
    cpu          = var.temporal_cpu
    memory       = var.temporal_memory
    region       = data.aws_region.current.name
    log_group    = aws_cloudwatch_log_group.temporal_server.name
    database_endpoint = var.database_endpoint
    project_name = var.project_name
    environment = var.environment
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-temporal-server-task"
  }
}


# ECS Services
resource "aws_ecs_service" "nema_core" {
  name            = "${var.project_name}-${var.environment}-nema-core"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nema_core.arn
  desired_count   = var.nema_core_desired_count
  # launch_type is omitted when using capacity provider strategy

  network_configuration {
    security_groups  = var.security_group_ids
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["nema-core"]
    container_name   = "nema-core"
    container_port   = 8000
  }

  health_check_grace_period_seconds = 120

  dynamic "capacity_provider_strategy" {
    for_each = var.enable_fargate_spot ? [1] : []
    content {
      capacity_provider = "FARGATE"
      weight           = 1
    }
  }

  dynamic "capacity_provider_strategy" {
    for_each = var.enable_fargate_spot ? [1] : []
    content {
      capacity_provider = "FARGATE_SPOT"
      weight           = 4
    }
  }

  enable_execute_command = var.enable_execute_command

  depends_on = [var.target_group_arns]

  tags = {
    Name = "${var.project_name}-${var.environment}-nema-core-service"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "client_app" {
  name            = "${var.project_name}-${var.environment}-client-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.client_app.arn
  desired_count   = var.client_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = var.security_group_ids
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["client-app"]
    container_name   = "client-app"
    container_port   = 3000
  }

  enable_execute_command = var.enable_execute_command

  depends_on = [var.target_group_arns]

  tags = {
    Name = "${var.project_name}-${var.environment}-client-app-service"
  }
}


resource "aws_ecs_service" "client_landing" {
  name            = "${var.project_name}-${var.environment}-client-landing"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.client_landing.arn
  desired_count   = var.client_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = var.security_group_ids
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arns["client-landing"]
    container_name   = "client-landing"
    container_port   = 3002
  }

  enable_execute_command = var.enable_execute_command

  depends_on = [var.target_group_arns]

  tags = {
    Name = "${var.project_name}-${var.environment}-client-landing-service"
  }
}

resource "aws_ecs_service" "temporal_server" {
  name            = "${var.project_name}-${var.environment}-temporal-server"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.temporal_server.arn
  desired_count   = var.temporal_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = var.security_group_ids
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  enable_execute_command = var.enable_execute_command

  tags = {
    Name = "${var.project_name}-${var.environment}-temporal-server-service"
  }
}

