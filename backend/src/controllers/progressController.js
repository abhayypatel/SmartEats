const User = require("../models/User");
const Meal = require("../models/Meal");
const asyncHandler = require("../utils/asyncHandler");

const weightSchema = {
    date: String,
    weight: Number,
    timestamp: String,
};

const achievementSchema = {
    id: String,
    title: String,
    description: String,
    icon: String,
    unlockedAt: String,
    isUnlocked: Boolean,
};

const addWeightEntry = asyncHandler(async (req, res) => {
    const { weight } = req.body;

    if (!weight || weight <= 0) {
        return res.status(400).json({
            success: false,
            message: "Valid weight is required",
        });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    user.weightHistory = user.weightHistory || [];

    const existingEntryIndex = user.weightHistory.findIndex(
        entry => entry.date === today
    );

    const newEntry = {
        date: today,
        weight: parseFloat(weight),
        timestamp,
    };

    if (existingEntryIndex >= 0) {
        user.weightHistory[existingEntryIndex] = newEntry;
    } else {
        user.weightHistory.push(newEntry);
    }

    user.weightHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    user.weight.value = parseFloat(weight);
    user.markModified('weightHistory');

    await user.save();

    res.status(200).json({
        success: true,
        data: newEntry,
    });
});

const getWeightEntries = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const weightHistory = user.weightHistory || [];

    res.status(200).json({
        success: true,
        data: weightHistory,
    });
});

const getWeightProgress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const weightHistory = user.weightHistory || [];

    if (weightHistory.length === 0) {
        return res.status(200).json({
            success: true,
            data: {
                current: user.weight?.value || 70,
                change: 0,
            },
        });
    }

    const sortedEntries = [...weightHistory].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    const current = sortedEntries[0]?.weight || user.weight?.value || 70;
    const oldest = sortedEntries[sortedEntries.length - 1]?.weight || current;
    const change = sortedEntries.length > 1 ? current - oldest : 0;

    res.status(200).json({
        success: true,
        data: {
            current: Math.round(current * 10) / 10,
            change: Math.round(change * 10) / 10,
        },
    });
});

const getAchievements = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const achievements = user.achievements || [];

    res.status(200).json({
        success: true,
        data: achievements,
    });
});

const updateAchievements = asyncHandler(async (req, res) => {
    const { achievements } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    user.achievements = achievements;
    user.markModified('achievements');

    await user.save();

    res.status(200).json({
        success: true,
        data: achievements,
    });
});

const getOverallProgress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const totalMeals = await Meal.countDocuments({ user: req.user._id });

    const meals = await Meal.find({ user: req.user._id })
        .select("date")
        .sort({ date: -1 });

    const uniqueDates = [...new Set(meals.map(meal => meal.date.toISOString().split('T')[0]))];
    uniqueDates.sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        let checkDate = uniqueDates.includes(today) ? new Date() : new Date(Date.now() - 86400000);

        for (let i = 0; i < uniqueDates.length; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];

            if (uniqueDates.includes(dateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    for (let i = 0; i < uniqueDates.length; i++) {
        tempStreak = 1;

        for (let j = i + 1; j < uniqueDates.length; j++) {
            const currentDate = new Date(uniqueDates[j]);
            const prevDate = new Date(uniqueDates[j - 1]);
            const diffDays = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                break;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
    }

    const weightHistory = user.weightHistory || [];
    const currentWeight = weightHistory.length > 0
        ? weightHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
        : user.weight?.value || 70;

    const weightChange = weightHistory.length > 1
        ? currentWeight - weightHistory[weightHistory.length - 1].weight
        : 0;

    res.status(200).json({
        success: true,
        data: {
            totalMeals,
            currentStreak,
            longestStreak: Math.max(longestStreak, currentStreak),
            lastLoggedDate: uniqueDates[0] || null,
            currentWeight: Math.round(currentWeight * 10) / 10,
            weightChange: Math.round(weightChange * 10) / 10,
            achievements: user.achievements || [],
        },
    });
});

const getDailyNutrition = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();

    const user = await User.findById(req.user._id);
    const dailySummary = await Meal.getDailyNutritionSummary(req.user._id, targetDate);

    const response = {
        date: targetDate.toISOString().split('T')[0],
        consumed: {
            calories: dailySummary.totalCalories,
            protein: dailySummary.totalProtein,
            carbs: dailySummary.totalCarbs,
            fat: dailySummary.totalFat,
        },
        goals: {
            calories: user.goals.dailyCalories,
            protein: Math.round((user.goals.dailyCalories * user.goals.macros.protein / 100) / 4),
            carbs: Math.round((user.goals.dailyCalories * user.goals.macros.carbs / 100) / 4),
            fat: Math.round((user.goals.dailyCalories * user.goals.macros.fat / 100) / 9),
        },
        mealBreakdown: dailySummary.mealBreakdown,
        mealCount: dailySummary.mealCount,
    };

    res.status(200).json({
        success: true,
        data: response,
    });
});

const getCalorieTrend = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));

    const meals = await Meal.getMealsInDateRange(req.user._id, startDate, endDate);

    const dailyCalories = {};

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyCalories[dateStr] = 0;
    }

    meals.forEach(meal => {
        const dateStr = meal.date.toISOString().split('T')[0];
        if (dailyCalories.hasOwnProperty(dateStr)) {
            dailyCalories[dateStr] += meal.totalNutrition.calories || 0;
        }
    });

    const trendData = Object.keys(dailyCalories)
        .sort()
        .map(date => ({
            date,
            calories: Math.round(dailyCalories[date]),
        }));

    res.status(200).json({
        success: true,
        data: trendData,
    });
});

const updateUserGoals = asyncHandler(async (req, res) => {
    const { dailyCalories, macros } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    if (dailyCalories) {
        user.goals.dailyCalories = dailyCalories;
    }

    if (macros) {
        if (macros.protein !== undefined) user.goals.macros.protein = macros.protein;
        if (macros.carbs !== undefined) user.goals.macros.carbs = macros.carbs;
        if (macros.fat !== undefined) user.goals.macros.fat = macros.fat;
    }

    user.markModified('goals');
    await user.save();

    res.status(200).json({
        success: true,
        data: {
            dailyCalories: user.goals.dailyCalories,
            macros: user.goals.macros,
        },
    });
});

const getDashboardData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const totalMeals = await Meal.countDocuments({ user: req.user._id });

    const today = new Date();
    const todaySummary = await Meal.getDailyNutritionSummary(req.user._id, today);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const weeklyMeals = await Meal.getMealsInDateRange(req.user._id, startDate, endDate);

    const weeklyCalories = weeklyMeals.reduce((sum, meal) => sum + (meal.totalNutrition.calories || 0), 0);
    const uniqueDays = new Set(weeklyMeals.map(meal => meal.date.toISOString().split('T')[0]));

    const meals = await Meal.find({ user: req.user._id }).select("date").sort({ date: -1 });
    const uniqueDates = [...new Set(meals.map(meal => meal.date.toISOString().split('T')[0]))];
    uniqueDates.sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
        let checkDate = uniqueDates.includes(todayStr) ? new Date() : new Date(Date.now() - 86400000);

        for (let i = 0; i < uniqueDates.length; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];

            if (uniqueDates.includes(dateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    for (let i = 0; i < uniqueDates.length; i++) {
        tempStreak = 1;

        for (let j = i + 1; j < uniqueDates.length; j++) {
            const currentDate = new Date(uniqueDates[j]);
            const prevDate = new Date(uniqueDates[j - 1]);
            const diffDays = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                break;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
    }

    const weightHistory = user.weightHistory || [];
    const currentWeight = weightHistory.length > 0
        ? weightHistory.sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
        : user.weight?.value || 70;

    const weightChange = weightHistory.length > 1
        ? currentWeight - weightHistory[weightHistory.length - 1].weight
        : 0;

    const proteinGoal = Math.round((user.goals.dailyCalories * user.goals.macros.protein / 100) / 4);
    const carbsGoal = Math.round((user.goals.dailyCalories * user.goals.macros.carbs / 100) / 4);
    const fatGoal = Math.round((user.goals.dailyCalories * user.goals.macros.fat / 100) / 9);

    res.status(200).json({
        success: true,
        data: {
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                currentWeight: Math.round(currentWeight * 10) / 10,
                weightChange: Math.round(weightChange * 10) / 10,
                goals: {
                    dailyCalories: user.goals.dailyCalories,
                    protein: proteinGoal,
                    carbs: carbsGoal,
                    fat: fatGoal,
                    macroPercentages: user.goals.macros,
                },
            },
            today: {
                calories: todaySummary.totalCalories,
                protein: todaySummary.totalProtein,
                carbs: todaySummary.totalCarbs,
                fat: todaySummary.totalFat,
                mealCount: todaySummary.mealCount,
            },
            streak: {
                current: currentStreak,
                longest: Math.max(longestStreak, currentStreak),
                lastLoggedDate: uniqueDates[0] || null,
            },
            weekSummary: {
                totalCalories: Math.round(weeklyCalories),
                avgCalories: uniqueDays.size > 0 ? Math.round(weeklyCalories / uniqueDays.size) : 0,
                daysLogged: uniqueDays.size,
                totalMeals: weeklyMeals.length,
            },
            totalMealsLogged: totalMeals,
            achievements: user.achievements || [],
            weightHistory: weightHistory.slice(0, 30),
        },
    });
});

module.exports = {
    addWeightEntry,
    getWeightEntries,
    getWeightProgress,
    getAchievements,
    updateAchievements,
    getOverallProgress,
    getDailyNutrition,
    getCalorieTrend,
    updateUserGoals,
    getDashboardData,
}; 