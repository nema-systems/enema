[
  {
    "name": "${name}",
    "image": "${image}",
    "cpu": ${cpu},
    "memory": ${memory},
    "essential": true,
    "portMappings": [
      {
        "containerPort": 3001,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "NODE_ENV",
        "value": "production"
      },
      {
        "name": "VITE_API_URL",
        "value": "http://${alb_dns_name}/api"
      },
      {
        "name": "VITE_COGNITO_USER_POOL_ID",
        "value": "${cognito_user_pool_id}"
      },
      {
        "name": "VITE_COGNITO_APP_CLIENT_ID",
        "value": "${cognito_app_client_id}"
      },
      {
        "name": "VITE_AWS_REGION",
        "value": "us-west-2"
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
      "command": ["CMD-SHELL", "curl -f http://localhost:3001 || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }
]