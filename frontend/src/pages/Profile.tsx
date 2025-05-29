import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  FireIcon,
  TrophyIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useMeals } from "../contexts/MealsContext";
import { useTheme } from "../contexts/ThemeContext";

interface UserGoals {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  weight_goal?: number;
  activity_level:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active";
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const { streakData, getTotalMealsLogged, getWeightProgress, addWeightEntry } =
    useMeals();
  const { theme, toggleTheme } = useTheme();
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [goals, setGoals] = useState<UserGoals>({
    dailyCalories: user?.goals.dailyCalories || 2000,
    protein: user?.goals.macros.protein || 150,
    carbs: user?.goals.macros.carbs || 250,
    fat: user?.goals.macros.fat || 67,
    water: 8,
    activity_level: "moderately_active",
    macros: {
      protein: user?.goals.macros.protein || 150,
      carbs: user?.goals.macros.carbs || 250,
      fat: user?.goals.macros.fat || 67,
    },
  });

  const handleSaveGoals = () => {
    updateUser({
      goals: {
        dailyCalories: goals.dailyCalories,
        macros: {
          protein: goals.protein,
          carbs: goals.carbs,
          fat: goals.fat,
        },
      },
    });
    setIsEditingGoals(false);
    toast.success("Goals updated successfully!");
  };

  const handleSaveWeight = () => {
    const weight = parseFloat(newWeight);
    if (weight && weight > 0 && weight < 1000) {
      addWeightEntry(weight);
      setIsEditingWeight(false);
      setNewWeight("");
      toast.success("Weight updated successfully!");
    } else {
      toast.error("Please enter a valid weight");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  // Get real data from context
  const totalMealsLogged = getTotalMealsLogged();
  const weightProgress = getWeightProgress();

  const profileStats = [
    {
      label: "Current Streak",
      value: `${streakData.current} days`,
      icon: FireIcon,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      emoji: "🔥",
    },
    {
      label: "Total Meals Logged",
      value: totalMealsLogged.toString(),
      icon: TrophyIcon,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      emoji: "🏆",
    },
    {
      label: "Weight Progress",
      value: `${weightProgress.change >= 0 ? "+" : ""}${weightProgress.change.toFixed(1)} lbs`,
      icon: ScaleIcon,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      emoji: "⚖️",
    },
  ];

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-b-3xl">
        <div className="text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-green-100">{user?.email}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {profileStats.map((stat, index) => (
            <div
              key={index}
              className="text-center bg-white/20 rounded-2xl p-6 hover:bg-white/30 transition-all duration-300"
            >
              <div className="text-4xl mb-3">{stat.emoji}</div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-green-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Goals
            </h3>
            <button
              onClick={() => setIsEditingGoals(!isEditingGoals)}
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              {isEditingGoals ? "Cancel" : "Edit"}
            </button>
          </div>

          {isEditingGoals ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily Calories
                </label>
                <input
                  type="number"
                  value={goals.dailyCalories}
                  onChange={(e) =>
                    setGoals({
                      ...goals,
                      dailyCalories: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    value={goals.protein}
                    onChange={(e) =>
                      setGoals({ ...goals, protein: Number(e.target.value) })
                    }
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    value={goals.carbs}
                    onChange={(e) =>
                      setGoals({ ...goals, carbs: Number(e.target.value) })
                    }
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    value={goals.fat}
                    onChange={(e) =>
                      setGoals({ ...goals, fat: Number(e.target.value) })
                    }
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveGoals}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Save Goals
                </button>
                <button
                  onClick={() => setIsEditingGoals(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">
                  Daily Calories
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {goals.dailyCalories}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Protein
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {goals.protein}g
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Carbs
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {goals.carbs}g
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fat
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {goals.fat}g
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Weight Tracking
            </h3>
            <button
              onClick={() => {
                setIsEditingWeight(!isEditingWeight);
                if (!isEditingWeight) {
                  setNewWeight(weightProgress.current.toString());
                }
              }}
              className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              {isEditingWeight ? "Cancel" : "Update"}
            </button>
          </div>

          {isEditingWeight ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Weight (lbs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="Enter your current weight"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveWeight}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Save Weight
                </button>
                <button
                  onClick={() => {
                    setIsEditingWeight(false);
                    setNewWeight("");
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">
                  Current Weight
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {weightProgress.current.toFixed(1)} lbs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Change
                  </p>
                  <p
                    className={`font-semibold ${
                      weightProgress.change < 0
                        ? "text-green-600 dark:text-green-400"
                        : weightProgress.change > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {weightProgress.change >= 0 ? "+" : ""}
                    {weightProgress.change.toFixed(1)} lbs
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Trend
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {weightProgress.change < 0
                      ? "📉 Losing"
                      : weightProgress.change > 0
                        ? "📈 Gaining"
                        : "➡️ Stable"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Settings
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200">
              <div className="flex items-center space-x-3">
                {theme === "dark" ? (
                  <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  Dark Mode
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  theme === "dark" ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account
          </h3>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                Sign Out
              </span>
            </div>
          </button>
        </div>
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SmartEats v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
