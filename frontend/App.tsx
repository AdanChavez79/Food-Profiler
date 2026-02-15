import { useState } from 'react';
import { Alert } from 'react-native';
import HomePage, { HomeMeal } from 'components/HomePage';
import MealDetailPage from 'components/MealDetailPage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

type MealDetailMeal = {
  id: string;
  name: string;
  image: string;
  cost: number;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
};

const ingredients = [
  '2 chicken breasts',
  '1 cup broccoli florets',
  '1 bell pepper, sliced',
  '1 cup cherry tomatoes',
  '2 tbsp olive oil',
  '1 tsp garlic powder',
  'Salt and pepper to taste',
  '1 tsp Italian seasoning',
];

const steps = [
  'Preheat oven to 400F (200C)',
  'Season chicken breasts with salt, pepper, and garlic powder',
  'Arrange chicken and vegetables on a baking sheet',
  'Drizzle with olive oil and sprinkle Italian seasoning',
  'Bake for 25 minutes until chicken is cooked through',
  'Let rest for 5 minutes before serving',
];

const toDetailMeal = (meal: HomeMeal): MealDetailMeal => {
  const prepTime = 10;
  const cookTime = Math.max(meal.totalTime - prepTime, 10);

  return {
    ...meal,
    prepTime,
    cookTime,
    servings: 2,
    carbs: 28,
    fat: 18,
    ingredients,
    steps,
  };
};

export default function App() {
  const [selectedMeal, setSelectedMeal] = useState<MealDetailMeal | null>(null);

  return (
    <SafeAreaProvider>
      {selectedMeal ? (
        <MealDetailPage
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onMakeMeal={() => Alert.alert('Saved', `${selectedMeal.name} added to your plan.`)}
        />
      ) : (
        <HomePage onOpenMeal={(meal) => setSelectedMeal(toDetailMeal(meal))} />
      )}
    </SafeAreaProvider>
  );
}
