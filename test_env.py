# test_env.py
from dotenv import load_dotenv
import os
from pathlib import Path

# explicitly point to .env file
env_path = Path(__file__).resolve().parent / ".env"
print("Loading:", env_path)

result = load_dotenv(dotenv_path=env_path)
print("Load result:", result)

print("Current directory:", os.getcwd())
print("Env file exists:", os.path.exists(env_path))
print("MURF_API_KEY:", os.getenv("MURF_API_KEY"))
