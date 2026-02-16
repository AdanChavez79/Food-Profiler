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
    


async def get_ingredient_meal_list(ingredient_id: int):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT i.meals
            FROM ingredients i
            WHERE i.id = $1;
            """,
            ingredient_id            
            )
        return rows
    
async def get_meal(meal_id: int):
    async with app.state.pool.acquire() as conn:
        name = await conn.fetchval(
            """
            SELECT m.name
            FROM meals m
            WHERE m.id = $1;
            """,
            meal_id            
            )
        return name

    
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


async def get_num_meals():
    async with app.state.pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM meals;")
   


"""
def reccomend_food(profile: List[Tuple[str, int]], inv: dict, database_list: np.ndarray, matches_ingredients: List[List[Tuple[str, int]]]) -> Tuple[List[int], np.ndarray, List[List[str]]]:
    meals_containing_ingredients = []
    ingredients = []
    for ingredient in profile: #ingredient and weight
        if ingredient[0] in inv: #check if ingredient is in the reverse index, might need to create api call
            #print("Ingredient: " + ingredient[0] + " -> " + str(inv[ingredient[0]][0:10]))
            meals_containing_ingredients.append(set(inv[ingredient[0]])) #get list of meals that have ingedient from inverted index, might thave to create api call (in this situation a list is needed)
            ingredients.append(ingredient) # add ingredient and weight to list

    #print("ingredients: " + str(ingredients))

    for i, meals in enumerate(meals_containing_ingredients): #set meals
        for meal in meals: #meal
            if (meal >= 0 and meal < len(database_list)):
                database_list[meal] += ingredients[i][1]  # Add the weight of the ingredient
                matches_ingredients[meal].append(ingredients[i]) #add ingredient and weight to list of matches for meal

    
    sorted_meals = (np.argsort(database_list)[::-1])  # Sort by index in descending order

    sorted_meals = sorted_meals[:database_list.argmax(0)]  # Trim to only include meals that have at least one match

    return sorted_meals.tolist(), matches_ingredients

def print_meals_from_id(meal_ids: List[int], df: pd.DataFrame, matches_ingredients: List[List[Tuple[str, int]]]) -> None:
    for i, meal_id in enumerate(meal_ids):
        print(str(i + 1) + ". " + df.loc[meal_id, 'Name'] + " (" + str(meal_id) + ", matched " + str(len(matches_ingredients[meal_id])) + " ingredients):") #database called to find name of food based on id, might need api call
        print(df.loc[meal_id, 'tokens']) #will probably need to be removed, and replaced with ingredients column from database, api call might be needed to grab ingredients
        print("matched ingredients: " + str(sorted(matches_ingredients[meal_id])))
        print("total weight: " + str(sum(weight for _, weight in matches_ingredients[meal_id])) + "\n\n")



def run_and_print_reccomendations():
    start_time = time()

    flavor_profile = [("chicken", 3), ("avocado", 14), ("salmon", 10), ("rice", 5), ("asparagus", 2), ("beef", 20), ("corn", 6), ("broccoli", 7), ("carrots", 1), ("onions", 10), ("carrot", 4), ("thyme", 1)]
    n = database_pd.shape[0] #databse size needed, might need api call
    database_list = np.full(n, 0, dtype=int)
    matches_ingredients = []
    for i in range(n):
        matches_ingredients.append([])


    recommended_meals, matches_ingredients = reccomend_food(flavor_profile, inv, database_list, matches_ingredients) #if api calls are made we can remove inv from parameter list

    print_meals_from_id(recommended_meals[:10], database_pd, matches_ingredients) #if api calls are made we can remove database_pd from parameter list

    end_time = time()
    print(f"Execution time: {end_time - start_time} seconds")
    """



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
         