import json
import numpy as np
import pandas as pd
from typing import List, Dict
from collections import defaultdict
from fastapi import FastAPI
import asyncpg
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL")

def token_positions(tokens: List[str]) -> Dict[str, List[int]]:
    pos = defaultdict(list)
    for i, t in enumerate(tokens):
        pos[t].append(i)
    return dict(pos)

def build_inverted_index_simple(df: pd.DataFrame) -> Dict[str, List[int]]:
    idx: Dict[str, List[int]] = defaultdict(list)
    for row in df.itertuples(index=False):
        food_id = int(row.Index)
        pos_map = row.pos  # dict term -> [positions]
        for term, positions in pos_map.items():
            idx[term].append(food_id)
    for term in idx:
        idx[term].sort(key=lambda p: p)
    return dict(idx)

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
    


@app.delete("/delete_all_rows_from_database")
async def delete_all_rows_from_database():
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute(
                """
                TRUNCATE TABLE user_preferences_ingredients, user_preferences_meals, user_allergies, meal_ingredients, meals, ingredients RESTART IDENTITY CASCADE;
                """, #, users add this back if you want to delete all users as well
            )
            return {"message": "All rows deleted successfully"}
    except Exception as e:
        return {"error": str(e)}
    

@app.post("/populate_database") #might need to cast data as string before adding to database
async def populate_database():
    try:
        async with app.state.pool.acquire() as conn:
            database_pd = (pd.read_csv('recipes_final.csv')).fillna(0)
            database_pd.rename(columns={'Unnamed: 0': 'Index'}, inplace=True)
            database_pd["Index"] = database_pd.index
            
            #column_name = "RecipeIngredientParts" #partially tokenized
            column_name = "RecipeIngredientParts_clean_list" #heavily tokenized


            database_pd[column_name] = database_pd[column_name].map(str)
            database_pd[column_name] = database_pd[column_name].replace("',", '",', regex=True)
            database_pd[column_name] = database_pd[column_name].replace(", '", ', "', regex=True)
            database_pd[column_name] = database_pd[column_name].replace("']", '"]', regex=True)
            database_pd[column_name] = database_pd[column_name].replace(r"\['", '["', regex=True)
            

            database_pd["tokens"] = database_pd[column_name].map(json.loads)
            #database_pd["tokens"] = database_pd["tokens"].map(np.sort)

            database_pd["pos"] = database_pd["tokens"].map(token_positions)

            inverted_index = build_inverted_index_simple(database_pd)

            ingredient_rows = []
            meal_ingredient_rows = []
            meal_rows = []


            for index, row in database_pd.iterrows():
                meal_rows.append((
                    str(row["Images"]),
                    str(row["Name"]),
                    str(row["RecipeInstructions"]),
                    str(row["RecipeCategory"]),
                    str(row["Description"]),
                    float(row["AggregatedRating"]),
                    float(row["Calories"]),
                    int(row["RecipeServings"]),
                    str(row["RecipeYield"]),
                    int(row["hours"]),
                    int(row["minutes"]),
                    int(row["totaltime_min"]),
                    str(row["calories_classification"]),
                    str(row["MacroClassification"])
                ))

            await conn.executemany(
                """
                INSERT INTO meals (images, name, recipe_instructions, recipe_category, description, aggregated_rating, calories, recipe_servings, recipe_yield, hours, minutes, totaltime_min, calories_classification, macro_classification)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                """,
                meal_rows
            )


            for index, (key, value) in enumerate(inverted_index.items()):
                ingredient_rows.append((str(key), str(value)))

                for meal_id in value:
                    meal_ingredient_rows.append((int(meal_id + 1), int(index + 1), str(database_pd.loc[meal_id, "RecipeServings"])))

            await conn.executemany(
                """
                INSERT INTO ingredients (name, meals)
                VALUES ($1, $2)
                """,
                ingredient_rows
            )

            await conn.executemany(
                """
                INSERT INTO meal_ingredients (meal_id, ingredient_id, serving)
                VALUES ($1, $2, $3)
                """,
                meal_ingredient_rows
            )
            
            return {"message": "Database populated successfully"}
    except Exception as e:
        return {"error": str(e)}
    