import React, { createContext, useContext, useState, useEffect } from "react";
import { HistoryMeal } from "./components/HistoryPage";

type HistoryContextType = {
  historyMeals: HistoryMeal[];
  refreshHistory: () => Promise<void>;
};

const HistoryContext = createContext<HistoryContextType>({
  historyMeals: [],
  refreshHistory: async () => { },
});

export const useHistory = () => useContext(HistoryContext);

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

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [historyMeals, setHistoryMeals] = useState<HistoryMeal[]>([]);

  const fetchHistoryMeals = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/user_history_meals?user_id=3`
      );
      const data = await response.json();

      const formattedMeals: HistoryMeal[] = data.map((meal: any) => ({
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
        time_chosen: meal.time_chosen,
      }));

      setHistoryMeals(formattedMeals);
      console.log(formattedMeals);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistoryMeals();
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        historyMeals,
        refreshHistory: fetchHistoryMeals,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};