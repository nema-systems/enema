# Example: Using AWS Secrets Manager for sensitive values
# Uncomment and modify as needed

/*
# Data source to read existing Cognito configuration from Secrets Manager
data "aws_secretsmanager_secret" "cognito_config" {
  name = "${var.project_name}/${var.environment}/cognito"
}

data "aws_secretsmanager_secret_version" "cognito_config" {
  secret_id = data.aws_secretsmanager_secret.cognito_config.id
}

locals {
  cognito_config = jsondecode(data.aws_secretsmanager_secret_version.cognito_config.secret_string)
}

# Use in your modules like:
# cognito_user_pool_id = local.cognito_config.user_pool_id
# cognito_app_client_id = local.cognito_config.app_client_id
# cognito_app_client_secret = local.cognito_config.app_client_secret
*/

# To create the secret in AWS first:
# aws secretsmanager create-secret --name "nema-sandbox/production/cognito" --region us-west-2
# aws secretsmanager put-secret-value --secret-id "nema-sandbox/production/cognito" --secret-string '{
#   "user_pool_id": "us-west-2_nvN2VktDO",
#   "app_client_id": "43pmp98k4n1fsinljt1lmgcjm4",
#   "app_client_secret": "tuglh03da2gf5544c6g8ldgkgflabtuht7ht0kurnk5vrms2n3b"
# }'