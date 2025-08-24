# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  enable_http2               = var.enable_http2
  idle_timeout               = var.idle_timeout

  dynamic "access_logs" {
    for_each = var.enable_access_logs ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = "${var.project_name}-${var.environment}-alb"
      enabled = true
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

# Target Groups
resource "aws_lb_target_group" "main" {
  for_each = var.target_groups

  name        = "${var.project_name}-${var.environment}-${each.value.name}"
  port        = each.value.port
  protocol    = each.value.protocol
  vpc_id      = var.vpc_id
  target_type = each.value.target_type

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = each.value.health_check_path
    matcher             = each.value.health_check_matcher
    port                = each.value.health_check_port
    protocol            = each.value.protocol
  }

  # Deregistration delay
  deregistration_delay = 300

  # Stickiness configuration (disabled by default)
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = false
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-${each.key}-tg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# HTTP Listener (always created)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Default action - redirect to HTTPS if certificate is available, otherwise forward to API
  default_action {
    type = var.certificate_arn != "" ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = var.certificate_arn != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    dynamic "forward" {
      for_each = var.certificate_arn == "" ? [1] : []
      content {
        target_group {
          arn = aws_lb_target_group.main["client-app"].arn
        }
      }
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-http-listener"
  }
}

# HTTPS Listener (only if certificate is provided)
resource "aws_lb_listener" "https" {
  count = var.certificate_arn != "" ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["client-app"].arn
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-https-listener"
  }
}

# Listener Rules for HTTP (if no HTTPS redirect)
resource "aws_lb_listener_rule" "http_api" {
  count = var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["nema-core"].arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}


# Path-based routing for landing
resource "aws_lb_listener_rule" "http_landing_path" {
  count = var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["client-landing"].arn
  }

  condition {
    path_pattern {
      values = ["/landing", "/landing/*"]
    }
  }
}

# Path-based routing for temporal
resource "aws_lb_listener_rule" "http_temporal_path" {
  count = var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["temporal-webui"].arn
  }

  condition {
    path_pattern {
      values = ["/temporal", "/temporal/*"]
    }
  }
}


# Host-based routing for landing (optional - for custom domains)
resource "aws_lb_listener_rule" "http_landing_host" {
  count = var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 600

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["client-landing"].arn
  }

  condition {
    host_header {
      values = ["landing.*"]
    }
  }
}

# Host-based routing for temporal (optional - for custom domains)  
resource "aws_lb_listener_rule" "http_temporal_host" {
  count = var.certificate_arn == "" ? 1 : 0

  listener_arn = aws_lb_listener.http.arn
  priority     = 700

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["temporal-webui"].arn
  }

  condition {
    host_header {
      values = ["temporal.*"]
    }
  }
}


# Listener Rules for HTTPS (if certificate is available)
resource "aws_lb_listener_rule" "https_api" {
  count = var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["nema-core"].arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}


# Path-based routing for landing (HTTPS)
resource "aws_lb_listener_rule" "https_landing_path" {
  count = var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["client-landing"].arn
  }

  condition {
    path_pattern {
      values = ["/landing", "/landing/*"]
    }
  }
}

# Path-based routing for temporal (HTTPS)
resource "aws_lb_listener_rule" "https_temporal_path" {
  count = var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 400

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["temporal-webui"].arn
  }

  condition {
    path_pattern {
      values = ["/temporal", "/temporal/*"]
    }
  }
}


# Host-based routing for landing (HTTPS)
resource "aws_lb_listener_rule" "https_landing_host" {
  count = var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 600

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["client-landing"].arn
  }

  condition {
    host_header {
      values = ["landing.*"]
    }
  }
}

# Host-based routing for temporal (HTTPS)
resource "aws_lb_listener_rule" "https_temporal_host" {
  count = var.certificate_arn != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 700

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main["temporal-webui"].arn
  }

  condition {
    host_header {
      values = ["temporal.*"]
    }
  }
}

