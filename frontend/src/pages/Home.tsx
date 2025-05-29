import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CameraIcon,
  PlusIcon,
  ChartBarIcon,
  FireIcon,
  BeakerIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useMeals } from "../contexts/MealsContext";
import LoadingSpinner from "../components/UI/LoadingSpinner";

interface DailyStats {
  calories: { consumed: number; goal: number; remaining: number };
  macros: {
    protein: { consumed: number; goal: number };
    carbs: { consumed: number; goal: number };
    fat: { consumed: number; goal: number };
  };
  streak: number;
}

interface RecentMeal {
  id: string;
  name: string;
  calories: number;
  time: string;
  image?: string;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const { getTodaysMeals, getRecentMeals, streakData } = useMeals();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get today's meals and recent meals
  const todaysMeals = getTodaysMeals();
  const recentMealItems = getRecentMeals(3);

  const { data: dailyStats, isLoading: statsLoading } = useQuery<DailyStats>({
    queryKey: ["dailyStats", todaysMeals, user?.id],
    queryFn: async () => {
      // Calculate daily totals from today's meals inside the query
      const dailyTotals = todaysMeals.reduce(
        (totals, meal) => {
          meal.items.forEach((item) => {
            totals.calories += item.calories;
            totals.protein += item.protein;
            totals.carbs += item.carbs;
            totals.fat += item.fat;
          });
          return totals;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      return {
        calories: {
          consumed: Math.round(dailyTotals.calories),
          goal: user?.goals.dailyCalories || 2000,
          remaining: Math.max(
            0,
            (user?.goals.dailyCalories || 2000) -
              Math.round(dailyTotals.calories),
          ),
        },
        macros: {
          protein: {
            consumed: Math.round(dailyTotals.protein),
            goal: user?.goals.macros.protein || 150,
          },
          carbs: {
            consumed: Math.round(dailyTotals.carbs),
            goal: user?.goals.macros.carbs || 250,
          },
          fat: {
            consumed: Math.round(dailyTotals.fat),
            goal: user?.goals.macros.fat || 67,
          },
        },
        streak: streakData.current,
      };
    },
    enabled: !!user, // Only run when user is available
  });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const { data: recentMeals, isLoading: mealsLoading } = useQuery<RecentMeal[]>(
    {
      queryKey: ["recentMeals", recentMealItems],
      queryFn: async () => {
        // Use real recent meal items from context
        return recentMealItems.map((item, index) => ({
          id: item.id,
          name: item.name,
          calories: item.calories,
          time: "Recent", // Could be enhanced with actual timestamps
          image: "/api/placeholder/60/60",
        }));
      },
      enabled: !!user, // Only run when user is available
    },
  );

  if (statsLoading || mealsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.firstName || "User"}!
            </h1>
            <p className="text-green-100">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">Streak</p>
            <p className="text-2xl font-bold">{streakData.current} 🔥</p>
          </div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              Daily Calories
            </span>
            <span className="text-sm text-white">
              {dailyStats?.calories.consumed} / {dailyStats?.calories.goal}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(
                  100,
                  ((dailyStats?.calories.consumed || 0) /
                    (dailyStats?.calories.goal || 1)) *
                    100,
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-sm text-white/80">
            <span>Remaining: {dailyStats?.calories.remaining || 0}</span>
            <span>
              {Math.round(
                ((dailyStats?.calories.consumed || 0) /
                  (dailyStats?.calories.goal || 1)) *
                  100,
              )}
              %
            </span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            to="/camera"
            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <CameraIcon className="h-8 w-8" />
            <span className="font-medium">Snap Food</span>
          </Link>
          <Link
            to="/search"
            className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <PlusIcon className="h-8 w-8" />
            <span className="font-medium">Add Food</span>
          </Link>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
            Today's Macros
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-2">
                <BeakerIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Protein
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {dailyStats?.macros.protein.consumed}g
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                <div
                  className="bg-red-500 h-1 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      ((dailyStats?.macros.protein.consumed || 0) /
                        (dailyStats?.macros.protein.goal || 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mx-auto mb-2">
                <FireIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {dailyStats?.macros.carbs.consumed}g
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                <div
                  className="bg-yellow-500 h-1 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      ((dailyStats?.macros.carbs.consumed || 0) /
                        (dailyStats?.macros.carbs.goal || 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-2">
                <ScaleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {dailyStats?.macros.fat.consumed}g
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      ((dailyStats?.macros.fat.consumed || 0) /
                        (dailyStats?.macros.fat.goal || 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white">
              Recent Meals
            </h3>
            <Link
              to="/meals"
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentMeals?.map((meal, index) => (
              <div
                key={meal.id}
                className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {meal.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {meal.time} • {meal.calories} cal
                  </p>
                </div>
                <ChartBarIcon className="h-5 w-5 text-gray-400 transition-colors duration-200 hover:text-blue-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
