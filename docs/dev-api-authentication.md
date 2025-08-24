# Development API Authentication

## Overview

Direct API testing with Clerk authentication tokens for development, testing, and data injection.

## Prerequisites

- Backend running on `localhost:8000`
- User `dev@nemasystems.io` exists in Clerk
- Development mode enabled (`ENVIRONMENT=development`)

## Quick Start

### 1. Get Token

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/dev/get-clerk-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@nemasystems.io","password":"dev"}' | jq -r .access_token)
```

### 2. Test APIs

```bash
# List workspaces
curl -L "http://localhost:8000/api/v1/workspaces" \
  -H "Authorization: Bearer $TOKEN"

# List req_collections
curl -L "http://localhost:8000/api/v1/workspaces/{workspace_id}/req_collections" \
  -H "Authorization: Bearer $TOKEN"

# Create req_collection
curl -L -X POST "http://localhost:8000/api/v1/workspaces/{workspace_id}/req_collections" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Collection","metadata":{"source":"api"}}'
```

## Available Endpoints

- `POST /api/dev/get-clerk-token` - Get authentication token
- `GET /api/dev/test-token` - Verify token validity  
- `GET /api/dev/usage` - Show usage instructions

## Features

- ✅ Real Clerk authentication (not bypassed)
- ✅ Proper organization/workspace validation
- ✅ Works alongside frontend authentication
- ✅ Development-only (disabled in production)
- ✅ Full CRUD operations supported

## Testing Script

Use `./test_api.sh` for comprehensive testing:

```bash
cd /Users/bence/dev/nema
./test_api.sh
```

## Notes

- Tokens expire in 1 hour
- Only works in development mode
- Password not verified (admin-generated tokens)
- Use `-L` flag with curl to follow redirects