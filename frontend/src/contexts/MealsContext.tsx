import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { format, subDays } from "date-fns";
import { useAuth } from "./AuthContext";

interface MealItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
}

interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  items: MealItem[];
  timestamp: string;
  date: string;
}

interface StreakData {
  current: number;
  longest: number;
  lastLoggedDate: string | null;
}

interface WeightEntry {
  date: string;
  weight: number;
  timestamp: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  isUnlocked: boolean;
}

interface MealsContextType {
  meals: Meal[];
  streakData: StreakData;
  weightEntries: WeightEntry[];
  achievements: Achievement[];
  addMeal: (mealData: Omit<Meal, "id" | "date">) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  updateMeal: (mealId: string, updatedMeal: Partial<Meal>) => Promise<void>;
  getMealsByDate: (date: string) => Meal[];
  getTodaysMeals: () => Meal[];
  getRecentMeals: (limit?: number) => MealItem[];
  calculateStreak: () => StreakData;
  getTotalMealsLogged: () => number;
  addWeightEntry: (weight: number) => Promise<void>;
  getWeightProgress: () => { current: number; change: number };
  getWeeklySummary: () => {
    totalCalories: number;
    avgCalories: number;
    daysLogged: number;
    weightChange: number;
  };
  refreshData: () => Promise<void>;
}

const MealsContext = createContext<MealsContextType | undefined>(undefined);

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_meal",
    title: "Getting Started",
    description: "Logged your first meal",
    icon: "🎯",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      totalMeals >= 1,
  },
  {
    id: "week_streak",
    title: "Week Warrior",
    description: "Maintained a 7-day logging streak",
    icon: "🔥",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      longestStreak >= 7,
  },
  {
    id: "meal_master",
    title: "Meal Master",
    description: "Logged 50 meals",
    icon: "🍽️",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      totalMeals >= 50,
  },
  {
    id: "consistency_king",
    title: "Consistency King",
    description: "Maintained a 14-day streak",
    icon: "👑",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      longestStreak >= 14,
  },
  {
    id: "century_club",
    title: "Century Club",
    description: "Logged 100 meals",
    icon: "💯",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      totalMeals >= 100,
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Maintained a 30-day streak",
    icon: "⚡",
    checkUnlocked: (totalMeals: number, longestStreak: number) =>
      longestStreak >= 30,
  },
];

export function MealsProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({
    current: 0,
    longest: 0,
    lastLoggedDate: null,
  });
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const { user, token } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    if (!token) throw new Error("No authentication token");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  const loadMeals = useCallback(async () => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const demoMeals: Meal[] = [
          {
            id: "meal-1",
            type: "breakfast",
            items: [
              {
                id: "item-1",
                name: "Bread, cheese",
                calories: 408,
                protein: 10.4,
                carbs: 44.8,
                fat: 20.8,
                serving_size: "1 serving (100g)",
              },
            ],
            timestamp: new Date().toISOString(),
            date: format(new Date(), "yyyy-MM-dd"),
          },
          ...Array.from({ length: 6 }, (_, i) => ({
            id: `meal-${i + 2}`,
            type: "lunch" as const,
            items: [
              {
                id: `item-${i + 2}`,
                name: `Meal ${i + 1}`,
                calories: 300 + Math.random() * 200,
                protein: 15 + Math.random() * 10,
                carbs: 20 + Math.random() * 15,
                fat: 10 + Math.random() * 8,
                serving_size: "1 serving",
              },
            ],
            timestamp: subDays(new Date(), i + 1).toISOString(),
            date: format(subDays(new Date(), i + 1), "yyyy-MM-dd"),
          })),
        ];
        setMeals(demoMeals);
        return;
      }

      const response = await apiCall("/meals");
      const dbMeals = response.data.map((meal: any) => ({
        id: meal._id,
        type: meal.mealType,
        items: meal.foods.map((food: any) => ({
          id: food._id || food.id,
          name: food.foodItem?.name || food.name || "Unknown food",
          calories: food.nutrition?.calories || 0,
          protein: food.nutrition?.protein || 0,
          carbs: food.nutrition?.carbs || 0,
          fat: food.nutrition?.fat || 0,
          serving_size: `${food.quantity}${food.unit}`,
        })),
        timestamp: meal.createdAt,
        date: meal.date.split("T")[0],
      }));
      setMeals(dbMeals);
    } catch (error) {
      console.error("Error loading meals:", error);
    }
  }, [user, token]);

  const loadStreakData = useCallback(async () => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const demoStreak = {
          current: 3,
          longest: 7,
          lastLoggedDate: format(new Date(), "yyyy-MM-dd"),
        };
        setStreakData(demoStreak);
        return;
      }

      const response = await apiCall("/meals/streak");
      setStreakData(response.data);
    } catch (error) {
      console.error("Error loading streak:", error);
    }
  }, [user, token]);

  const loadWeightEntries = useCallback(async () => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const demoWeightEntries: WeightEntry[] = [
          {
            date: format(new Date(), "yyyy-MM-dd"),
            weight: 142.0,
            timestamp: new Date().toISOString(),
          },
          {
            date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
            weight: 141.8,
            timestamp: subDays(new Date(), 1).toISOString(),
          },
          {
            date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
            weight: 142.3,
            timestamp: subDays(new Date(), 2).toISOString(),
          },
          {
            date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
            weight: 141.6,
            timestamp: subDays(new Date(), 3).toISOString(),
          },
          {
            date: format(subDays(new Date(), 4), "yyyy-MM-dd"),
            weight: 142.7,
            timestamp: subDays(new Date(), 4).toISOString(),
          },
        ];
        setWeightEntries(demoWeightEntries);
        return;
      }

      const response = await apiCall("/progress/weight");
      setWeightEntries(response.data);
    } catch (error) {
      console.error("Error loading weight entries:", error);
    }
  }, [user, token]);

  const loadAchievements = useCallback(async () => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const demoAchievements = ACHIEVEMENT_DEFINITIONS.map((def, index) => ({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          isUnlocked: index < 2,
          unlockedAt: index < 2 ? new Date().toISOString() : null,
        }));
        setAchievements(demoAchievements);
        return;
      }

      const response = await apiCall("/progress/achievements");
      setAchievements(response.data);
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  }, [user, token]);

  const checkAndUpdateAchievements = useCallback(async () => {
    if (!user || user.id === "demo-user") return;

    const totalMeals = meals.length;
    const longestStreak = streakData.longest;
    const currentTimestamp = new Date().toISOString();

    const updatedAchievements = [...achievements];
    let hasChanges = false;

    ACHIEVEMENT_DEFINITIONS.forEach((def) => {
      const existingAchievement = updatedAchievements.find(
        (a) => a.id === def.id,
      );
      const shouldBeUnlocked = def.checkUnlocked(totalMeals, longestStreak);

      if (
        shouldBeUnlocked &&
        (!existingAchievement || !existingAchievement.isUnlocked)
      ) {
        if (existingAchievement) {
          existingAchievement.isUnlocked = true;
          existingAchievement.unlockedAt = currentTimestamp;
        } else {
          updatedAchievements.push({
            id: def.id,
            title: def.title,
            description: def.description,
            icon: def.icon,
            isUnlocked: true,
            unlockedAt: currentTimestamp,
          });
        }
        hasChanges = true;
      } else if (!existingAchievement) {
        updatedAchievements.push({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          isUnlocked: false,
          unlockedAt: null,
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      try {
        await apiCall("/progress/achievements", {
          method: "PUT",
          body: JSON.stringify({ achievements: updatedAchievements }),
        });
        setAchievements(updatedAchievements);
      } catch (error) {
        console.error("Error updating achievements:", error);
      }
    }
  }, [user, meals.length, streakData.longest, achievements, token]);

  const refreshData = useCallback(async () => {
    await Promise.all([
      loadMeals(),
      loadStreakData(),
      loadWeightEntries(),
      loadAchievements(),
    ]);
  }, [loadMeals, loadStreakData, loadWeightEntries, loadAchievements]);

  useEffect(() => {
    if (user && token) {
      refreshData();
    } else {
      setMeals([]);
      setStreakData({ current: 0, longest: 0, lastLoggedDate: null });
      setWeightEntries([]);
      setAchievements([]);
    }
  }, [user, token, refreshData]);

  useEffect(() => {
    checkAndUpdateAchievements();
  }, [checkAndUpdateAchievements]);

  const addMeal = async (mealData: Omit<Meal, "id" | "date">) => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const newMeal: Meal = {
          id: `meal-${Date.now()}`,
          ...mealData,
          date: format(new Date(), "yyyy-MM-dd"),
        };
        setMeals((prev) => [newMeal, ...prev]);
        return;
      }

      const mealPayload = {
        mealType: mealData.type,
        foods: mealData.items.map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          quantity: 100,
          unit: "g",
        })),
        date: new Date().toISOString(),
        time: new Date().toTimeString().slice(0, 5),
      };

      await apiCall("/meals", {
        method: "POST",
        body: JSON.stringify(mealPayload),
      });

      await refreshData();
    } catch (error) {
      console.error("Error adding meal:", error);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
        return;
      }

      await apiCall(`/meals/${mealId}`, { method: "DELETE" });
      await refreshData();
    } catch (error) {
      console.error("Error deleting meal:", error);
    }
  };

  const updateMeal = async (mealId: string, updatedMeal: Partial<Meal>) => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        setMeals((prev) =>
          prev.map((meal) =>
            meal.id === mealId ? { ...meal, ...updatedMeal } : meal,
          ),
        );
        return;
      }

      await apiCall(`/meals/${mealId}`, {
        method: "PUT",
        body: JSON.stringify(updatedMeal),
      });
      await refreshData();
    } catch (error) {
      console.error("Error updating meal:", error);
    }
  };

  const addWeightEntry = async (weight: number) => {
    if (!user || !token) return;

    try {
      if (user.id === "demo-user") {
        const newEntry: WeightEntry = {
          date: format(new Date(), "yyyy-MM-dd"),
          weight,
          timestamp: new Date().toISOString(),
        };
        setWeightEntries((prev) => {
          const filtered = prev.filter((entry) => entry.date !== newEntry.date);
          return [newEntry, ...filtered].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        });
        return;
      }

      await apiCall("/progress/weight", {
        method: "POST",
        body: JSON.stringify({ weight }),
      });
      await loadWeightEntries();
    } catch (error) {
      console.error("Error adding weight entry:", error);
    }
  };

  const calculateStreak = useCallback((): StreakData => {
    return streakData;
  }, [streakData]);

  const getTotalMealsLogged = (): number => {
    return meals.length;
  };

  const getMealsByDate = (date: string) => {
    return meals.filter((meal) => meal.date === date);
  };

  const getTodaysMeals = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return getMealsByDate(today);
  };

  const getRecentMeals = (limit = 5) => {
    return meals
      .slice(0, limit)
      .reduce((acc: MealItem[], meal) => {
        return acc.concat(meal.items);
      }, [])
      .slice(0, limit);
  };

  const getWeightProgress = (): { current: number; change: number } => {
    if (weightEntries.length === 0) {
      return { current: 150.0, change: 0 };
    }

    const sortedEntries = [...weightEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const current = sortedEntries[0]?.weight || 150.0;
    const oldest = sortedEntries[sortedEntries.length - 1]?.weight || current;
    const change = sortedEntries.length > 1 ? current - oldest : 0;

    return { current, change };
  };

  const getWeeklySummary = () => {
    const sevenDaysAgo = subDays(new Date(), 7);
    const weeklyMeals = meals.filter(
      (meal) => new Date(meal.date) >= sevenDaysAgo,
    );

    const totalCalories = weeklyMeals.reduce(
      (sum, meal) =>
        sum + meal.items.reduce((mealSum, item) => mealSum + item.calories, 0),
      0,
    );

    const uniqueDates = new Set(weeklyMeals.map((meal) => meal.date));
    const daysLogged = uniqueDates.size;
    const avgCalories =
      daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0;

    const weeklyWeightEntries = weightEntries.filter(
      (entry) => new Date(entry.date) >= sevenDaysAgo,
    );

    let weeklyWeightChange = 0;
    if (weeklyWeightEntries.length >= 2) {
      const sortedWeekly = [...weeklyWeightEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const oldestWeekly = sortedWeekly[0].weight;
      const newestWeekly = sortedWeekly[sortedWeekly.length - 1].weight;
      weeklyWeightChange = newestWeekly - oldestWeekly;
    }

    return {
      totalCalories: Math.round(totalCalories),
      avgCalories,
      daysLogged,
      weightChange: Math.round(weeklyWeightChange * 10) / 10,
    };
  };

  const value: MealsContextType = {
    meals,
    streakData,
    weightEntries,
    achievements,
    addMeal,
    deleteMeal,
    updateMeal,
    getMealsByDate,
    getTodaysMeals,
    getRecentMeals,
    calculateStreak,
    getTotalMealsLogged,
    addWeightEntry,
    getWeightProgress,
    getWeeklySummary,
    refreshData,
  };

  return (
    <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
  );
}

export function useMeals() {
  const context = useContext(MealsContext);
  if (context === undefined) {
    throw new Error("useMeals must be used within a MealsProvider");
  }
  return context;
}
