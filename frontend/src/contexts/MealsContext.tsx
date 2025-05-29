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
  date: string; // YYYY-MM-DD format
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
  addMeal: (mealData: Omit<Meal, "id" | "date">) => void;
  deleteMeal: (mealId: string) => void;
  updateMeal: (mealId: string, updatedMeal: Partial<Meal>) => void;
  getMealsByDate: (date: string) => Meal[];
  getTodaysMeals: () => Meal[];
  getRecentMeals: (limit?: number) => MealItem[];
  calculateStreak: () => StreakData;
  getTotalMealsLogged: () => number;
  addWeightEntry: (weight: number) => void;
  getWeightProgress: () => { current: number; change: number };
  getWeeklySummary: () => {
    totalCalories: number;
    avgCalories: number;
    daysLogged: number;
    weightChange: number;
  };
}

const MealsContext = createContext<MealsContextType | undefined>(undefined);

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
  const { user } = useAuth();

  // Get user-specific storage keys
  const getUserMealsKey = (userId: string) => `smarteats_meals_${userId}`;
  const getUserStreakKey = (userId: string) => `smarteats_streak_${userId}`;
  const getUserWeightKey = (userId: string) => `smarteats_weight_${userId}`;
  const getUserAchievementsKey = (userId: string) =>
    `smarteats_achievements_${userId}`;

  // Calculate streak based on meal history
  const calculateStreak = useCallback((): StreakData => {
    if (!meals.length) {
      return { current: 0, longest: 0, lastLoggedDate: null };
    }

    // Get unique dates with meals, sorted by date (most recent first)
    const datesWithMeals = Array.from(
      new Set(meals.map((meal) => meal.date)),
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (!datesWithMeals.length) {
      return { current: 0, longest: 0, lastLoggedDate: null };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    // Check if user logged today or yesterday to maintain streak
    const hasLoggedToday = datesWithMeals.includes(today);
    const hasLoggedYesterday = datesWithMeals.includes(yesterday);

    if (hasLoggedToday || hasLoggedYesterday) {
      // Start from most recent date and count backwards
      let checkDate = hasLoggedToday ? new Date() : subDays(new Date(), 1);
      let dayCount = 0;

      for (let i = 0; i < datesWithMeals.length; i++) {
        const mealDate = format(checkDate, "yyyy-MM-dd");

        if (datesWithMeals.includes(mealDate)) {
          dayCount++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }
      currentStreak = dayCount;
    }

    // Calculate longest streak
    for (let i = 0; i < datesWithMeals.length; i++) {
      tempStreak = 1;

      for (let j = i + 1; j < datesWithMeals.length; j++) {
        const currentDate = new Date(datesWithMeals[j]);
        const prevDate = new Date(datesWithMeals[j - 1]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          break;
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const lastLoggedDate = datesWithMeals[0] || null;

    return {
      current: currentStreak,
      longest: Math.max(longestStreak, currentStreak),
      lastLoggedDate,
    };
  }, [meals]);

  const getTotalMealsLogged = (): number => {
    return meals.length;
  };

  // Check for new achievements and update them
  const checkAndUpdateAchievements = useCallback(() => {
    if (!user) return;

    const totalMeals = meals.length;
    const longestStreak = streakData.longest;
    const currentTimestamp = new Date().toISOString();

    setAchievements((prevAchievements) => {
      const updatedAchievements = [...prevAchievements];
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
          // Achievement should be unlocked
          if (existingAchievement) {
            // Update existing achievement
            existingAchievement.isUnlocked = true;
            existingAchievement.unlockedAt = currentTimestamp;
          } else {
            // Add new achievement
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
          // Add locked achievement
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
        // Save to localStorage
        const userAchievementsKey = getUserAchievementsKey(user.id);
        localStorage.setItem(
          userAchievementsKey,
          JSON.stringify(updatedAchievements),
        );
      }

      return hasChanges ? updatedAchievements : prevAchievements;
    });
  }, [user, meals.length, streakData.longest]);

  const addWeightEntry = (weight: number) => {
    const newEntry: WeightEntry = {
      date: format(new Date(), "yyyy-MM-dd"),
      weight,
      timestamp: new Date().toISOString(),
    };

    setWeightEntries((prev) => {
      // Remove any existing entry for today and add new one
      const filtered = prev.filter((entry) => entry.date !== newEntry.date);
      return [...filtered, newEntry].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    });
  };

  const getWeightProgress = (): { current: number; change: number } => {
    if (weightEntries.length === 0) {
      return { current: 150.0, change: 0 }; // Default values if no weight entries
    }

    const sortedEntries = [...weightEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const current = sortedEntries[0]?.weight || 150.0;

    // Calculate change from the oldest entry to show total progress
    if (sortedEntries.length < 2) {
      return { current, change: 0 };
    }

    const oldest = sortedEntries[sortedEntries.length - 1]?.weight || current;
    const change = current - oldest;

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

    // Calculate weekly weight change
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

  // Load data from localStorage on mount or when user changes
  useEffect(() => {
    if (!user) {
      setMeals([]);
      setStreakData({ current: 0, longest: 0, lastLoggedDate: null });
      setWeightEntries([]);
      setAchievements([]);
      return;
    }

    const userMealsKey = getUserMealsKey(user.id);
    const userStreakKey = getUserStreakKey(user.id);
    const userWeightKey = getUserWeightKey(user.id);
    const userAchievementsKey = getUserAchievementsKey(user.id);

    // Load meals
    const savedMeals = localStorage.getItem(userMealsKey);
    if (savedMeals) {
      try {
        const parsedMeals = JSON.parse(savedMeals);
        setMeals(parsedMeals);
      } catch (error) {
        console.error("Error loading meals:", error);
        setMeals([]);
      }
    }

    // Load weight entries
    const savedWeight = localStorage.getItem(userWeightKey);
    if (savedWeight) {
      try {
        setWeightEntries(JSON.parse(savedWeight));
      } catch (error) {
        console.error("Error loading weight entries:", error);
        setWeightEntries([]);
      }
    }

    // Load achievements
    const savedAchievements = localStorage.getItem(userAchievementsKey);
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch (error) {
        console.error("Error loading achievements:", error);
        setAchievements([]);
      }
    }

    // Load streak data
    const savedStreak = localStorage.getItem(userStreakKey);
    if (savedStreak) {
      try {
        setStreakData(JSON.parse(savedStreak));
      } catch (error) {
        console.error("Error loading streak data:", error);
        setStreakData({ current: 0, longest: 0, lastLoggedDate: null });
      }
    }

    // Only add sample data for demo user
    if (user.id === "demo-user" && !savedMeals) {
      const sampleMeals: Meal[] = [
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
        // Add some historical meals for streak calculation
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
      setMeals(sampleMeals);
      localStorage.setItem(userMealsKey, JSON.stringify(sampleMeals));
    }

    // Initialize weight tracking for all users if no weight data exists
    if (!savedWeight) {
      // For demo user, add more comprehensive sample data
      if (user.id === "demo-user") {
        const sampleWeightEntries: WeightEntry[] = [
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
          {
            date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
            weight: 142.2,
            timestamp: subDays(new Date(), 5).toISOString(),
          },
          {
            date: format(subDays(new Date(), 7), "yyyy-MM-dd"),
            weight: 143.5,
            timestamp: subDays(new Date(), 7).toISOString(),
          },
          {
            date: format(subDays(new Date(), 14), "yyyy-MM-dd"),
            weight: 144.8,
            timestamp: subDays(new Date(), 14).toISOString(),
          },
        ];
        setWeightEntries(sampleWeightEntries);
        localStorage.setItem(
          userWeightKey,
          JSON.stringify(sampleWeightEntries),
        );
      } else {
        // For all other users, initialize with a default starting weight
        // Users can update this through the profile page
        const initialWeightEntry: WeightEntry = {
          date: format(new Date(), "yyyy-MM-dd"),
          weight: 150.0, // Default starting weight
          timestamp: new Date().toISOString(),
        };
        const initialWeightEntries = [initialWeightEntry];
        setWeightEntries(initialWeightEntries);
        localStorage.setItem(
          userWeightKey,
          JSON.stringify(initialWeightEntries),
        );
      }
    }
  }, [user]);

  // Calculate and update streak whenever meals change
  useEffect(() => {
    if (meals.length > 0) {
      const newStreakData = calculateStreak();
      setStreakData(newStreakData);

      if (user) {
        const userStreakKey = getUserStreakKey(user.id);
        localStorage.setItem(userStreakKey, JSON.stringify(newStreakData));
      }
    }
  }, [meals, user, calculateStreak]);

  // Check for achievement updates when meals or streak data changes
  useEffect(() => {
    if (user && (meals.length > 0 || streakData.current > 0)) {
      checkAndUpdateAchievements();
    }
  }, [user, meals.length, streakData, checkAndUpdateAchievements]);

  // Save data to localStorage whenever they change
  useEffect(() => {
    if (user && meals.length >= 0) {
      const userMealsKey = getUserMealsKey(user.id);
      localStorage.setItem(userMealsKey, JSON.stringify(meals));
    }
  }, [meals, user]);

  useEffect(() => {
    if (user && weightEntries.length >= 0) {
      const userWeightKey = getUserWeightKey(user.id);
      localStorage.setItem(userWeightKey, JSON.stringify(weightEntries));
    }
  }, [weightEntries, user]);

  const addMeal = (mealData: Omit<Meal, "id" | "date">) => {
    const newMeal: Meal = {
      ...mealData,
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: format(new Date(mealData.timestamp), "yyyy-MM-dd"),
    };

    setMeals((prev) => [...prev, newMeal]);
  };

  const deleteMeal = (mealId: string) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
  };

  const updateMeal = (mealId: string, updatedMeal: Partial<Meal>) => {
    setMeals((prev) =>
      prev.map((meal) =>
        meal.id === mealId ? { ...meal, ...updatedMeal } : meal,
      ),
    );
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
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit)
      .flatMap((meal) => meal.items)
      .slice(0, limit);
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
