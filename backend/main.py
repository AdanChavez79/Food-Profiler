from fastapi import FastAPI
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")

@app.get("/")
async def root():
    return {"message": "Hello World!"}
