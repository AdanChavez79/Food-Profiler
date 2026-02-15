from fastapi import FastAPI
import asyncpg
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Connecting to DB")
    app.state.pool = await asyncpg.create_pool(DATABASE_URL)    
    yield
    print("Disconnecting from DB")
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Hello World!"}

@app.get("/users")
async def get_all_usernames():
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch("SELECT username FROM users;")
            return rows
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/user_preferences_meals")
async def get_user_preferences_meals(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT m.name, upm.preference
                FROM user_preferences_meals upm
                JOIN meals m ON upm.meal_id = m.id
                WHERE upm.user_id = $1;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}

@app.get("/user_preferences_ingredients")
async def get_user_preferences_ingredients(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT i.name, upi.preference
                FROM user_preferences_ingredients upi
                JOIN ingredients i ON upi.ingredient_id = i.id
                WHERE upi.user_id = $1;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}
    

@app.get("/user_allergies")
async def get_user_allergies(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT i.name
                FROM user_allergies ua
                JOIN ingredients i ON ua.ingredient_id = i.id
                WHERE ua.user_id = $1;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}
    
@app.post("/add_user_allergy")
async def add_user_allergy(user_id: int, allergy: int):
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_allergies (user_id, ingredient_id)
                VALUES ($1, $2)
                """,
                user_id,
                allergy
            )
            return {"message": "Allergy insert success"}
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/all_ingredients")
async def get_user_allergies():
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT *
                FROM ingredients
                """            
                )
            return rows
    except Exception as e:
        return {"error": str(e)}
    