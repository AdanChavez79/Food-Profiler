import React, { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

export type UserPreferences = {
  likes: string[];
  dislikes: string[];
  allergies: string[];
};

type PreferenceKey = "likes" | "dislikes" | "allergies";

type PreferencesPageProps = {
  preferences: UserPreferences;
  onClose: () => void;
  onSave: (preferences: UserPreferences) => void;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
};

const sectionMeta: Array<{ key: PreferenceKey; title: string; placeholder: string }> = [
  // { key: "likes", title: "Likes", placeholder: "Add foods you enjoy" },
  // { key: "dislikes", title: "Dislikes", placeholder: "Add foods to avoid" },
  { key: "allergies", title: "Unwanted Ingredients & Allergies", placeholder: "Add unwanted ingredients or allergens (nuts, dairy...)" },
];

const PreferencesPage = ({ preferences, onClose, onSave, setPreferences }: PreferencesPageProps) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [inputs, setInputs] = useState<Record<PreferenceKey, string>>({
    likes: "",
    dislikes: "",
    allergies: "",
  });
  const [ingredientMap, setIngredientMap] = useState<Record<string, number>>({});
  const [filteredIngredients, setFilteredIngredients] = useState<string[]>([]);

  const handleInputChange = (key: PreferenceKey, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));

    if (key === "allergies" && value.trim().length > 0) {
      const filtered = Object.keys(ingredientMap)
        .filter(
          (ingredient) =>
            ingredient.includes(value.toLowerCase()) &&
            !draft.allergies.some((a) => a.toLowerCase() === ingredient)
        )
        .slice(0, 7);
      setFilteredIngredients(filtered);
    } else {
      setFilteredIngredients([]);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/all_ingredients`
      );
      const data = await response.json();

      const map: Record<string, number> = {};
      data.forEach((item: any) => {
        map[item.name.toLowerCase()] = item.id;
      });

      setIngredientMap(map);
      console.log("Ingredients:", data);
    } catch (err) {
      console.error("Failed to get ingredients", err);
    }
  };

  useEffect(() => {
    fetchIngredients();
    // fetchUserAllergies();
  }, []);

  const addItem = async (key: PreferenceKey) => {
    const raw = inputs[key].trim();
    if (!raw) return;

    if (key === "allergies") {
      const id = ingredientMap[raw.toLowerCase()];
      if (!id) {
        alert("Ingredient not found");
        return;
      }

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/add_user_allergy?user_id=3&allergy=${id}`,
          {
            method: "POST",
          }
        );

        const data = await response.json();
        console.log("Added allergy:", data);

      } catch (err) {
        console.error("Error adding allergy:", err);
        return;
      }
    }

    setPreferences(prev => ({
      ...prev,
      allergies: [...prev.allergies, raw],
    }));

    setDraft((prev) => {
      const exists = prev[key].some(
        (item) => item.toLowerCase() === raw.toLowerCase()
      );
      if (exists) return prev;
      return { ...prev, [key]: [...prev[key], raw] };
    });

    setInputs((prev) => ({ ...prev, [key]: "" }));
  };

  const removeItem = async (key: PreferenceKey, value: string) => {
    if (key === "allergies") {
      const id = ingredientMap[value.toLowerCase()];
      if (!id) return;

      try {
        const response = await fetch(
          `http://127.0.0.1:8000/delete_user_allergy?user_id=3&allergy=${id}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();
        console.log("Deleted allergy:", data);
      } catch (err) {
        console.error("Error deleting from allerg table:", err);
        return;
      }
    }

    setPreferences(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== value),
    }));


    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((item) => item !== value) }));
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50">
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">Food Preferences</Text>
            <Text className="text-xs text-slate-500">Track dislikes, and allergies</Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
          >
            <X size={18} color="#0F172A" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 112 + Math.max(insets.bottom, 12),
        }}
        showsVerticalScrollIndicator={false}
      >
        {sectionMeta.map((section) => (
          <View key={section.key} className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
            <Text className="mb-3 text-base font-semibold text-slate-900">{section.title}</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={inputs[section.key]}
                onChangeText={(value) => handleInputChange(section.key, value)}
                onSubmitEditing={() => addItem(section.key)}
                placeholder={section.placeholder}
                placeholderTextColor="#94A3B8"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
              <Pressable
                onPress={() => addItem(section.key)}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="rounded-lg bg-emerald-500 px-4 py-2"
              >
                <Text className="font-semibold text-white">Add</Text>
              </Pressable>
            </View>
            {section.key === "allergies" && filteredIngredients.length > 0 && (
              <View className="mt-1 rounded-lg border border-slate-300 bg-white shadow-md">
                {filteredIngredients.map((ingredient) => (
                  <Pressable
                    key={ingredient}
                    onPress={() => {
                      setInputs((prev) => ({ ...prev, allergies: ingredient }));
                      setFilteredIngredients([]);
                    }}
                    className="px-3 py-2"
                  >
                    <Text className="text-slate-900">{ingredient}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View className="mt-3 flex-row flex-wrap gap-2">
              {draft[section.key].length === 0 ? (
                <Text className="text-sm text-slate-400">No items yet</Text>
              ) : (
                draft[section.key].map((item) => (
                  <View
                    key={`${section.key}-${item}`}
                    className="flex-row items-center rounded-full bg-slate-100 px-3 py-1.5"
                  >
                    <Text className="text-sm text-slate-700">{item}</Text>
                    <Pressable
                      onPress={() => removeItem(section.key, item)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="ml-2"
                    >
                      <X size={14} color="#475569" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pt-3"
      >
        <Pressable
          onPress={() => onSave(draft)}
          style={({ pressed }) => [{ backgroundColor: pressed ? "#059669" : "#10B981" }]}
          className="items-center rounded-xl py-4"
        >
          <Text className="text-base font-semibold text-white">Save Preferences</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default PreferencesPage;
