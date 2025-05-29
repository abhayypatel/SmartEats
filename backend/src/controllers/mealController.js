const Meal = require("../models/Meal");
const FoodItem = require("../models/FoodItem");
const asyncHandler = require("../utils/asyncHandler");

const getMeals = asyncHandler(async (req, res) => {
    const { startDate, endDate, mealType, limit = 50 } = req.query;

    let filter = { user: req.user._id };

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (mealType) {
        filter.mealType = mealType;
    }

    const meals = await Meal.find(filter)
        .populate("foods.foodItem", "name brand images")
        .sort({ date: -1, time: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: meals.length,
        data: meals,
    });
});

const getMealById = asyncHandler(async (req, res) => {
    const meal = await Meal.findOne({
        _id: req.params.id,
        user: req.user._id,
    }).populate("foods.foodItem", "name brand images");

    if (!meal) {
        return res.status(404).json({
            success: false,
            message: "Meal not found",
        });
    }

    res.status(200).json({
        success: true,
        data: meal,
    });
});

const createMeal = asyncHandler(async (req, res) => {
    const { mealType, foods, date, time, name, description, images, notes } = req.body;

    const processedFoods = [];

    for (const food of foods) {
        let foodItem;

        if (food.foodItem) {
            foodItem = await FoodItem.findById(food.foodItem);
        } else if (food.name) {
            foodItem = await FoodItem.findOne({
                name: { $regex: new RegExp(food.name, "i") }
            });

            if (!foodItem) {
                foodItem = await FoodItem.create({
                    name: food.name,
                    brand: food.brand || "User Added",
                    category: "prepared-foods",
                    dataSource: "user-generated",
                    addedBy: req.user._id,
                    nutrition: {
                        calories: food.calories || 0,
                        protein: food.protein || 0,
                        carbs: food.carbs || 0,
                        fat: food.fat || 0,
                        fiber: food.fiber || 0,
                        sugar: food.sugar || 0,
                        sodium: food.sodium || 0,
                    },
                    servingSize: {
                        amount: food.quantity || 100,
                        unit: food.unit || "g",
                        description: "1 serving"
                    }
                });
            }
        }

        if (foodItem) {
            const quantity = food.quantity || 100;
            const multiplier = quantity / 100;

            processedFoods.push({
                foodItem: foodItem._id,
                quantity,
                unit: food.unit || "g",
                nutrition: {
                    calories: Math.round((foodItem.nutrition.calories || 0) * multiplier * 10) / 10,
                    protein: Math.round((foodItem.nutrition.protein || 0) * multiplier * 10) / 10,
                    carbs: Math.round((foodItem.nutrition.carbs || 0) * multiplier * 10) / 10,
                    fat: Math.round((foodItem.nutrition.fat || 0) * multiplier * 10) / 10,
                    fiber: Math.round((foodItem.nutrition.fiber || 0) * multiplier * 10) / 10,
                    sugar: Math.round((foodItem.nutrition.sugar || 0) * multiplier * 10) / 10,
                    sodium: Math.round((foodItem.nutrition.sodium || 0) * multiplier * 10) / 10,
                },
                notes: food.notes,
            });
        }
    }

    const meal = await Meal.create({
        user: req.user._id,
        mealType,
        foods: processedFoods,
        date: date || new Date(),
        time: time || new Date().toTimeString().slice(0, 5),
        name,
        description,
        images: images || [],
        notes,
    });

    await meal.populate("foods.foodItem", "name brand images");

    res.status(201).json({
        success: true,
        data: meal,
    });
});

const updateMeal = asyncHandler(async (req, res) => {
    let meal = await Meal.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!meal) {
        return res.status(404).json({
            success: false,
            message: "Meal not found",
        });
    }

    const { mealType, foods, date, time, name, description, notes } = req.body;

    if (foods) {
        const processedFoods = [];

        for (const food of foods) {
            let foodItem;

            if (food.foodItem) {
                foodItem = await FoodItem.findById(food.foodItem);
            } else if (food.name) {
                foodItem = await FoodItem.findOne({
                    name: { $regex: new RegExp(food.name, "i") }
                });

                if (!foodItem) {
                    foodItem = await FoodItem.create({
                        name: food.name,
                        brand: food.brand || "User Added",
                        category: "prepared-foods",
                        dataSource: "user-generated",
                        addedBy: req.user._id,
                        nutrition: {
                            calories: food.calories || 0,
                            protein: food.protein || 0,
                            carbs: food.carbs || 0,
                            fat: food.fat || 0,
                            fiber: food.fiber || 0,
                            sugar: food.sugar || 0,
                            sodium: food.sodium || 0,
                        },
                        servingSize: {
                            amount: food.quantity || 100,
                            unit: food.unit || "g",
                            description: "1 serving"
                        }
                    });
                }
            }

            if (foodItem) {
                const quantity = food.quantity || 100;
                const multiplier = quantity / 100;

                processedFoods.push({
                    foodItem: foodItem._id,
                    quantity,
                    unit: food.unit || "g",
                    nutrition: {
                        calories: Math.round((foodItem.nutrition.calories || 0) * multiplier * 10) / 10,
                        protein: Math.round((foodItem.nutrition.protein || 0) * multiplier * 10) / 10,
                        carbs: Math.round((foodItem.nutrition.carbs || 0) * multiplier * 10) / 10,
                        fat: Math.round((foodItem.nutrition.fat || 0) * multiplier * 10) / 10,
                        fiber: Math.round((foodItem.nutrition.fiber || 0) * multiplier * 10) / 10,
                        sugar: Math.round((foodItem.nutrition.sugar || 0) * multiplier * 10) / 10,
                        sodium: Math.round((foodItem.nutrition.sodium || 0) * multiplier * 10) / 10,
                    },
                    notes: food.notes,
                });
            }
        }
        meal.foods = processedFoods;
    }

    if (mealType) meal.mealType = mealType;
    if (date) meal.date = date;
    if (time) meal.time = time;
    if (name !== undefined) meal.name = name;
    if (description !== undefined) meal.description = description;
    if (notes !== undefined) meal.notes = notes;

    meal.addEditHistory(`Updated meal ${new Date().toISOString()}`);

    await meal.save();
    await meal.populate("foods.foodItem", "name brand images");

    res.status(200).json({
        success: true,
        data: meal,
    });
});

const deleteMeal = asyncHandler(async (req, res) => {
    const meal = await Meal.findOne({
        _id: req.params.id,
        user: req.user._id,
    });

    if (!meal) {
        return res.status(404).json({
            success: false,
            message: "Meal not found",
        });
    }

    await meal.deleteOne();

    res.status(200).json({
        success: true,
        message: "Meal deleted successfully",
    });
});

const getDailySummary = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const targetDate = date ? new Date(date) : new Date();

    const summary = await Meal.getDailyNutritionSummary(req.user._id, targetDate);

    res.status(200).json({
        success: true,
        data: summary,
    });
});

const getWeeklySummary = asyncHandler(async (req, res) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const meals = await Meal.getMealsInDateRange(req.user._id, startDate, endDate);

    const summary = {
        totalCalories: 0,
        totalMeals: meals.length,
        avgCaloriesPerDay: 0,
        daysWithMeals: new Set(),
    };

    meals.forEach(meal => {
        summary.totalCalories += meal.totalNutrition.calories || 0;
        summary.daysWithMeals.add(meal.date.toISOString().split('T')[0]);
    });

    const daysLogged = summary.daysWithMeals.size;
    summary.avgCaloriesPerDay = daysLogged > 0 ? Math.round(summary.totalCalories / daysLogged) : 0;
    summary.daysLogged = daysLogged;

    res.status(200).json({
        success: true,
        data: summary,
    });
});

const getStreak = asyncHandler(async (req, res) => {
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

    res.status(200).json({
        success: true,
        data: {
            current: currentStreak,
            longest: Math.max(longestStreak, currentStreak),
            lastLoggedDate: uniqueDates[0] || null,
        },
    });
});

module.exports = {
    getMeals,
    getMealById,
    createMeal,
    updateMeal,
    deleteMeal,
    getDailySummary,
    getWeeklySummary,
    getStreak,
}; 