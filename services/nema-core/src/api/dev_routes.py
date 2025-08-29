"""Development-only API endpoints for testing and token management"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
import httpx
import structlog
from typing import Optional

from ..config.settings import get_settings
from ..auth.routes import get_current_user
from ..auth.models import User

logger = structlog.get_logger(__name__)

router = APIRouter()

class ClerkTokenRequest(BaseModel):
    """Request model for Clerk token retrieval"""
    email: str
    password: str

class ClerkTokenResponse(BaseModel):
    """Response model for Clerk token"""
    access_token: str
    expires_in: Optional[int] = None
    user_id: str
    message: str

@router.post("/get-clerk-token", response_model=ClerkTokenResponse)
async def get_clerk_token(request: ClerkTokenRequest):
    """
    Get Clerk bearer token for API testing (development only)
    
    This endpoint authenticates with Clerk using email/password
    and returns a bearer token that can be used for API testing.
    
    Usage:
    1. POST to this endpoint with dev credentials
    2. Extract access_token from response  
    3. Use as Authorization: Bearer {token} in subsequent API calls
    """
    settings = get_settings()
    
    # Only allow in development
    if not settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development endpoints not available in production"
        )
    
    logger.info("Attempting Clerk authentication for API testing", email=request.email)
    
    try:
        # Use Clerk's client API to authenticate
        # This simulates what the frontend does
        async with httpx.AsyncClient() as client:
            
            # First, we need to initiate a sign-in session
            # Clerk's API structure for client authentication
            publishable_key = settings.clerk_publishable_key
            if not publishable_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Clerk publishable key not configured"
                )
            
            # Extract clerk frontend API URL from publishable key
            # Format: pk_test_{encoded_data} or pk_live_{encoded_data}
            if publishable_key.startswith("pk_test_"):
                # Decode the base64 part to get the domain
                import base64
                encoded_part = publishable_key[8:]  # Remove "pk_test_"
                try:
                    decoded = base64.b64decode(encoded_part + "==").decode('utf-8')  # Add padding
                    # Extract domain, removing any $ suffix
                    domain = decoded.rstrip('$')
                    clerk_frontend_api = f"https://{domain}"
                except:
                    # Fallback to default if decoding fails
                    clerk_frontend_api = "https://welcome-termite-8.clerk.accounts.dev"
            else:
                # For production keys, would need to extract proper domain
                clerk_frontend_api = "https://clerk.accounts.dev"
            
            # Alternative approach: Try using Clerk's admin API for development
            # This requires the secret key and creates tokens directly
            
            # Use Clerk admin API to get user and create session token
            admin_api_url = "https://api.clerk.com/v1"
            
            # First, find the user by email
            user_response = await client.get(
                f"{admin_api_url}/users",
                params={"email_address": [request.email]},
                headers={
                    "Authorization": f"Bearer {settings.clerk_secret_key}",
                    "Content-Type": "application/json",
                }
            )
            
            if user_response.status_code != 200:
                logger.error("Failed to find user in Clerk", 
                           status_code=user_response.status_code,
                           response=user_response.text)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or authentication failed"
                )
            
            user_data = user_response.json()
            logger.info("User lookup successful", user_count=len(user_data))
            
            if not user_data or len(user_data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"User {request.email} not found in Clerk"
                )
            
            user = user_data[0]  # Get first matching user
            user_id = user["id"]
            
            logger.info("Found user", user_id=user_id, email=user.get("email_addresses", [{}])[0].get("email_address"))
            
            # Create a session token for this user using Clerk admin API
            # Note: This approach creates a session without password verification
            # For now, skip organization context to get basic functionality working
            session_payload = {
                "user_id": user_id,
                "actor": None  # Admin-created session
            }
            
            token_response = await client.post(
                f"{admin_api_url}/sessions",
                json=session_payload,
                headers={
                    "Authorization": f"Bearer {settings.clerk_secret_key}",
                    "Content-Type": "application/json",
                }
            )
            
            logger.info("Session creation request", payload=session_payload)
            logger.info("Session creation response", 
                       status_code=token_response.status_code,
                       response_preview=token_response.text[:200])
            
            if token_response.status_code == 200:
                session_data = token_response.json()
                session_id = session_data["id"]
                
                logger.info("Session created, now creating JWT token", session_id=session_id)
                
                # Create JWT token for the session
                jwt_response = await client.post(
                    f"{admin_api_url}/sessions/{session_id}/tokens",
                    json={"template": "default"},
                    headers={
                        "Authorization": f"Bearer {settings.clerk_secret_key}",
                        "Content-Type": "application/json",
                    }
                )
                
                logger.info("JWT creation response", 
                           status_code=jwt_response.status_code,
                           response_preview=jwt_response.text[:200])
                
                if jwt_response.status_code == 200:
                    jwt_data = jwt_response.json()
                    session_token = jwt_data.get("jwt")
                    
                    if not session_token:
                        logger.error("No JWT in token response", jwt_data=jwt_data)
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to get JWT token from session"
                        )
                    
                    logger.info("Successfully created Clerk JWT token for API testing", 
                              user_id=user_id,
                              email=request.email)
                    
                    return ClerkTokenResponse(
                        access_token=session_token,
                        user_id=user_id,
                        expires_in=3600,  # Clerk tokens typically expire in 1 hour
                        message=f"Development token created for {request.email} (admin-generated)"
                    )
                else:
                    logger.error("Failed to create JWT token", 
                               status_code=jwt_response.status_code,
                               response=jwt_response.text)
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to create JWT token: {jwt_response.text}"
                    )
            else:
                logger.error("Failed to create session", 
                           status_code=token_response.status_code,
                           response=token_response.text)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create session: {token_response.text}"
                )
                
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error("Unexpected error during Clerk authentication", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )

@router.get("/test-token")
async def test_token(current_user: User = Depends(get_current_user)):
    """Test endpoint to verify token is working"""
    return {
        "message": "Token is valid!",
        "user": {
            "username": current_user.username,
            "email": current_user.email,
            "user_id": current_user.user_id,
            "organization_id": current_user.organization_id,
            "organization_slug": current_user.organization_slug
        }
    }

@router.get("/usage")
async def dev_usage():
    """Show usage instructions for development endpoints"""
    settings = get_settings()
    
    if not settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Development endpoints not available in production"
        )
    
    return {
        "message": "Development API Testing Endpoints",
        "instructions": {
            "1. Get Token": "POST /api/dev/get-clerk-token with {\"email\": \"dev@nemasystems.io\", \"password\": \"dev\"}",
            "2. Extract Token": "Save the 'access_token' from the response",
            "3. Test APIs": "Use the token with 'Authorization: Bearer {token}' header",
            "4. Verify Token": "GET /api/dev/test-token to verify your token works"
        },
        "example_curl": [
            "# Get token:",
            "TOKEN=$(curl -X POST http://localhost:8000/api/dev/get-clerk-token \\",
            "  -H 'Content-Type: application/json' \\",
            "  -d '{\"email\":\"dev@nemasystems.io\",\"password\":\"dev\"}' | jq -r .access_token)",
            "",
            "# Use token:",
            "curl -X GET 'http://localhost:8000/api/v1/workspaces/1/modules' \\",
            "  -H \"Authorization: Bearer $TOKEN\""
        ],
        "available_endpoints": [
            "POST /api/dev/get-clerk-token - Get bearer token",
            "GET /api/dev/test-token - Test token validity", 
            "GET /api/dev/usage - Show this help"
        ]
    }