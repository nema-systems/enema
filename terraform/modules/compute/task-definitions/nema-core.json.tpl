[
  {
    "name": "${name}",
    "image": "${image}",
    "cpu": ${cpu},
    "memory": ${memory},
    "essential": true,
    "portMappings": [
      {
        "containerPort": 8000,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "ENVIRONMENT",
        "value": "${environment}"
      },
      {
        "name": "DEBUG",
        "value": "false"
      },
      {
        "name": "DATABASE_URL",
        "value": "${database_url}"
      },
      {
        "name": "TEMPORAL_HOST",
        "value": "${project_name}-${environment}-temporal-server"
      },
      {
        "name": "TEMPORAL_PORT",
        "value": "7233"
      },
      {
        "name": "JWT_SECRET",
        "value": "${jwt_secret}"
      },
      {
        "name": "JWT_ALGORITHM",
        "value": "HS256"
      },
      {
        "name": "JWT_EXPIRY_HOURS",
        "value": "24"
      },
      {
        "name": "AWS_REGION",
        "value": "${region}"
      },
      {
        "name": "COGNITO_USER_POOL_ID",
        "value": "${cognito_user_pool_id}"
      },
      {
        "name": "COGNITO_APP_CLIENT_ID",
        "value": "${cognito_app_client_id}"
      },
      {
        "name": "COGNITO_APP_CLIENT_SECRET",
        "value": "${cognito_app_client_secret}"
      },
      {
        "name": "API_HOST",
        "value": "0.0.0.0"
      },
      {
        "name": "API_PORT",
        "value": "8000"
      },
      {
        "name": "LOG_LEVEL",
        "value": "INFO"
      },
      {
        "name": "MOCK_AUTH_ENABLED",
        "value": "false"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "${log_group}",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    },
    "linuxParameters": {
      "initProcessEnabled": true
    }
  }
]