import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  History,
  Home,
  Search,
  SlidersHorizontal,
  Utensils,
  X,
} from "lucide-react-native";
import type { HomeMeal } from "components/HomePage";

type TimeOfDay = "Breakfast" | "Lunch" | "Dinner" | "Snack";
type Difficulty = "Easy" | "Medium" | "Hard";
type CostTier = "$" | "$$" | "$$$";

type SearchMeal = {
  id: string;
  name: string;
  image: string;
  timeEstimate: number;
  cost: CostTier;
  costValue: number;
  difficulty: Difficulty;
  timeOfDay: TimeOfDay[];
  categories: string[];
  ingredients: string[];
  description: string;
  calories: number;
  protein: number;
};

type SortMode = "Relevance" | "CostLowHigh" | "CostHighLow" | "TimeShortest" | "Difficulty";

type Filters = {
  timeOfDay: TimeOfDay[];
  difficulty: Difficulty[];
  cost: CostTier[];
  category: string[];
};

type SearchPageProps = {
  onBack: () => void;
  onOpenMeal: (meal: HomeMeal) => void;
};

const sortLabels: Record<SortMode, string> = {
  Relevance: "Relevance",
  CostLowHigh: "Cost (Low to High)",
  CostHighLow: "Cost (High to Low)",
  TimeShortest: "Time (Shortest)",
  Difficulty: "Difficulty",
};

const difficultyRank: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

const categories = [
  "Vegetarian",
  "Vegan",
  "Protein-Rich",
  "Comfort Food",
  "Healthy",
  "Quick Meals",
];

const emptyFilters: Filters = {
  timeOfDay: [],
  difficulty: [],
  cost: [],
  category: [],
};

const meals: SearchMeal[] = [
  {
    id: "s1",
    name: "Quick Veggie Stir-Fry",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 20,
    cost: "$",
    costValue: 4.75,
    difficulty: "Easy",
    timeOfDay: ["Lunch", "Dinner"],
    categories: ["Vegetarian", "Quick Meals", "Healthy"],
    ingredients: ["broccoli", "bell pepper", "soy sauce", "rice"],
    description: "A fast and healthy stir-fry for busy class days.",
    calories: 380,
    protein: 14,
  },
  {
    id: "s2",
    name: "Protein Oatmeal Bowl",
    image:
      "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 10,
    cost: "$",
    costValue: 3.25,
    difficulty: "Easy",
    timeOfDay: ["Breakfast"],
    categories: ["Protein-Rich", "Healthy", "Quick Meals"],
    ingredients: ["oats", "milk", "banana", "peanut butter"],
    description: "Warm oats with protein to power morning classes.",
    calories: 430,
    protein: 24,
  },
  {
    id: "s3",
    name: "Chicken Burrito Bowl",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 28,
    cost: "$$",
    costValue: 8.8,
    difficulty: "Medium",
    timeOfDay: ["Lunch", "Dinner"],
    categories: ["Protein-Rich", "Comfort Food"],
    ingredients: ["chicken", "rice", "beans", "corn", "salsa"],
    description: "Campus-style burrito bowl with high protein and flavor.",
    calories: 610,
    protein: 38,
  },
  {
    id: "s4",
    name: "Greek Yogurt Parfait",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 8,
    cost: "$",
    costValue: 3.9,
    difficulty: "Easy",
    timeOfDay: ["Breakfast", "Snack"],
    categories: ["Healthy", "Quick Meals"],
    ingredients: ["yogurt", "berries", "granola", "honey"],
    description: "Light and fresh parfait you can build in minutes.",
    calories: 290,
    protein: 16,
  },
  {
    id: "s5",
    name: "One-Pot Vegan Chili",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 35,
    cost: "$$",
    costValue: 6.5,
    difficulty: "Medium",
    timeOfDay: ["Lunch", "Dinner"],
    categories: ["Vegan", "Comfort Food", "Healthy"],
    ingredients: ["beans", "tomato", "onion", "corn", "spices"],
    description: "Hearty vegan chili that reheats perfectly for leftovers.",
    calories: 470,
    protein: 19,
  },
  {
    id: "s6",
    name: "Salmon Rice Plate",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 32,
    cost: "$$$",
    costValue: 12.5,
    difficulty: "Hard",
    timeOfDay: ["Dinner"],
    categories: ["Protein-Rich", "Healthy"],
    ingredients: ["salmon", "rice", "asparagus", "lemon"],
    description: "Balanced dinner with omega-3 rich salmon.",
    calories: 560,
    protein: 41,
  },
  {
    id: "s7",
    name: "Peanut Butter Banana Toast",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 7,
    cost: "$",
    costValue: 2.8,
    difficulty: "Easy",
    timeOfDay: ["Breakfast", "Snack"],
    categories: ["Quick Meals", "Vegetarian"],
    ingredients: ["bread", "banana", "peanut butter", "cinnamon"],
    description: "Quick toast with carbs and protein between classes.",
    calories: 330,
    protein: 11,
  },
  {
    id: "s8",
    name: "Tofu Noodle Bowl",
    image:
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 24,
    cost: "$$",
    costValue: 7.45,
    difficulty: "Medium",
    timeOfDay: ["Lunch", "Dinner"],
    categories: ["Vegan", "Protein-Rich", "Quick Meals"],
    ingredients: ["tofu", "noodles", "carrot", "soy sauce"],
    description: "Flavorful noodle bowl with crispy tofu bites.",
    calories: 520,
    protein: 27,
  },
  {
    id: "s9",
    name: "Caprese Pasta Salad",
    image:
      "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 18,
    cost: "$$",
    costValue: 5.9,
    difficulty: "Easy",
    timeOfDay: ["Lunch"],
    categories: ["Vegetarian", "Healthy"],
    ingredients: ["pasta", "tomato", "mozzarella", "basil"],
    description: "Cold pasta salad that packs well for campus.",
    calories: 440,
    protein: 17,
  },
  {
    id: "s10",
    name: "Loaded Turkey Wrap",
    image:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 15,
    cost: "$$",
    costValue: 6.2,
    difficulty: "Easy",
    timeOfDay: ["Lunch", "Snack"],
    categories: ["Protein-Rich", "Quick Meals"],
    ingredients: ["turkey", "tortilla", "spinach", "hummus"],
    description: "High-protein wrap you can prep in under 15 minutes.",
    calories: 470,
    protein: 32,
  },
  {
    id: "s11",
    name: "Creamy Tomato Gnocchi",
    image:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 30,
    cost: "$$",
    costValue: 9.1,
    difficulty: "Medium",
    timeOfDay: ["Dinner"],
    categories: ["Comfort Food", "Vegetarian"],
    ingredients: ["gnocchi", "tomato", "cream", "parmesan"],
    description: "Comforting weeknight gnocchi with rich tomato sauce.",
    calories: 650,
    protein: 18,
  },
  {
    id: "s12",
    name: "Avocado Chickpea Smash",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    timeEstimate: 12,
    cost: "$",
    costValue: 4.2,
    difficulty: "Easy",
    timeOfDay: ["Breakfast", "Lunch"],
    categories: ["Vegan", "Healthy", "Quick Meals"],
    ingredients: ["avocado", "chickpeas", "bread", "lemon"],
    description: "Bright and filling plant-based toast plate.",
    calories: 390,
    protein: 13,
  },
];

const matchesBucket = <T,>(selected: T[], values: T[]) =>
  selected.length === 0 || selected.some((candidate) => values.includes(candidate));

const SearchPage = ({ onBack, onOpenMeal }: SearchPageProps) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const numColumns = width >= 920 ? 3 : width >= 560 ? 2 : 1;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortMode>("Relevance");
  const [visibleCount, setVisibleCount] = useState(8);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(timer);
  }, [debouncedQuery, filters, sort]);

  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    setRecentSearches((prev) => {
      const next = [debouncedQuery, ...prev.filter((item) => item !== debouncedQuery)];
      return next.slice(0, 5);
    });
  }, [debouncedQuery]);

  useEffect(() => {
    setVisibleCount(8);
  }, [debouncedQuery, filters, sort]);

  const activeFilterCount =
    filters.timeOfDay.length +
    filters.difficulty.length +
    filters.cost.length +
    filters.category.length;

  const filteredMeals = useMemo(() => {
    const searched = meals.filter((meal) => {
      if (!debouncedQuery) return true;
      const haystack = `${meal.name} ${meal.ingredients.join(" ")} ${meal.categories.join(" ")}`.toLowerCase();
      return haystack.includes(debouncedQuery);
    });

    const matched = searched.filter(
      (meal) =>
        matchesBucket(filters.timeOfDay, meal.timeOfDay) &&
        matchesBucket(filters.difficulty, [meal.difficulty]) &&
        matchesBucket(filters.cost, [meal.cost]) &&
        matchesBucket(filters.category, meal.categories)
    );

    return [...matched].sort((a, b) => {
      switch (sort) {
        case "CostLowHigh":
          return a.costValue - b.costValue;
        case "CostHighLow":
          return b.costValue - a.costValue;
        case "TimeShortest":
          return a.timeEstimate - b.timeEstimate;
        case "Difficulty":
          return difficultyRank[a.difficulty] - difficultyRank[b.difficulty];
        default:
          return 0;
      }
    });
  }, [debouncedQuery, filters, sort]);

  const displayedMeals = filteredMeals.slice(0, visibleCount);

  const toggleFilter = <T extends string,>(group: keyof Filters, value: T) => {
    setFilters((prev) => {
      const bucket = prev[group] as T[];
      const nextBucket = bucket.includes(value) ? bucket.filter((item) => item !== value) : [...bucket, value];
      return { ...prev, [group]: nextBucket };
    });
  };

  const clearFilters = () => setFilters(emptyFilters);

  const difficultyColors: Record<Difficulty, string> = {
    Easy: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    Hard: "bg-rose-100 text-rose-700",
  };

  const renderChipRow = <T extends string,>(
    title: string,
    group: keyof Filters,
    options: T[],
    optionLabel?: (option: T) => string
  ) => (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((option) => {
          const isActive = (filters[group] as T[]).includes(option);
          return (
            <Pressable
              key={`${group}-${option}`}
              onPress={() => toggleFilter(group, option)}
              className={`rounded-full border px-3 py-2 ${isActive ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}`}
            >
              <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-700"}`}>
                {optionLabel ? optionLabel(option) : option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const mapToHomeMeal = (meal: SearchMeal): HomeMeal => ({
    id: meal.id,
    name: meal.name,
    image: meal.image,
    cost: meal.costValue,
    difficulty: meal.difficulty,
    totalTime: meal.timeEstimate,
    calories: meal.calories,
    protein: meal.protein,
  });

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50">
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={onBack}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <ArrowLeft size={18} color="#0F172A" />
            </Pressable>
            <View>
              <Text className="text-xl font-bold text-slate-900">Search Meals</Text>
              <Text className="text-xs text-slate-500">Find meals by time, budget, and effort</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={loading ? Array.from({ length: Math.max(numColumns * 2, 4) }, (_, i) => String(i)) : displayedMeals}
        keyExtractor={(item, index) => (typeof item === "string" ? `skeleton-${item}` : `${item.id}-${index}`)}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 600);
            }}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 98 + Math.max(insets.bottom, 12),
          gap: 12,
        }}
        ListHeaderComponent={
          <View>
            <View className="mb-4 flex-row items-center rounded-xl border border-slate-300 bg-white px-3">
              <Search size={16} color="#64748B" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or ingredient..."
                placeholderTextColor="#94A3B8"
                className="flex-1 px-2 py-3 text-slate-900"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="h-7 w-7 items-center justify-center rounded-full bg-slate-100"
                >
                  <X size={14} color="#475569" />
                </Pressable>
              ) : null}
            </View>

            {recentSearches.length > 0 ? (
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {recentSearches.map((recent) => (
                    <Pressable
                      key={recent}
                      onPress={() => setQuery(recent)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-2"
                    >
                      <Text className="text-xs text-slate-700">{recent}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <SlidersHorizontal size={16} color="#334155" />
                  <Text className="text-sm font-semibold text-slate-900">Filters</Text>
                </View>
                {activeFilterCount > 0 ? (
                  <Pressable onPress={clearFilters}>
                    <Text className="text-xs font-semibold text-emerald-600">Clear all</Text>
                  </Pressable>
                ) : null}
              </View>

              {activeFilterCount > 0 ? (
                <Text className="mb-3 text-xs text-slate-500">{activeFilterCount} filters applied</Text>
              ) : null}

              {renderChipRow("Time Of Day", "timeOfDay", ["Breakfast", "Lunch", "Dinner", "Snack"])}
              {renderChipRow("Difficulty", "difficulty", ["Easy", "Medium", "Hard"])}
              {renderChipRow("Cost", "cost", ["$", "$$", "$$$"], (value) =>
                value === "$" ? "$ (under $5)" : value === "$$" ? "$$ ($5-10)" : "$$$ (over $10)"
              )}
              {renderChipRow("Category", "category", categories)}
            </View>

            <View className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
              <Text className="mb-2 text-sm font-semibold text-slate-900">
                {loading ? "Searching meals..." : `${filteredMeals.length} meals found`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {(Object.keys(sortLabels) as SortMode[]).map((mode) => {
                  const active = sort === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setSort(mode)}
                      className={`rounded-full border px-3 py-2 ${active ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}`}
                    >
                      <Text className={`text-xs ${active ? "font-semibold text-white" : "text-slate-700"}`}>
                        {sortLabels[mode]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (typeof item === "string") {
            return (
              <View
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${numColumns > 1 ? "flex-1" : ""}`}
              >
                <View className="h-36 bg-slate-200" />
                <View className="p-3">
                  <View className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
                  <View className="h-3 w-1/2 rounded bg-slate-100" />
                </View>
              </View>
            );
          }

          return (
            <Pressable
              onPress={() => onOpenMeal(mapToHomeMeal(item))}
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${numColumns > 1 ? "flex-1" : ""}`}
              style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
            >
              <Image source={{ uri: item.image }} className="h-40 w-full" resizeMode="cover" />
              <View className="p-3">
                <Text className="text-base font-bold text-slate-900">{item.name}</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-slate-100 px-2 py-1">
                    <Text className="text-[11px] text-slate-700">{item.timeEstimate} min</Text>
                  </View>
                  <View className="rounded-full bg-slate-100 px-2 py-1">
                    <Text className="text-[11px] text-slate-700">{item.cost}</Text>
                  </View>
                  <View className={`rounded-full px-2 py-1 ${difficultyColors[item.difficulty]}`}>
                    <Text className="text-[11px] font-medium">{item.difficulty}</Text>
                  </View>
                  <View className="rounded-full bg-emerald-100 px-2 py-1">
                    <Text className="text-[11px] text-emerald-700">{item.categories[0]}</Text>
                  </View>
                </View>
                <Text numberOfLines={2} className="mt-2 text-xs leading-5 text-slate-600">
                  {item.description}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8">
              <Utensils size={24} color="#64748B" />
              <Text className="mt-2 text-base font-semibold text-slate-800">No meals found matching your criteria</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">Try adjusting your filters.</Text>
              <Pressable onPress={clearFilters} className="mt-4 rounded-lg bg-emerald-500 px-4 py-2">
                <Text className="font-semibold text-white">Clear Filters</Text>
              </Pressable>
              <View className="mt-5 w-full">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested Meals
                </Text>
                {meals.slice(0, 3).map((meal) => (
                  <Pressable
                    key={`suggested-${meal.id}`}
                    onPress={() => onOpenMeal(mapToHomeMeal(meal))}
                    className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <Text className="font-medium text-slate-700">{meal.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          !loading && filteredMeals.length > visibleCount ? (
            <Pressable onPress={() => setVisibleCount((prev) => prev + 8)} className="mt-2 rounded-xl bg-white py-3">
              <Text className="text-center font-semibold text-emerald-600">Load More</Text>
            </Pressable>
          ) : null
        }
      />

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-2 pt-2"
      >
        <View className="flex-row items-center justify-around">
          <Pressable onPress={onBack} className="items-center">
            <Home size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">Home</Text>
          </Pressable>
          <View className="items-center">
            <Search size={24} color="#059669" />
            <Text className="mt-1 text-xs font-medium text-emerald-600">Search</Text>
          </View>
          <View className="items-center">
            <History size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">History</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SearchPage;
