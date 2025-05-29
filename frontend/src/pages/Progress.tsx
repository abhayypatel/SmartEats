import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  CalendarDaysIcon,
  TrophyIcon,
  FireIcon,
  ScaleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { format, subDays } from "date-fns";
import { useMeals } from "../contexts/MealsContext";
import { useAuth } from "../contexts/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

interface ProgressData {
  weeklyCalories: number[];
  weeklyWeight: number[];
  weeklyLabels: string[];
  macroBreakdown: {
    protein: number;
    carbs: number;
    fat: number;
  };
  streakData: {
    current: number;
    longest: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string | null;
    isUnlocked: boolean;
  }>;
}

const Progress: React.FC = () => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const {
    meals,
    streakData,
    getWeeklySummary,
    getWeightProgress,
    weightEntries,
    achievements,
  } = useMeals();
  const { user } = useAuth();

  // Calculate progress data directly
  const calculateProgressData = (): ProgressData => {
    // Generate weekly calorie data from actual meals
    const weeklyCalories: number[] = [];
    const weeklyWeight: number[] = [];
    const weeklyLabels: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateString = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "EEE"); // Mon, Tue, Wed, etc.

      weeklyLabels.push(dayLabel);

      const dayMeals = meals.filter((meal) => meal.date === dateString);
      const dayCalories = dayMeals.reduce(
        (sum, meal) =>
          sum +
          meal.items.reduce((mealSum, item) => mealSum + item.calories, 0),
        0,
      );
      weeklyCalories.push(Math.round(dayCalories));

      // Use actual weight data if available
      const weightEntry = weightEntries.find(
        (entry) => entry.date === dateString,
      );
      if (weightEntry) {
        weeklyWeight.push(weightEntry.weight);
      } else {
        // If no weight entry for this day, use the most recent weight before this date
        const previousWeights = weightEntries
          .filter((entry) => new Date(entry.date) <= date)
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

        if (previousWeights.length > 0) {
          weeklyWeight.push(previousWeights[0].weight);
        } else {
          // If no previous weight data, check for future weights (in case user started tracking later)
          const futureWeights = weightEntries
            .filter((entry) => new Date(entry.date) > date)
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            );

          if (futureWeights.length > 0) {
            weeklyWeight.push(futureWeights[0].weight);
          } else {
            // Use the default current weight from getWeightProgress
            weeklyWeight.push(getWeightProgress().current);
          }
        }
      }
    }

    // Calculate macro breakdown from recent meals
    const recentMeals = meals.slice(-20); // Last 20 meals
    const totalMacros = recentMeals.reduce(
      (totals, meal) => {
        meal.items.forEach((item) => {
          totals.protein += item.protein;
          totals.carbs += item.carbs;
          totals.fat += item.fat;
        });
        return totals;
      },
      { protein: 0, carbs: 0, fat: 0 },
    );

    const totalMacroWeight =
      totalMacros.protein + totalMacros.carbs + totalMacros.fat;
    const macroBreakdown =
      totalMacroWeight > 0
        ? {
            protein: Math.round((totalMacros.protein / totalMacroWeight) * 100),
            carbs: Math.round((totalMacros.carbs / totalMacroWeight) * 100),
            fat: Math.round((totalMacros.fat / totalMacroWeight) * 100),
          }
        : { protein: 25, carbs: 45, fat: 30 };

    return {
      weeklyCalories,
      weeklyWeight,
      weeklyLabels,
      macroBreakdown,
      streakData,
      achievements,
    };
  };

  const progressData = calculateProgressData();
  const weeklySummary = getWeeklySummary();

  const calorieChartData = {
    labels: progressData.weeklyLabels,
    datasets: [
      {
        label: "Calories Consumed",
        data: progressData.weeklyCalories,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: "Calorie Goal",
        data: Array(7).fill(user?.goals.dailyCalories || 2000),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
      },
    ],
  };

  const weightChartData = {
    labels: progressData.weeklyLabels,
    datasets: [
      {
        label: "Weight (lbs)",
        data: progressData.weeklyWeight,
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 2,
      },
    ],
  };

  const macroChartData = {
    labels: ["Protein", "Carbs", "Fat"],
    datasets: [
      {
        data: [
          progressData.macroBreakdown.protein,
          progressData.macroBreakdown.carbs,
          progressData.macroBreakdown.fat,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(59, 130, 246, 0.8)",
        ],
        borderColor: [
          "rgb(239, 68, 68)",
          "rgb(251, 191, 36)",
          "rgb(59, 130, 246)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const macroChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  const unlockedAchievements = achievements.filter((a) => a.isUnlocked);

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">Your Progress</h1>
        <p className="text-purple-100">Track your health journey</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                timeRange === range
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm transform scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {range === "7d"
                ? "7 Days"
                : range === "30d"
                  ? "30 Days"
                  : "90 Days"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              <FireIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                STREAK
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progressData.streakData.current}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              days in a row
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between mb-2">
              <TrophyIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                BEST
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {progressData.streakData.longest}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              day streak
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            This Week's Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {weeklySummary.totalCalories.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Calories
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {weeklySummary.daysLogged}/7
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Days Logged
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {weeklySummary.avgCalories}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Daily Calories
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {weeklySummary.weightChange >= 0 ? "+" : ""}
                {weeklySummary.weightChange}lbs
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Weight Change
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Calorie Trend
            </h3>
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-48">
            <Line data={calorieChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Weight Progress
            </h3>
            <ScaleIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-48">
            <Bar data={weightChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Macro Breakdown
            </h3>
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-48">
            <Doughnut data={macroChartData} options={macroChartOptions} />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Achievements ({unlockedAchievements.length}/{achievements.length})
          </h3>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
                  achievement.isUnlocked
                    ? "bg-white dark:bg-gray-700 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-600 opacity-60"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    achievement.isUnlocked
                      ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                      : "bg-gray-300 dark:bg-gray-500"
                  }`}
                >
                  {achievement.isUnlocked ? achievement.icon : "🔒"}
                </div>
                <div className="flex-1">
                  <h4
                    className={`font-medium ${
                      achievement.isUnlocked
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {achievement.title}
                  </h4>
                  <p
                    className={`text-sm ${
                      achievement.isUnlocked
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {achievement.description}
                  </p>
                </div>
                {achievement.isUnlocked && achievement.unlockedAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
