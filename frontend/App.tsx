import { useState } from 'react';
import { Alert } from 'react-native';
import HomePage, { HomeMeal } from 'components/HomePage';
import HistoryPage from 'components/HistoryPage';
import MealDetailPage from 'components/MealDetailPage';
import PreferencesPage, { UserPreferences } from 'components/PreferencesPage';
import SearchPage from 'components/SearchPage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './global.css';

import { RecommendationsProvider } from './RecommendationsContext';

type MealDetailMeal = {
  id: string;
  name: string;
  image: string;
  // cost: number;
  // difficulty: string;
  // prepTime: number;
  // cookTime: number;
  totalTime: number;
  servings: number;
  calories: number;
  // protein: number;
  // carbs: number;
  // fat: number;
  rating: number;
  recipe_category: string;
  macro_classification: string;
  calories_classification: string;
  ingredients: string[];
  instructions: string[];
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

// const instructions = [
//   'Preheat oven to 400F (200C)',
//   'Season chicken breasts with salt, pepper, and garlic powder',
//   'Arrange chicken and vegetables on a baking sheet',
//   'Drizzle with olive oil and sprinkle Italian seasoning',
//   'Bake for 25 minutes until chicken is cooked through',
//   'Let rest for 5 minutes before serving',
// ];

const toDetailMeal = (meal: HomeMeal): MealDetailMeal => {
  // const prepTime = 10;
  // const cookTime = Math.max(meal.totalTime - prepTime, 10);

  return {
    ...meal,
    // prepTime,
    // cookTime,
    // carbs: 28,
    // fat: 18,
    ingredients,
  };
};

export default function App() {
  const [selectedMeal, setSelectedMeal] = useState<MealDetailMeal | null>(null);
  const [screen, setScreen] = useState<'home' | 'preferences' | 'search' | 'history'>('home');
  const [favoriteMeals, setFavoriteMeals] = useState<MealDetailMeal[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    likes: [],
    dislikes: [],
    allergies: [],
  });

  const preferenceSummary = `${preferences.likes.length} likes | ${preferences.dislikes.length} dislikes | ${preferences.allergies.length} allergies`;
  const selectedMealIsFavorite = selectedMeal
    ? favoriteMeals.some((meal) => meal.id === selectedMeal.id)
    : false;

  const toggleFavoriteMeal = (meal: MealDetailMeal) => {
    const exists = favoriteMeals.some((favoriteMeal) => favoriteMeal.id === meal.id);

    if (exists) {
      setFavoriteMeals((current) => current.filter((favoriteMeal) => favoriteMeal.id !== meal.id));
      Alert.alert('Removed', `${meal.name} removed from favorites.`);
      return;
    }

    setFavoriteMeals((current) => [meal, ...current]);
    Alert.alert('Saved', `${meal.name} added to favorites.`);
  };

  return (
    <SafeAreaProvider>
      <RecommendationsProvider>
      {selectedMeal ? (
        <MealDetailPage
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          isFavorite={selectedMealIsFavorite}
          onToggleFavorite={() => toggleFavoriteMeal(selectedMeal)}
        />
      ) : screen === 'preferences' ? (
        <PreferencesPage
          preferences={preferences}
          onClose={() => setScreen('home')}
          onSave={(next) => {
            setPreferences(next);
            setScreen('home');
            Alert.alert('Saved', 'Your food preferences were updated.');
          }}
        />
      ) : screen === 'search' ? (
        <SearchPage
          onBack={() => setScreen('home')}
          onOpenHistory={() => setScreen('history')}
          onOpenMeal={(meal) => setSelectedMeal(toDetailMeal(meal))}
        />
      ) : screen === 'history' ? (
        <HistoryPage
          //meals={favoriteMeals}
          onBack={() => setScreen('home')}
          onOpenSearch={() => setScreen('search')}
          onOpenMeal={(meal) => setSelectedMeal(toDetailMeal(meal))}
        />
      ) : (
        <HomePage
          onOpenMeal={(meal) => setSelectedMeal(toDetailMeal(meal))}
          onOpenPreferences={() => setScreen('preferences')}
          onOpenSearch={() => setScreen('search')}
          onOpenHistory={() => setScreen('history')}
          preferenceSummary={preferenceSummary}
        />
      )}
    </RecommendationsProvider>
    </SafeAreaProvider>
  );
}
