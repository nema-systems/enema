#!/bin/bash

# API Testing Helper Script
# Usage: ./api-test.sh <endpoint> [method] [data]
# Example: ./api-test.sh "workspaces/6/requirements" GET

ENDPOINT="${1}"
METHOD="${2:-GET}"
DATA="${3}"

# Get dev token
echo "🔑 Getting dev token..."
TOKEN=$(curl -s -X POST "http://localhost:8000/api/dev/get-clerk-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@nemasystems.io","password":"dev"}' | jq -r .access_token)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Token obtained"
echo "🌐 Testing endpoint: $METHOD /api/v1/$ENDPOINT"

# Make API call
if [ -n "$DATA" ]; then
  curl -L "http://localhost:8000/api/v1/$ENDPOINT" \
    -X "$METHOD" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$DATA" | jq '.' 2>/dev/null || cat
else
  curl -L "http://localhost:8000/api/v1/$ENDPOINT" \
    -X "$METHOD" \
    -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || cat
fi