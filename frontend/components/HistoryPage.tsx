import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, History, Home, Search, Star } from 'lucide-react-native';

type HistoryMeal = {
  id: string;
  name: string;
  image: string;
  totalTime: number;
  servings: number;
  calories: number;
  rating: number;
  recipe_category: string;
  macro_classification: string;
  calories_classification: string;
  ingredients: string[];
  instructions: string[];
};

type HistoryPageProps = {
  meals: HistoryMeal[];
  onBack: () => void;
  onOpenSearch: () => void;
  onOpenMeal: (meal: HistoryMeal) => void;
};

const HistoryPage = ({ meals, onBack, onOpenSearch, onOpenMeal }: HistoryPageProps) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50">
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <History size={22} color="#FFFFFF" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold text-slate-900">History</Text>
              <Text className="text-xs text-slate-500">Your favorited meals</Text>
            </View>
          </View>
          <Text className="text-xs font-semibold text-emerald-700">{meals.length} saved</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 96 + Math.max(insets.bottom, 12),
        }}
        showsVerticalScrollIndicator={false}
      >
        {meals.length === 0 ? (
          <View className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10">
            <Text className="text-center text-lg font-semibold text-slate-900">No favorites yet</Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              Add a meal to favorites from the detail page and it will show here.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {meals.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => onOpenMeal(meal)}
                style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <Image source={{ uri: meal.image }} className="h-44 w-full" resizeMode="cover" />
                <View className="p-4">
                  <Text className="text-lg font-bold text-slate-900">{meal.name}</Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-1">
                      <Clock size={13} color="#475569" />
                      <Text className="ml-1 text-xs text-slate-700">{meal.totalTime} min</Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-1">
                      <Star size={13} color="#475569" />
                      <Text className="ml-1 text-xs text-slate-700">{meal.rating}</Text>
                    </View>
                    <View className="rounded-full bg-emerald-50 px-3 py-1">
                      <Text className="text-xs text-emerald-700">{meal.calories} cal</Text>
                    </View>
                  </View>
                  <Text className="mt-3 text-sm text-slate-600">{meal.recipe_category}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-2 pt-2"
      >
        <View className="flex-row items-center justify-around">
          <Pressable onPress={onBack} className="items-center">
            <Home size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">Home</Text>
          </Pressable>
          <Pressable onPress={onOpenSearch} className="items-center">
            <Search size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">Search</Text>
          </Pressable>
          <View className="items-center">
            <History size={24} color="#059669" />
            <Text className="mt-1 text-xs font-medium text-emerald-600">History</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HistoryPage;
