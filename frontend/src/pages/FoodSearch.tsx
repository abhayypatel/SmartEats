import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  PlusIcon,
  FireIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/UI/LoadingSpinner";
import { useMeals } from "../contexts/MealsContext";

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  common_serving_sizes: Array<{
    name: string;
    grams: number;
  }>;
}

interface SelectedFood extends FoodItem {
  serving_size: string;
  serving_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const FoodSearch: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addMeal } = useMeals();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<SelectedFood | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [customGrams, setCustomGrams] = useState("");
  const [mealType, setMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snack"
  >("breakfast");

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["foodSearch", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      try {
        // Use USDA FoodData Central API
        const USDA_API_KEY = "DKiAtgrlLVHXiBDMfg1FxcaV2R3C23frGh2ZW8nv";
        const response = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(searchQuery)}&api_key=${USDA_API_KEY}&dataType=Foundation,SR%20Legacy&pageSize=10`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch food data");
        }

        const data = await response.json();

        // Transform USDA data to our format
        const transformedResults: FoodItem[] =
          data.foods?.map((food: any) => {
            // Get nutrients from the food
            const nutrients = food.foodNutrients || [];

            // Find specific nutrients by their nutrient IDs
            const getNutrientValue = (nutrientId: number) => {
              const nutrient = nutrients.find(
                (n: any) => n.nutrientId === nutrientId,
              );
              return nutrient ? nutrient.value || 0 : 0;
            };

            // USDA Nutrient IDs:
            // 1008 = Energy (calories)
            // 1003 = Protein
            // 1005 = Carbohydrates
            // 1004 = Total lipid (fat)
            // 1079 = Fiber
            // 2000 = Sugars

            const calories = getNutrientValue(1008);
            const protein = getNutrientValue(1003);
            const carbs = getNutrientValue(1005);
            const fat = getNutrientValue(1004);
            const fiber = getNutrientValue(1079);
            const sugar = getNutrientValue(2000);

            // Generate common serving sizes based on food type
            const generateServingSizes = (foodName: string) => {
              const name = foodName.toLowerCase();

              if (name.includes("apple") || name.includes("orange")) {
                return [
                  { name: "1 medium fruit (150g)", grams: 150 },
                  { name: "1 large fruit (200g)", grams: 200 },
                  { name: "100g", grams: 100 },
                ];
              } else if (name.includes("banana")) {
                return [
                  { name: "1 medium banana (118g)", grams: 118 },
                  { name: "1 large banana (136g)", grams: 136 },
                  { name: "100g", grams: 100 },
                ];
              } else if (
                name.includes("chicken") ||
                name.includes("beef") ||
                name.includes("fish")
              ) {
                return [
                  { name: "1 serving (85g)", grams: 85 },
                  { name: "1 large serving (120g)", grams: 120 },
                  { name: "100g", grams: 100 },
                ];
              } else if (name.includes("rice") || name.includes("pasta")) {
                return [
                  { name: "1 cup cooked (195g)", grams: 195 },
                  { name: "1/2 cup cooked (98g)", grams: 98 },
                  { name: "100g", grams: 100 },
                ];
              } else if (name.includes("yogurt") || name.includes("milk")) {
                return [
                  { name: "1 cup (245g)", grams: 245 },
                  { name: "1 container (170g)", grams: 170 },
                  { name: "100g", grams: 100 },
                ];
              } else {
                return [
                  { name: "1 serving (100g)", grams: 100 },
                  { name: "1 large serving (150g)", grams: 150 },
                  { name: "100g", grams: 100 },
                ];
              }
            };

            return {
              id: food.fdcId.toString(),
              name: food.description || "Unknown Food",
              brand: food.brandOwner || undefined,
              calories_per_100g: Math.round(calories),
              protein_per_100g: Math.round(protein * 10) / 10,
              carbs_per_100g: Math.round(carbs * 10) / 10,
              fat_per_100g: Math.round(fat * 10) / 10,
              fiber_per_100g: Math.round(fiber * 10) / 10,
              sugar_per_100g: Math.round(sugar * 10) / 10,
              common_serving_sizes: generateServingSizes(
                food.description || "",
              ),
            };
          }) || [];

        return transformedResults;
      } catch (error) {
        console.error("Error fetching USDA data:", error);

        // Fallback to mock data if API fails
        const mockResults: FoodItem[] = [
          {
            id: "1",
            name: "Chicken Breast, Grilled",
            brand: "Generic",
            calories_per_100g: 165,
            protein_per_100g: 31,
            carbs_per_100g: 0,
            fat_per_100g: 3.6,
            fiber_per_100g: 0,
            common_serving_sizes: [
              { name: "1 medium breast (85g)", grams: 85 },
              { name: "1 large breast (120g)", grams: 120 },
              { name: "100g", grams: 100 },
            ],
          },
          {
            id: "2",
            name: "Brown Rice, Cooked",
            calories_per_100g: 123,
            protein_per_100g: 2.6,
            carbs_per_100g: 23,
            fat_per_100g: 0.9,
            fiber_per_100g: 1.8,
            common_serving_sizes: [
              { name: "1 cup (195g)", grams: 195 },
              { name: "1/2 cup (98g)", grams: 98 },
              { name: "100g", grams: 100 },
            ],
          },
          {
            id: "3",
            name: "Greek Yogurt, Plain",
            brand: "Fage",
            calories_per_100g: 97,
            protein_per_100g: 10,
            carbs_per_100g: 3.6,
            fat_per_100g: 5,
            common_serving_sizes: [
              { name: "1 container (170g)", grams: 170 },
              { name: "1 cup (245g)", grams: 245 },
              { name: "100g", grams: 100 },
            ],
          },
          {
            id: "4",
            name: "Banana, Raw",
            calories_per_100g: 89,
            protein_per_100g: 1.1,
            carbs_per_100g: 23,
            fat_per_100g: 0.3,
            fiber_per_100g: 2.6,
            sugar_per_100g: 12,
            common_serving_sizes: [
              { name: "1 medium banana (118g)", grams: 118 },
              { name: "1 large banana (136g)", grams: 136 },
              { name: "100g", grams: 100 },
            ],
          },
        ].filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchQuery.toLowerCase()),
        );

        return mockResults;
      }
    },
    enabled: searchQuery.length >= 2,
  });

  const calculateNutrition = (food: FoodItem, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
  };

  const handleFoodSelect = (food: FoodItem) => {
    const defaultServing = food.common_serving_sizes[0];
    const nutrition = calculateNutrition(food, defaultServing.grams);

    setSelectedFood({
      ...food,
      serving_size: defaultServing.name,
      serving_grams: defaultServing.grams,
      ...nutrition,
    });
    setShowModal(true);
    setCustomGrams("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedFood(null);
    setCustomGrams("");
  };

  const handleServingSizeChange = (servingSize: string, grams: number) => {
    if (!selectedFood) return;

    const nutrition = calculateNutrition(selectedFood, grams);
    setSelectedFood({
      ...selectedFood,
      serving_size: servingSize,
      serving_grams: grams,
      ...nutrition,
    });
  };

  const handleCustomGramsChange = (grams: string) => {
    setCustomGrams(grams);
    if (!selectedFood || !grams) return;

    const gramsNum = parseFloat(grams);
    if (isNaN(gramsNum)) return;

    const nutrition = calculateNutrition(selectedFood, gramsNum);
    setSelectedFood({
      ...selectedFood,
      serving_size: `${grams}g`,
      serving_grams: gramsNum,
      ...nutrition,
    });
  };

  const handleAddFood = () => {
    if (!selectedFood) return;

    const mealData = {
      type: mealType,
      items: [
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: selectedFood.name,
          brand: selectedFood.brand,
          calories: selectedFood.calories,
          protein: selectedFood.protein,
          carbs: selectedFood.carbs,
          fat: selectedFood.fat,
          serving_size: selectedFood.serving_size,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    try {
      addMeal(mealData);

      // Invalidate queries to refresh the home page stats
      queryClient.invalidateQueries({ queryKey: ["dailyStats"] });
      queryClient.invalidateQueries({ queryKey: ["recentMeals"] });

      toast.success("Food added to meal log!");
      handleCloseModal();
      navigate("/meals");
    } catch (error) {
      toast.error("Failed to add food. Please try again.");
    }
  };

  const popularFoods: FoodItem[] = [
    {
      id: "popular-1",
      name: "Apple, Raw",
      calories_per_100g: 52,
      protein_per_100g: 0.3,
      carbs_per_100g: 14,
      fat_per_100g: 0.2,
      fiber_per_100g: 2.4,
      sugar_per_100g: 10,
      common_serving_sizes: [
        { name: "1 medium apple (182g)", grams: 182 },
        { name: "1 large apple (223g)", grams: 223 },
        { name: "100g", grams: 100 },
      ],
    },
    {
      id: "popular-2",
      name: "Chicken Breast, Grilled",
      brand: "Generic",
      calories_per_100g: 165,
      protein_per_100g: 31,
      carbs_per_100g: 0,
      fat_per_100g: 3.6,
      fiber_per_100g: 0,
      common_serving_sizes: [
        { name: "1 medium breast (85g)", grams: 85 },
        { name: "1 large breast (120g)", grams: 120 },
        { name: "100g", grams: 100 },
      ],
    },
    {
      id: "popular-3",
      name: "Banana, Raw",
      calories_per_100g: 89,
      protein_per_100g: 1.1,
      carbs_per_100g: 23,
      fat_per_100g: 0.3,
      fiber_per_100g: 2.6,
      sugar_per_100g: 12,
      common_serving_sizes: [
        { name: "1 medium banana (118g)", grams: 118 },
        { name: "1 large banana (136g)", grams: 136 },
        { name: "100g", grams: 100 },
      ],
    },
    {
      id: "popular-4",
      name: "Oats, Rolled, Dry",
      calories_per_100g: 389,
      protein_per_100g: 16.9,
      carbs_per_100g: 66,
      fat_per_100g: 6.9,
      fiber_per_100g: 10.6,
      common_serving_sizes: [
        { name: "1/2 cup dry (40g)", grams: 40 },
        { name: "1 cup dry (80g)", grams: 80 },
        { name: "100g", grams: 100 },
      ],
    },
    {
      id: "popular-5",
      name: "Salmon, Atlantic, Cooked",
      calories_per_100g: 206,
      protein_per_100g: 22,
      carbs_per_100g: 0,
      fat_per_100g: 12,
      fiber_per_100g: 0,
      common_serving_sizes: [
        { name: "1 fillet (150g)", grams: 150 },
        { name: "1 serving (85g)", grams: 85 },
        { name: "100g", grams: 100 },
      ],
    },
  ];

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Food Search
        </h1>
        <div className="w-10" />
      </div>

      <div className="p-6 space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search for foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        {searchQuery.length >= 2 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Results
            </h3>

            {isSearching ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : searchResults?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No foods found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults?.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => handleFoodSelect(food)}
                    className="w-full text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {food.name}
                        </h4>
                        {food.brand && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {food.brand}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {food.calories_per_100g} cal per 100g
                        </p>
                      </div>
                      <PlusIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {!searchQuery && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Popular Foods
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {popularFoods.map((food, index) => {
                const emojis = ["🍎", "🍗", "🍌", "🌾", "🐟"];
                return (
                  <button
                    key={food.id}
                    onClick={() => setSearchQuery(food.name)}
                    className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl p-4 text-center transition-colors"
                  >
                    <div className="text-2xl mb-2">{emojis[index]}</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {food.name.split(",")[0]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {showModal && selectedFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Food
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {selectedFood.name}
                </h3>
                {selectedFood.brand && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFood.brand}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serving Size
                </label>
                <div className="space-y-2">
                  {selectedFood.common_serving_sizes.map((serving) => (
                    <button
                      key={serving.name}
                      onClick={() =>
                        handleServingSizeChange(serving.name, serving.grams)
                      }
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                        selectedFood.serving_size === serving.name
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {serving.name}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={customGrams}
                      onChange={(e) => handleCustomGramsChange(e.target.value)}
                      className="flex-1 p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      grams
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Nutrition Facts
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-2">
                      <FireIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedFood.calories}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Calories
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Protein
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedFood.protein}g
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Carbs
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedFood.carbs}g
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Fat
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedFood.fat}g
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add to Meal
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`p-2.5 rounded-lg border transition-colors ${
                          mealType === type
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {type}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFood}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>
                    Add to{" "}
                    {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodSearch;
