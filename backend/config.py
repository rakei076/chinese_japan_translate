from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_api_url: str = "https://api.deepseek.com/v1/chat/completions"
    max_text_length: int = 500
    
    class Config:
        env_file = ".env"

settings = Settings() 