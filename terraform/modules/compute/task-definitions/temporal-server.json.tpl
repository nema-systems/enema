[
  {
    "name": "${name}",
    "image": "${image}",
    "cpu": ${cpu},
    "memory": ${memory},
    "essential": true,
    "portMappings": [
      {
        "containerPort": 7233,
        "protocol": "tcp"
      },
      {
        "containerPort": 7234,
        "protocol": "tcp"
      }
    ],
    "environment": [
      {
        "name": "DB",
        "value": "postgresql"
      },
      {
        "name": "DB_PORT",
        "value": "5432"
      },
      {
        "name": "POSTGRES_USER",
        "value": "nema"
      },
      {
        "name": "POSTGRES_PWD",
        "value": "nema_password"
      },
      {
        "name": "POSTGRES_SEEDS",
        "value": "${database_endpoint}"
      },
      {
        "name": "DYNAMIC_CONFIG_FILE_PATH",
        "value": "config/dynamicconfig/development-sql.yaml"
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
      "command": ["CMD-SHELL", "temporal --address localhost:7233 operator cluster health || exit 1"],
      "interval": 30,
      "timeout": 10,
      "retries": 5,
      "startPeriod": 60
    }
  }
]