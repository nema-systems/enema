#!/bin/bash

# =============================================================================
# Setup AWS OIDC Provider for GitHub Actions
# More secure than long-term access keys
# =============================================================================

set -e

# Configuration
GITHUB_REPO="your-username/your-repo-name"  # Update this
AWS_PROFILE="545365949069_PowerUserAccess"
AWS_REGION="us-west-2"

echo "🔐 Setting up GitHub OIDC for AWS access"

# Create OIDC Identity Provider
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
    --client-id-list sts.amazonaws.com \
    --profile $AWS_PROFILE || echo "OIDC Provider may already exist"

# Create IAM Role
cat > github-actions-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO}:ref:refs/heads/main"
                }
            }
        }
    ]
}
EOF

aws iam create-role \
    --role-name GitHubActions-TerraformRole \
    --assume-role-policy-document file://github-actions-trust-policy.json \
    --profile $AWS_PROFILE

# Attach necessary policies
aws iam attach-role-policy \
    --role-name GitHubActions-TerraformRole \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess \
    --profile $AWS_PROFILE

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name GitHubActions-TerraformRole --profile $AWS_PROFILE --query 'Role.Arn' --output text)

echo "✅ OIDC setup complete!"
echo "Add this secret to your GitHub repository:"
echo "Name: AWS_ROLE_ARN"
echo "Value: $ROLE_ARN"

# Cleanup
rm github-actions-trust-policy.json