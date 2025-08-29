"""Application configuration settings"""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Environment
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True)
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://nema:nema_password@postgres:5432/nema",
        alias="DATABASE_URL"
    )
    
    # Authentication
    jwt_secret: str = Field(default="your-super-secret-jwt-key", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiry_hours: int = Field(default=24)
    
    # Mock Authentication (for development without AWS)
    mock_auth_enabled: bool = Field(default=False, alias="MOCK_AUTH_ENABLED")
    
    # AWS Configuration
    aws_region: str = Field(default="us-west-2", alias="AWS_REGION")
    aws_access_key_id: Optional[str] = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    
    
    # Clerk Configuration
    clerk_secret_key: Optional[str] = Field(default=None, alias="CLERK_SECRET_KEY")
    clerk_publishable_key: Optional[str] = Field(default=None, alias="CLERK_PUBLISHABLE_KEY")
    
    # External Services
    temporal_host: str = Field(default="temporal", alias="TEMPORAL_HOST")
    temporal_port: int = Field(default=7233, alias="TEMPORAL_PORT")
    
    # S3 Configuration (optional)
    s3_bucket_name: Optional[str] = Field(default=None, alias="S3_BUCKET_NAME")
    
    # API Configuration
    api_host: str = Field(default="localhost", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    
    # Frontend URLs
    client_admin_url: str = Field(default="http://localhost:3001", alias="CLIENT_ADMIN_URL")
    client_landing_url: str = Field(default="http://localhost:3002", alias="CLIENT_LANDING_URL")
    
    # Email Configuration (optional)
    smtp_host: Optional[str] = Field(default=None, alias="SMTP_HOST")
    smtp_port: Optional[int] = Field(default=587, alias="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, alias="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    
    # Logging
    log_level: str = Field(default="INFO")
    
    class Config:
        env_file = "../../.env"  # Point to sandbox root directory
        case_sensitive = False
        extra = 'ignore'  # Ignore extra environment variables
        
    @property
    def temporal_address(self) -> str:
        """Construct Temporal server address"""
        return f"{self.temporal_host}:{self.temporal_port}"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() in ("production", "prod")
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment.lower() in ("development", "dev", "local")
    
    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins based on environment"""
        if self.is_production:
            # In production, be more restrictive
            origins = [
                "https://nema-frontend.vercel.app",  # Main Vercel frontend
            ]
            # Filter out None/empty values
            return [origin for origin in origins if origin]
        else:
            # In development, allow all localhost ports
            return [
                "http://localhost:3000",
                "http://localhost:3001", 
                "http://localhost:3002",
                "http://localhost:8080",
                "http://localhost:8081"
            ]
    
    @property
    def cors_origin_regex(self) -> str:
        """Get CORS origin regex pattern for flexible matching"""
        if self.is_production:
            # Allow Vercel domains with pattern matching including wildcards
            # Matches: nema-frontend.vercel.app, nema-systems.vercel.app
            # And preview URLs like: nema-frontend-mth9k6kx2-nema-systems.vercel.app
            return r"^https://(?:nema-frontend|nema-systems)(?:-[a-zA-Z0-9]+)*(?:-nema-systems)?\.vercel\.app$"
        else:
            # No regex for development
            return ""



# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings (singleton pattern)"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Validate configuration on import
def validate_settings():
    """Validate critical configuration"""
    settings = get_settings()
    
    if settings.is_production:
        required_fields = [
            "database_url",
            "jwt_secret"
        ]
        
        # Either Clerk or Mock auth must be configured
        auth_configured = bool(settings.clerk_secret_key or settings.mock_auth_enabled)
        if not auth_configured:
            required_fields.append("clerk_secret_key")
        
        missing_fields = []
        for field in required_fields:
            if not getattr(settings, field.lower()):
                missing_fields.append(field.upper())
        
        if missing_fields:
            raise ValueError(f"Missing required environment variables for production: {missing_fields}")


# Validate on import in production
if os.getenv("ENVIRONMENT", "development").lower() in ("production", "prod"):
    validate_settings()