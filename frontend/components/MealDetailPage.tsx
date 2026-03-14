import React, { useEffect, useState } from "react";

import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Clock,
  DollarSign,
  ChefHat,
  Users,
  Flame,
  Star,

} from "lucide-react-native";

type Meal = {
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
  rating: number;
  recipe_category: string;
  macro_classification: string;
  calories_classification: string;
  ingredients: string[];
  instructions: string[];
};

type MealDetailProps = {
  meal?: Meal;
  onClose: () => void;
  onMakeMeal: () => void;
};

const sampleMeal: Meal = {
  id: "1",
  name: "One-Pan Chicken & Vegetables",
  image:
    "https://images.unsplash.com/photo-1662611284583-f34180194370?auto=format&fit=crop&w=1400&q=80",
  cost: 8.5,
  difficulty: "Easy",
  prepTime: 10,
  cookTime: 25,
  totalTime: 35,
  servings: 2,
  calories: 420,
  protein: 35,
  carbs: 28,
  fat: 18,
  ingredients: [
    "2 chicken breasts",
    "1 cup broccoli florets",
    "1 bell pepper, sliced",
    "1 cup cherry tomatoes",
    "2 tbsp olive oil",
    "1 tsp garlic powder",
    "Salt and pepper to taste",
    "1 tsp Italian seasoning",
  ],
  instructions: ["Example"],

  rating: 5,
  macro_classification: "string",
  calories_classification: "string",
  recipe_category: "string",
};

const MealDetailPage = ({ meal = sampleMeal, onClose, onMakeMeal }: MealDetailProps) => {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState<string[]>(meal.ingredients);
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/meal_ingredients?meal_id=${meal.id}`
        );
        const data = await response.json();

        const ingredientNames = data.map((item: { name: string }) => item.name);
        console.log(ingredientNames);
        setIngredients(ingredientNames); 
      } catch (err) {
        console.error(err);
      }
    };

    fetchIngredients();
  }, [meal.id]);
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 140 + Math.max(insets.bottom, 12),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="h-64 overflow-hidden">
          <ImageBackground source={{ uri: meal.image }} className="h-full w-full">
            <LinearGradient
              colors={["rgba(0,0,0,0.00)", "rgba(0,0,0,0.60)"]}
              locations={[0.35, 1]}
              className="h-full w-full justify-between p-4"
            >
              <View className="items-end">
                <Pressable
                  hitSlop={10}
                  onPress={onClose}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow"
                >
                  <X size={20} color="#111827" />
                </Pressable>
              </View>

              <View>
                <Text className="mb-2 text-3xl font-bold text-white">{meal.name}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        <View className="px-6 py-6 pb-28">
          <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
            <View className="w-[48.5%] rounded-xl bg-gray-50 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <Clock size={16} color="#4B5563" />
                <Text className="text-sm text-gray-600">Total Time</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">{meal.totalTime} min</Text>
              {/* <Text className="text-xs text-gray-500">
                Prep: {meal.prepTime}min • Cook: {meal.cookTime}min
              </Text> */}
            </View>

            <View className="w-[48.5%] rounded-xl bg-gray-50 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <Star size={16} color="#4B5563" />
                <Text className="text-sm text-gray-600">Rating</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">{meal.rating}</Text>
              {/* <Text className="text-xs text-gray-500">Per serving</Text> */}
            </View>

            <View className="w-[48.5%] rounded-xl bg-gray-50 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <ChefHat size={16} color="#4B5563" />
                <Text className="text-sm text-gray-600">Recipe Category</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">{meal.recipe_category}</Text>
              {/* <Text className="text-xs text-gray-500">Skill level</Text> */}
            </View>

            <View className="w-[48.5%] rounded-xl bg-gray-50 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <Users size={16} color="#4B5563" />
                <Text className="text-sm text-gray-600">Servings</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">{meal.servings}</Text>
              <Text className="text-xs text-gray-500">People</Text>
            </View>
          </View>

          <View className="mb-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
            <View className="mb-3 flex-row items-center gap-2">
              <Flame size={18} color="#111827" />
              <Text className="text-base font-semibold text-gray-900">Nutrition Facts</Text>
            </View>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-emerald-600">{meal.calories}</Text>
                <Text className="text-xs text-gray-600">Calories</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-emerald-600">{meal.calories_classification}</Text>
                <Text className="text-xs text-gray-600">Calories class</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-emerald-600">{meal.macro_classification}</Text>
                <Text className="text-xs text-gray-600">Macro class</Text>
              </View>
              {/* <View className="items-center">
                <Text className="text-2xl font-bold text-emerald-600">{meal.fat}g</Text>
                <Text className="text-xs text-gray-600">Fat</Text>
              </View> */}
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-3 text-xl font-semibold text-gray-900">Ingredients</Text>
            <View className="gap-2">
              {ingredients.map((ingredient) => (
                <View key={ingredient} className="flex-row items-start gap-3">
                  <View className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
                  <Text className="flex-1 text-gray-700">{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>

          <View>
            <Text className="mb-3 text-xl font-semibold text-gray-900">Instructions</Text>
            <View className="gap-4">
              {meal.instructions.map((step, index) => (
                <View key={`${index + 1}-${step}`} className="flex-row items-start gap-4">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                    <Text className="font-semibold text-white">{index + 1}</Text>
                  </View>
                  <Text className="flex-1 pt-1 text-gray-700">{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 pt-4"
      >
        <Pressable
          onPress={onMakeMeal}
          style={({ pressed }) => [{ backgroundColor: pressed ? "#059669" : "#10B981" }]}
          className="w-full items-center rounded-xl py-4"
        >
          <Text className="text-base font-semibold text-white">I&apos;ll Make This Meal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default MealDetailPage;
