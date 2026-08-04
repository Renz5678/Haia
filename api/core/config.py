from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    web_base_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    secret_key: str = "change-me-in-production"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Gemini
    gemini_api_key: str

    # Telegram
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/integrations/google/callback"

    # Email
    mailgun_api_key: str = ""
    mailgun_domain: str = ""
    mailgun_webhook_signing_key: str = ""
    postmark_server_token: str = ""

    # Sentry
    sentry_dsn_api: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    def validate_for_production(self) -> None:
        """
        Fail fast at startup if the app is running in production with
        insecure placeholder values. Call this once during app initialisation.
        """
        if not self.is_production:
            return

        errors: list[str] = []

        if "localhost" in self.api_base_url:
            errors.append("API_BASE_URL still points to localhost — set the public URL.")
        if "localhost" in self.web_base_url:
            errors.append("WEB_BASE_URL still points to localhost — set the public URL.")
        if "localhost" in self.cors_origins:
            errors.append("CORS_ORIGINS still points to localhost — set the production origin.")
        if self.secret_key == "change-me-in-production":
            errors.append("SECRET_KEY is still the default placeholder. Run: openssl rand -hex 32")
        if "localhost" in self.google_redirect_uri:
            errors.append("GOOGLE_REDIRECT_URI still points to localhost — set the production callback URL.")

        if errors:
            bullet_list = "\n  • ".join(errors)
            raise RuntimeError(
                f"[Haia] Production misconfiguration — fix before deploying:\n  • {bullet_list}"
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_for_production()
    return settings

