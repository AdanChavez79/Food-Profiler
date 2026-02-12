import React, { useMemo, useState } from "react";
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
  ChefHat,
  Clock,
  DollarSign,
  History,
  Home,
  Search,
} from "lucide-react-native";

type Meal = {
  id: string;
  name: string;
  image: string;
  cost: number;
  difficulty: string;
  totalTime: number;
  calories: number;
  protein: number;
  tags: string[];
};

const featuredMeal: Meal = {
  id: "1",
  name: "One-Pan Chicken & Vegetables",
  image:
    "https://images.unsplash.com/photo-1662611284583-f34180194370?auto=format&fit=crop&w=1400&q=80",
  cost: 8.5,
  difficulty: "Easy",
  totalTime: 35,
  calories: 420,
  protein: 35,
  tags: ["healthy", "quick", "one-pan"],
};

const mealNames = [
  "Lemon Herb Salmon Bowl",
  "Turkey Taco Lettuce Wraps",
  "Garlic Shrimp Pasta",
  "Mediterranean Chickpea Plate",
  "Teriyaki Tofu Stir Fry",
  "Beef & Broccoli Rice Bowl",
  "Avocado Egg Toast Stack",
  "Thai Peanut Chicken Noodles",
  "Roasted Veggie Quinoa Mix",
  "Spicy Tuna Poke Bowl",
];

const HomePage = () => {
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();

  const recommendations = useMemo<Meal[]>(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        if (i === 0) return featuredMeal;
        return {
          ...featuredMeal,
          id: String(i + 1),
          name: mealNames[i - 1] ?? `Meal Recommendation ${i + 1}`,
          totalTime: 25 + i * 3,
          cost: Number((7.5 + i * 0.65).toFixed(2)),
          calories: 360 + i * 25,
          protein: 24 + i * 2,
          difficulty: i % 3 === 0 ? "Easy" : i % 3 === 1 ? "Medium" : "Hard",
          tags:
            i % 2 === 0
              ? ["protein", "balanced", "weekday"]
              : ["quick", "flavorful", "meal-prep"],
        };
      }),
    []
  );

  const MealStats = ({ meal }: { meal: Meal }) => (
    <View className="mt-2 flex-row items-center gap-4">
      <View className="flex-row items-center">
        <Clock size={14} color="#FFFFFF" />
        <Text className="ml-1 text-sm text-white/90">{meal.totalTime} min</Text>
      </View>
      <View className="flex-row items-center">
        <DollarSign size={14} color="#FFFFFF" />
        <Text className="ml-1 text-sm text-white/90">${meal.cost.toFixed(2)}</Text>
      </View>
      <View className="flex-row items-center">
        <ChefHat size={14} color="#FFFFFF" />
        <Text className="ml-1 text-sm text-white/90">{meal.difficulty}</Text>
      </View>
    </View>
  );

  const FeaturedCard = ({ meal }: { meal: Meal }) => (
    <Pressable
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      className="h-[400px] overflow-hidden rounded-2xl shadow-lg"
    >
      <ImageBackground source={{ uri: meal.image }} className="h-full w-full">
        <LinearGradient
          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.80)"]}
          locations={[0, 0.5, 1]}
          className="h-full w-full justify-between p-4"
        >
          <View className="self-start rounded-full bg-emerald-500 px-3 py-1">
            <Text className="text-xs font-semibold text-white">* Today&apos;s Pick</Text>
          </View>

          <View>
            <Text className="text-2xl font-bold text-white">{meal.name}</Text>
            <MealStats meal={meal} />
            <View className="mt-3 flex-row flex-wrap gap-2">
              {meal.tags.map((tag) => (
                <View key={tag} className="rounded-lg bg-white/20 px-2.5 py-1">
                  <Text className="text-xs capitalize text-white">{tag}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-3 text-xs text-white/80">
              {meal.calories} calories - {meal.protein}g protein
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );

  const RecommendationCard = ({ meal }: { meal: Meal }) => {
    const isFeatured = meal.id === featuredMeal.id;

    return (
      <Pressable
        onPress={() => {}}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.98 : isFeatured ? 1.01 : 1 }] },
        ]}
        className={`h-[280px] overflow-hidden rounded-2xl shadow-lg ${
          isFeatured ? "ring-4 ring-emerald-500" : ""
        }`}
      >
        <ImageBackground source={{ uri: meal.image }} className="h-full w-full">
          <LinearGradient
            colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.80)"]}
            locations={[0, 0.5, 1]}
            className="h-full w-full justify-end p-4"
          >
            <Text className="text-xl font-bold text-white">{meal.name}</Text>
            <MealStats meal={meal} />
            <Text className="mt-3 text-xs text-white/80">
              {meal.calories} calories - {meal.protein}g protein
            </Text>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50">
      <View className="z-20 border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <ChefHat size={24} color="#FFFFFF" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold text-slate-900">MealPlanner</Text>
              <Text className="text-xs text-slate-500">Smart meal suggestions</Text>
            </View>
          </View>

          {expanded && (
            <Pressable
              hitSlop={10}
              onPress={() => setExpanded(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="px-2 py-1"
            >
              <Text className="font-semibold text-emerald-600">Back</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 96 + Math.max(insets.bottom, 12),
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {!expanded ? (
          <View>
            <Text className="text-2xl font-bold text-slate-900">Your Daily Pick</Text>
            <Text className="mb-4 mt-1 text-slate-600">
              Tap to see more options tailored for you
            </Text>
            <FeaturedCard meal={featuredMeal} />
          </View>
        ) : (
          <View>
            <Text className="text-2xl font-bold text-slate-900">Recommended For You</Text>
            <Text className="mb-4 mt-1 text-slate-600">
              10 meals selected based on your preferences
            </Text>

            <View className="gap-4">
              {recommendations.map((meal) => (
                <RecommendationCard key={meal.id} meal={meal} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white px-2 pt-2"
      >
        <View className="flex-row items-center justify-around">
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="items-center"
          >
            <Home size={24} color="#059669" />
            <Text className="mt-1 text-xs font-medium text-emerald-600">Home</Text>
          </Pressable>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="items-center"
          >
            <Search size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">Search</Text>
          </Pressable>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="items-center"
          >
            <History size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">History</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HomePage;
