from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    secret_key: str = "dev-secret-key-change-in-production"
    database_url: str = "sqlite:///./mitacs.db"
    upload_dir: str = "uploads"
    openai_api_key: str = ""
    llm_model: str = "gpt-4o"
    access_token_expire_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    static_dir: str = ""


settings = Settings()
