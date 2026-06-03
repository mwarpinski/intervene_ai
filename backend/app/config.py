import os
from dotenv import load_dotenv

# Load environmental variables from .env file
load_dotenv()


class Settings:
    PROJECT_NAME: str = "Intervene AI Backend"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
