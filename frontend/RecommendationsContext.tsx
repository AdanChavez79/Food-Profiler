import React, { createContext, useContext, useState, useEffect } from "react";
import { HomeMeal } from "./components/HomePage"; 

type RecommendationsContextType = {
  recommendations: HomeMeal[];
  refresh: () => Promise<void>;
};

const RecommendationsContext = createContext<RecommendationsContextType>({
  recommendations: [],
  refresh: async () => { },
});

export const useRecommendations = () => useContext(RecommendationsContext);

function parseInstructions(str: string): string[] {
  const matches = str.match(/'([^']*)'|"([^"]*)"/g) || [];

  return matches.map((s: string) =>
    s
      .slice(1, -1)             
      .replace(/\n/g, " ")      
      .replace(/,([^\s])/g, ", $1") 
      .trim()                    
  );
}

export const RecommendationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [recommendations, setRecommendations] = useState<HomeMeal[]>([]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/recommendations?user_id=3"
      );
      const data = await response.json();

      const formattedMeals: HomeMeal[] = data.recommended_meals.map((meal: any) => ({
        id: String(meal.id),
        name: meal.name,
        image: JSON.parse(meal.images.replace(/'/g, '"'))[0],
        rating: meal.aggregated_rating,
        totalTime: meal.totaltime_min,
        calories: meal.calories,
        calories_classification: meal.calories_classification,
        macro_classification: meal.macro_classification,
        servings: meal.recipe_servings,
        instructions: parseInstructions(meal.recipe_instructions),
        recipe_category: meal.recipe_category,
      }));

      setRecommendations(formattedMeals);
      console.log(formattedMeals);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <RecommendationsContext.Provider
      value={{ recommendations, refresh: fetchRecommendations }}
    >
      {children}
    </RecommendationsContext.Provider>
  );
};