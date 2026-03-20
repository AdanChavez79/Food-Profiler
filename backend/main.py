from datetime import datetime
import json
from time import time
from zoneinfo import ZoneInfo
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

@app.get("/meals")    
async def get_meals(meal_ids: List[int]):
    async with app.state.pool.acquire() as conn:
        meals = await conn.fetch(
            """
            SELECT *
            FROM meals m
            WHERE m.id = ANY($1);
            """,
            meal_ids
        )
        return meals

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

@app.delete("/delete_user_allergy")
async def delete_user_allergy(user_id: int, allergy: int):
    try:
        async with app.state.pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM user_allergies
                WHERE user_id = $1 AND ingredient_id = $2
                """,
                user_id,
                allergy
            )

            return {"message": "Allergy deleted successfully"}
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


@app.get("/get_inverse_index")
async def get_inverse_index():
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT name, meals
                FROM ingredients;
                """,
            )
            
            correctly_formatted_rows = []
            for row in rows:
                meal_ids = json.loads(row["meals"])
                meal_ids = [x + 1 for x in meal_ids]
                correctly_formatted_rows.append((row["name"], meal_ids))

            return correctly_formatted_rows
        

    except Exception as e:
        return {"inverse_index error": str(e)}


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

@app.get("/user_history_meals")
async def get_user_history_meals(user_id: int):
    try:
        async with app.state.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT *
                FROM user_meal_history umh
                JOIN meals m ON umh.meal_id = m.id
                WHERE umh.user_id = $1
                ORDER BY umh.time_chosen DESC;
                """,
                user_id
            )
            return rows
    except Exception as e:
        return {"error": str(e)}

#meals eaten last week
#ingredients eaten last week
#total number of meals eaten last weke

async def get_num_meals():
    async with app.state.pool.acquire() as conn:
        return await conn.fetchval("SELECT COUNT(*) FROM meals;")
   

async def recommend_food(profile, database_size, day_part = None):
    #maybe make this a dictionary, name is key and score/weight is value
    start_time = time()

    fill_val = 0

    if day_part is not None:
        fill_val = -1
 
    scores = np.full(database_size, fill_val, dtype=int)

    matched_ingredients = [[] for _ in range(database_size)]

    ingredient_names = [name for name, _ in profile]
    weight_lookup = {name: weight for name, weight in profile}

    day_part_rows = None

    async with app.state.pool.acquire() as conn:
        meal_weights = await conn.fetch(
            """
            SELECT meal_id, score, meals_since_eaten
            FROM user_preferences_meals
            """
        )



        #async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT meals, name
            FROM ingredients
            WHERE name = ANY($1);
            """,
            ingredient_names
        )

        meals_with_allergies = await conn.fetch(
            """
            SELECT user_id, ingredient_id, i.meals
            FROM user_allergies ua
            JOIN ingredients i ON ua.ingredient_id = i.id
            """,
        )

        if day_part is not None:
            day_part_rows = await conn.fetch(
                """
                SELECT id
                FROM meals
                WHERE day_parting = $1;
                """,
                day_part
            )
        

    all_meal_ids_wht_allergies = set() #create a set of everything you want to exclude
    for meal_ids in meals_with_allergies:
        meal_ids = json.loads(meal_ids["meals"]) #unpack all the meal ids from the sql query
        all_meal_ids_wht_allergies.update(meal_ids) #add them to set

    if day_part is not None:
        day_part_rows = [row["id"] - 1 for row in day_part_rows]
        scores[day_part_rows] = 0
        
    scores[meal_ids] = -1 #exclude them, theres probably a better way to do this but this is easy
    

    for row in meal_weights:
        meal_id = row["meal_id"] - 1
        score = row["score"]
        meals_since_eaten = row["meals_since_eaten"]

        if meals_since_eaten <= 1:
            scores[meal_id] = -1

        if scores[meal_id] != -1:
            scores[meal_id] += score

    """
    SELECT mi.meal_id, i.name
    FROM meal_ingredients mi
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE i.name = ANY($1);
    """

    

    for i, (meal_ids, ingredient_name) in enumerate(rows):
        json_start_time = time()
        meal_ids = json.loads(meal_ids)
        if i == 0:
            print("json conversion time: " + str(time() - json_start_time))


        for meal_id in meal_ids:
            index = int(meal_id)

            if 0 <= index < database_size and scores[index] != -1:
                scores[index] += weight_lookup.get(ingredient_name, 0)
                matched_ingredients[index].append(ingredient_name)



    sorted_indices = np.argsort(scores)[::-1]

    index_of_0 = np.argmax(scores[sorted_indices] == 0)

    sorted_indices = sorted_indices[:index_of_0]


    while sorted_indices.size < 10:
        random_number = np.random.randint(0, database_size)
        if random_number not in sorted_indices and random_number not in all_meal_ids_wht_allergies:
            sorted_indices = np.append(sorted_indices, random_number)
    

    end_time = time()

    print("recommend time: " + str(end_time - start_time))

    return sorted_indices.tolist(), matched_ingredients



@app.get("/recommendations")
async def run_and_print_recommendations(user_id: int, day_parting: bool = False):

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

    part_of_day = None

    if day_parting:
        pacific_time_hour = datetime.now(ZoneInfo('America/Los_Angeles')).time().hour
        #pacific_time_hour = 3
        if pacific_time_hour >= 6 and pacific_time_hour < 12:
            part_of_day = "breakfast"
        elif pacific_time_hour >= 12 and pacific_time_hour < 18:
            part_of_day = "lunch"
        elif pacific_time_hour >= 18 and pacific_time_hour < 24:
            part_of_day = "dinner"
        else:
            part_of_day = None


    print("part of day: " + str(part_of_day))

    recommended, matches = await recommend_food(ingredient_preferences, num_meals, part_of_day)
    top_10 = recommended[:10]
    top_10_ids = [i + 1 for i in top_10]  

    meals = []
    
    async with app.state.pool.acquire() as conn:
        for meal_id in top_10_ids:
            meal = await conn.fetch(
                "SELECT * FROM meals WHERE id = $1",
                meal_id
            )
            meals.extend(meal)


    top_10_ingredient_match = [matches[i] for i in top_10]
    
    end_time = time()

    print("recommendations time: " + str(end_time - start_time))

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



@app.post("/add_day_parts")
async def add_day_parts():
    async with app.state.pool.acquire() as conn:
        database_pd = (pd.read_csv('classified_foods_no_misc.csv')).fillna(0)
        #database_pd.rename(columns={'Unnamed: 0': 'Index'}, inplace=True)
        #database_pd["Index"] = database_pd.index

        database_pd["labels"] = database_pd["labels"].map(str)
        database_pd["labels"] = database_pd["labels"].replace("',", '",', regex=True)
        database_pd["labels"] = database_pd["labels"].replace(", '", ', "', regex=True)
        database_pd["labels"] = database_pd["labels"].replace("']", '"]', regex=True)
        database_pd["labels"] = database_pd["labels"].replace(r"\['", '["', regex=True)

        database_pd["labels"] = database_pd["labels"].map(json.loads)

        food_and_day_part = database_pd[["sequence", "labels"]].to_numpy()

        

        for i in range(food_and_day_part.shape[0]):
            food_and_day_part[i, 1] = list(food_and_day_part[i, 1])[0]


        food_and_day_part = food_and_day_part.tolist()

        print(food_and_day_part)

        await conn.executemany(
            """
            UPDATE meals
            SET day_parting = $2
            WHERE name = $1
            """,
            food_and_day_part
        )


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
         