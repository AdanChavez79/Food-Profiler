import json
from time import time
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple
from collections import defaultdict
from fastapi import FastAPI
import asyncpg
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import asyncio
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World!"}

    
#might just add allergies table, that has hardcoded options for the user
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


#
@app.get("/all_ingredients")
async def all_ingredients():
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
    



#When retrieved use +1 meal_id list, this is using JSONB stored in ingredients
# @app.get("/get_ingredient_meal_list")    
# async def get_ingredient_meal_list(ingredient_id: int):
#     async with app.state.pool.acquire() as conn:
#         rows = await conn.fetch(
#             """
#             SELECT i.meals
#             FROM ingredients i
#             WHERE i.id = $1;
#             """,
#             ingredient_id            
#             )
#         return rows

@app.get("/meal")    
async def get_meal(meal_id: int):
    async with app.state.pool.acquire() as conn:
        meal = await conn.fetchrow(
            """
            SELECT *
            FROM meals m
            WHERE m.id = $1;
            """,
            meal_id            
            )
        return meal


#Might not need if we are retrieving all meal data for frontend
@app.get("/meal_ingredients")    
async def get_meal_ingredients(meal_id: int):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT i.name
            FROM meal_ingredients mi
            JOIN ingredients i ON i.id = mi.ingredient_id 
            WHERE mi.meal_id = $1;
            """,
            meal_id            
            )
        return rows







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
    
@app.get("/user_preferences_ingredients")
async def get_user_preferences_ingredients(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT i.name, upi.score
                FROM user_preferences_ingredients upi
                JOIN ingredients i ON upi.ingredient_id = i.id
                WHERE upi.user_id = $1;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}


@app.get("/user_preferences_meals")
async def get_user_preferences_meals(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT m.name, upm.score
                FROM user_preferences_meals upm
                JOIN meals m ON upm.meal_id = m.id
                WHERE upm.user_id = $1;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}


meals_since_eaten_threshold = 10

@app.post("/add_meal_history_and_update_flavor_profile")
async def add_meal_history_and_update_flavor_profile(user_id: int, meal_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute(
                #add or update flavor score of ingredient

                """
                INSERT INTO user_preferences_ingredients (user_id, ingredient_id, score, meals_since_eaten)
                SELECT $1, ingredient_id, 1, 0
                FROM meal_ingredients
                WHERE meal_id = $2

                
                ON CONFLICT (user_id, ingredient_id) DO UPDATE
                SET score = user_preferences_ingredients.score + 1, meals_since_eaten = 0;
                """,
                user_id,
                meal_id
            )

            await conn.execute(
                #add or update flavor score of meal

                """
                INSERT INTO user_preferences_meals (user_id, meal_id, score, meals_since_eaten)
                VALUES ($1, $2, 1, 0)

                ON CONFLICT (user_id, meal_id) DO UPDATE
                SET score = user_preferences_meals.score + 1, meals_since_eaten = 0
                WHERE user_preferences_meals.user_id = $1 AND user_preferences_meals.meal_id = $2;
                """,
                user_id,
                meal_id
            )

            await conn.execute(
                #udpate meals since eaten for meals
                
                """
                UPDATE user_preferences_meals
                SET meals_since_eaten = meals_since_eaten + 1
                WHERE user_preferences_meals.user_id = $1 AND user_preferences_meals.meal_id != $2;
                """,
                user_id,
                meal_id
            )

            await conn.execute(
                #update meals since eaten for ingredients

                """
                UPDATE user_preferences_ingredients
                SET meals_since_eaten = meals_since_eaten + 1
                WHERE ingredient_id NOT IN (
                    SELECT ingredient_id
                    FROM meal_ingredients
                    WHERE meal_id = $2) AND user_id = $1;
                """,
                user_id,
                meal_id
            )

            await conn.execute(
                #reduce scores for meals past threshold
                
                """
                UPDATE user_preferences_meals
                SET score = score - 1
                WHERE user_preferences_meals.user_id = $1 AND meals_since_eaten > $2 AND score > 0;
                """,
                user_id,
                meals_since_eaten_threshold
            )

            await conn.execute(
                #reduce scores for ingredients past threshold

                """
                UPDATE user_preferences_ingredients
                SET score = score - 1
                WHERE user_preferences_ingredients.user_id = $1 AND meals_since_eaten > $2 AND score > 0;
                """,
                user_id,
                meals_since_eaten_threshold
            )


            await add_meal_history(user_id, meal_id)
        return {"message": "Meal history and flavor profile update success"}
    except Exception as e:
        return {"error": str(e)}



@app.post("/add_meal_history")
async def add_meal_history(user_id: int, meal_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_meal_history (user_id, meal_id)
                VALUES ($1, $2)
                """,
                user_id,
                meal_id
            )
            return {"message": "Meal history insert success"}
    except Exception as e:
        return {"error": str(e)}
    
#meals eaten last week
#ingredients eaten last week
#total number of meals eaten last weke

async def get_num_meals():
    async with app.state.pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM meals;")
   

async def recommend_food(profile, database_size):
    #maybe make this a dictionary, name is key and score/weight is value
    start_time = time()

    scores = np.zeros(database_size, dtype=int)
    matched_ingredients = [[] for _ in range(database_size)]

    async with app.state.pool.acquire() as conn:
        meal_weights = await conn.fetch(
            """
            SELECT meal_id, score
            FROM user_preferences_meals
            WHERE meals_since_eaten > 1;
            """
        )

    for row in meal_weights:
        meal_id = row["meal_id"]
        score = row["score"]

        scores[meal_id - 1] += score

    ingredient_names = [name for name, _ in profile]
    weight_lookup = {name: weight for name, weight in profile}

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT mi.meal_id, i.name
            FROM meal_ingredients mi
            JOIN ingredients i ON i.id = mi.ingredient_id
            WHERE i.name = ANY($1);
            """,
            ingredient_names
        )

    for meal_id, ingredient_name in rows:

        index = meal_id - 1

        if 0 <= index < database_size:
            scores[index] += weight_lookup.get(ingredient_name, 0)
            matched_ingredients[index].append(ingredient_name)

    sorted_indices = np.argsort(scores)[::-1]

    end_time = time()

    print("reccomend time: " + str(end_time - start_time))

    return sorted_indices.tolist(), matched_ingredients



@app.get("/recommendations")
async def run_and_print_recommendations(user_id: int):

    # call user_preferences_ingredients, this is now in DB 
    #All users will start will no flavor profile, we can suggest premade flavor profiles at
    #app start, t avoid randome 
    # flavor_profile = [
    #     ("chicken", 3), ("avocado", 14), ("salmon", 10),
    #     ("rice", 5), ("beef", 20),
    #     ("corn", 6), ("broccoli", 7),
    #     ("onion", 10), ("carrot", 4), ("thyme", 1)
    # ]

    start_time = time()

    ingredient_preferences = await get_user_preferences_ingredients(user_id)
    

    num_meals = await get_num_meals()

    recommended, matches = await recommend_food(ingredient_preferences, num_meals)
    top_10 = recommended[:10]
    top_10_ids = [i + 1 for i in top_10]  


    
    async with app.state.pool.acquire() as conn:
        meals = await conn.fetch(
            "SELECT * FROM meals WHERE id = ANY($1::int[])",
            top_10_ids
        )

    top_10_ingredient_match = [matches[i] for i in top_10]
    
    end_time = time()

    print("reccomendations time: " + str(end_time - start_time))

    return {
         "recommended_meals": meals,
         "matched_ingredients": top_10_ingredient_match
    }






@app.post("/populate_meal_ingredients_table_and_ingredients_table")
async def populates_meal_ingredients_table_and_ingredients_table():
    try:
        async with app.state.pool.acquire() as conn:
            database_pd = (pd.read_csv('recipes_final.csv')).fillna(0)
            database_pd.rename(columns={'Unnamed: 0': 'Index'}, inplace=True)
            database_pd["Index"] = database_pd.index
            
            column_name = "RecipeIngredientParts" #partially tokenized#         
            #column_name = "RecipeIngredientParts_clean_list" #heavily tokenized


            database_pd[column_name] = database_pd[column_name].map(str)
            database_pd[column_name] = database_pd[column_name].replace("',", '",', regex=True)
            database_pd[column_name] = database_pd[column_name].replace(", '", ', "', regex=True)
            database_pd[column_name] = database_pd[column_name].replace("']", '"]', regex=True)
            database_pd[column_name] = database_pd[column_name].replace(r"\['", '["', regex=True)
            

            database_pd["tokens"] = database_pd[column_name].map(json.loads)
            database_pd["tokens"] = database_pd["tokens"].map(np.sort)

            database_pd["pos"] = database_pd["tokens"].map(token_positions)

            inverted_index = build_inverted_index_simple(database_pd)

            ingredient_rows = []
            meal_ingredient_rows = []
            
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
        return {"message": "Ingredients and meal_ingredients tables populated successfully"}
    except Exception as e:
        return {"error": str(e)}












# async def delete_all_rows_from_database():
#     async with app.state.pool.acquire() as conn:
#         await conn.execute(
#             """
#             TRUNCATE TABLE user_preferences_ingredients, user_preferences_meals, user_allergies, meal_ingredients, meals, ingredients RESTART IDENTITY CASCADE;
#             """, #, users add this back if you want to delete all users as well
#         )
    

# async def populate_database():
#     async with app.state.pool.acquire() as conn:
#         database_pd = (pd.read_csv('recipes_final.csv')).fillna(0)
#         database_pd.rename(columns={'Unnamed: 0': 'Index'}, inplace=True)
#         database_pd["Index"] = database_pd.index
        
#         #column_name = "RecipeIngredientParts" #partially tokenized
#         column_name = "RecipeIngredientParts_clean_list" #heavily tokenized


#         database_pd[column_name] = database_pd[column_name].map(str)
#         database_pd[column_name] = database_pd[column_name].replace("',", '",', regex=True)
#         database_pd[column_name] = database_pd[column_name].replace(", '", ', "', regex=True)
#         database_pd[column_name] = database_pd[column_name].replace("']", '"]', regex=True)
#         database_pd[column_name] = database_pd[column_name].replace(r"\['", '["', regex=True)
        

#         database_pd["tokens"] = database_pd[column_name].map(json.loads)
#         #database_pd["tokens"] = database_pd["tokens"].map(np.sort)

#         database_pd["pos"] = database_pd["tokens"].map(token_positions)

#         inverted_index = build_inverted_index_simple(database_pd)

#         ingredient_rows = []
#         meal_ingredient_rows = []
#         meal_rows = []


#         for index, row in database_pd.iterrows():
#             meal_rows.append((
#                 str(row["Images"]),
#                 str(row["Name"]),
#                 str(row["RecipeInstructions"]),
#                 str(row["RecipeCategory"]),
#                 str(row["Description"]),
#                 float(row["AggregatedRating"]),
#                 float(row["Calories"]),
#                 int(row["RecipeServings"]),
#                 str(row["RecipeYield"]),
#                 int(row["hours"]),
#                 int(row["minutes"]),
#                 int(row["totaltime_min"]),
#                 str(row["calories_classification"]),
#                 str(row["MacroClassification"])
#             ))

#         await conn.executemany(
#             """
#             INSERT INTO meals (images, name, recipe_instructions, recipe_category, description, aggregated_rating, calories, recipe_servings, recipe_yield, hours, minutes, totaltime_min, calories_classification, macro_classification)
#             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
#             """,
#             meal_rows
#         )


#         for index, (key, value) in enumerate(inverted_index.items()):
#             ingredient_rows.append((str(key), str(value)))

#             for meal_id in value:
#                 meal_ingredient_rows.append((int(meal_id + 1), int(index + 1), str(database_pd.loc[meal_id, "RecipeServings"])))

#         await conn.executemany(
#             """
#             INSERT INTO ingredients (name, meals)
#             VALUES ($1, $2)
#             """,
#             ingredient_rows
#         )

#         await conn.executemany(
#             """
#             INSERT INTO meal_ingredients (meal_id, ingredient_id, serving)
#             VALUES ($1, $2, $3)
#             """,
#             meal_ingredient_rows
#         )
         