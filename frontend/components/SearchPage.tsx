import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Home, History, Search, Utensils } from "lucide-react-native";

type SearchMeal = {
  id: string;
  name: string;
  image: string;
  rating: number;
  totalTime: number;
  calories: number;
  calories_classification: string;
  macro_classification: string;
  servings: number;
  recipe_category: string;
  instructions: string[];
};

type SearchPageProps = {
  onBack: () => void;
  onOpenHistory?: () => void;
  onOpenMeal: (meal: SearchMeal) => void;
};

const SearchPage = ({ onBack, onOpenHistory, onOpenMeal }: SearchPageProps) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const numColumns = width >= 920 ? 3 : width >= 560 ? 2 : 1;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [inverseIndex, setInverseIndex] = useState<{ [ingredient: string]: number[] }>({});
  const [meals, setMeals] = useState<SearchMeal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInverseIndex = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/get_inverse_index");
        const data: [string, number[]][] = await response.json();
        const index: { [key: string]: number[] } = {};
        data.forEach(([ingredient, meal_ids]) => (index[ingredient] = meal_ids));
        setInverseIndex(index);
      } catch (err) {
        console.error("Failed to fetch inverse index", err);
      }
    };
    fetchInverseIndex();
  }, []);

  useEffect(() => {
    if (!query) return setSuggestions([]);
    const filtered = Object.keys(inverseIndex)
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 7);
    setSuggestions(filtered);
  }, [query, inverseIndex]);

  useEffect(() => {
    if (!selectedIngredient) return;

    const meal_ids = inverseIndex[selectedIngredient] || [];
    const fetchMeals = async () => {
      setLoading(true);
      try {
        if (meal_ids.length === 0) {
          setMeals([]);
          setLoading(false);
          return;
        }

        const queryString = meal_ids.map((id) => `meal_ids=${id}`).join("&");
        const response = await fetch(`http://127.0.0.1:8000/meals?${queryString}`);
        const data = await response.json();

        const formattedMeals: SearchMeal[] = data.map((meal: any) => {
          let imageUrl = "";
          try {
            const images = JSON.parse(meal.images.replace(/'/g, '"'));
            imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : "";
          } catch {
            imageUrl = "";
          }

          let instructions: string[] = [];
          try {
            instructions = JSON.parse(meal.recipe_instructions.replace(/'/g, '"'));
            if (!Array.isArray(instructions)) instructions = [];
          } catch {
            instructions = [];
          }

          return {
            id: String(meal.id),
            name: meal.name,
            image: imageUrl,
            rating: meal.aggregated_rating,
            totalTime: meal.totaltime_min,
            calories: meal.calories,
            calories_classification: meal.calories_classification,
            macro_classification: meal.macro_classification,
            servings: meal.recipe_servings,
            instructions,
            recipe_category: meal.recipe_category,
          };
        });

        setMeals(formattedMeals);
      } catch (err) {
        console.error("Failed to fetch meals", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, [selectedIngredient]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
        <Pressable onPress={onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" }}>
          <ArrowLeft size={18} color="#0F172A" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0F172A" }}>Search Meals</Text>
      </View>

      <View style={{ padding: 16, backgroundColor: "#FFFFFF" }}>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 12, backgroundColor: "#FFFFFF" }}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: "#0F172A" }}
            placeholder="Search by ingredient..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {query && suggestions.length > 0 && (
          <ScrollView style={{ maxHeight: 200, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, marginTop: 4, backgroundColor: "#FFFFFF" }}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => {
                  setSelectedIngredient(suggestion);
                  setQuery("");
                  setSuggestions([]);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 12 }}
              >
                <Text>{suggestion}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {loading && <Text style={{ textAlign: "center", marginVertical: 20 }}>Loading meals...</Text>}

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: "space-between", marginBottom: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onOpenMeal(item)}
            style={{
              flex: 1,
              marginBottom: 12,
              overflow: "hidden",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              backgroundColor: "#FFFFFF",
            }}
          >
            <Image
              source={{ uri: item.image }}
              style={{ height: 160, width: "100%" }}
              resizeMode="cover"
            />
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>{item.name}</Text>
            </View>
          </Pressable>
        )}
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
          <Pressable onPress={onOpenHistory} className="items-center">
            <History size={24} color="#475569" />
            <Text className="mt-1 text-xs text-slate-600">History</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SearchPage;