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
    
    # Cognito Configuration
    cognito_user_pool_id: Optional[str] = Field(default=None, alias="COGNITO_USER_POOL_ID")
    cognito_app_client_id: Optional[str] = Field(default=None, alias="COGNITO_APP_CLIENT_ID")
    cognito_app_client_secret: Optional[str] = Field(default=None, alias="COGNITO_APP_CLIENT_SECRET")
    
    # External Services
    temporal_host: str = Field(default="temporal", alias="TEMPORAL_HOST")
    temporal_port: int = Field(default=7233, alias="TEMPORAL_PORT")
    
    # S3 Configuration (optional)
    s3_bucket_name: Optional[str] = Field(default=None, alias="S3_BUCKET_NAME")
    
    # API Configuration
    api_host: str = Field(default="localhost", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    
    # Frontend URLs
    client_app_url: str = Field(default="http://localhost:3000", alias="CLIENT_APP_URL")
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
        env_file = ".env"
        case_sensitive = False
        
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
            return [
                self.client_app_url,
                self.client_admin_url, 
                self.client_landing_url
            ]
        else:
            # In development, allow all localhost ports
            return [
                "http://localhost:3000",
                "http://localhost:3001", 
                "http://localhost:3002",
                "http://localhost:8080",
                "http://localhost:8081"
            ]


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
            "jwt_secret", 
            "cognito_user_pool_id",
            "cognito_app_client_id"
        ]
        
        missing_fields = []
        for field in required_fields:
            if not getattr(settings, field.lower()):
                missing_fields.append(field.upper())
        
        if missing_fields:
            raise ValueError(f"Missing required environment variables for production: {missing_fields}")


# Validate on import in production
if os.getenv("ENVIRONMENT", "development").lower() in ("production", "prod"):
    validate_settings()