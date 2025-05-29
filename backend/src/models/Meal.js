const mongoose = require("mongoose");

const foodEntrySchema = new mongoose.Schema(
  {
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      required: [true, "Food item is required"],
    },

    // Serving information
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.1, "Quantity must be at least 0.1"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: ["g", "ml", "cup", "tbsp", "tsp", "piece", "slice", "oz", "lb"],
    },

    // Calculated nutrition for this entry
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
    },

    // Custom notes for this food entry
    notes: {
      type: String,
      maxlength: [200, "Notes cannot exceed 200 characters"],
    },
  },
  { _id: false },
);

const mealSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Meal timing
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    mealType: {
      type: String,
      required: [true, "Meal type is required"],
      enum: ["breakfast", "lunch", "dinner", "snack"],
      index: true,
    },
    time: {
      type: String, // Format: "HH:MM"
      required: [true, "Time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Time must be in HH:MM format",
      ],
    },

    // Food entries
    foods: {
      type: [foodEntrySchema],
      validate: {
        validator: function (foods) {
          return foods && foods.length > 0;
        },
        message: "At least one food item is required",
      },
    },

    // Total nutrition for the meal
    totalNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
    },

    // Meal metadata
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Meal name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Images of the meal
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String, // Cloudinary public ID for deletion
        aiAnalysisId: String, // Reference to AI analysis that generated this meal
        caption: String,
      },
    ],

    // AI Analysis data
    aiAnalysis: {
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      detectedFoods: [
        {
          name: String,
          confidence: Number,
          boundingBox: {
            x: Number,
            y: Number,
            width: Number,
            height: Number,
          },
        },
      ],
      analysisId: String, // OpenAI analysis ID for reference
      prompt: String, // The prompt used for analysis
      rawResponse: String, // Raw AI response for debugging
    },

    // Location data (optional)
    location: {
      name: String, // Restaurant name, home, etc.
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // Social features
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // Meal rating and notes
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },

    // Tracking
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now,
        },
        changes: String, // Description of what was changed
        previousNutrition: {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

mealSchema.index({ user: 1, date: -1 });
mealSchema.index({ user: 1, mealType: 1, date: -1 });
mealSchema.index({ user: 1, createdAt: -1 });
mealSchema.index({ date: -1, mealType: 1 });

mealSchema.virtual("displayName").get(function () {
  if (this.name) return this.name;

  const mealTypeNames = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };

  return mealTypeNames[this.mealType] || "Meal";
});

mealSchema.virtual("primaryImage").get(function () {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

mealSchema.virtual("formattedDate").get(function () {
  return this.date.toISOString().split("T")[0]; // YYYY-MM-DD
});

mealSchema.pre("save", function (next) {
  if (this.isModified("foods")) {
    this.calculateTotalNutrition();
  }
  next();
});

mealSchema.methods.calculateTotalNutrition = function () {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  this.foods.forEach((food) => {
    if (food.nutrition) {
      totals.calories += food.nutrition.calories || 0;
      totals.protein += food.nutrition.protein || 0;
      totals.carbs += food.nutrition.carbs || 0;
      totals.fat += food.nutrition.fat || 0;
      totals.fiber += food.nutrition.fiber || 0;
      totals.sugar += food.nutrition.sugar || 0;
      totals.sodium += food.nutrition.sodium || 0;
    }
  });

  // Round to 1 decimal place
  Object.keys(totals).forEach((key) => {
    totals[key] = Math.round(totals[key] * 10) / 10;
  });

  this.totalNutrition = totals;
  return totals;
};

mealSchema.methods.addEditHistory = function (changes) {
  const previousNutrition = {
    calories: this.totalNutrition.calories,
    protein: this.totalNutrition.protein,
    carbs: this.totalNutrition.carbs,
    fat: this.totalNutrition.fat,
  };

  this.editHistory.push({
    changes,
    previousNutrition,
  });

  this.isEdited = true;
};

mealSchema.statics.getMealsInDateRange = function (userId, startDate, endDate) {
  return this.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate("foods.foodItem", "name brand category images")
    .sort({ date: -1, time: -1 });
};

mealSchema.statics.getDailyNutritionSummary = async function (userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const meals = await this.find({
    user: userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  const summary = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    totalSugar: 0,
    totalSodium: 0,
    mealBreakdown: {
      breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    },
    mealCount: meals.length,
  };

  meals.forEach((meal) => {
    const nutrition = meal.totalNutrition;

    summary.totalCalories += nutrition.calories || 0;
    summary.totalProtein += nutrition.protein || 0;
    summary.totalCarbs += nutrition.carbs || 0;
    summary.totalFat += nutrition.fat || 0;
    summary.totalFiber += nutrition.fiber || 0;
    summary.totalSugar += nutrition.sugar || 0;
    summary.totalSodium += nutrition.sodium || 0;

    // Add to meal type breakdown
    if (summary.mealBreakdown[meal.mealType]) {
      summary.mealBreakdown[meal.mealType].calories += nutrition.calories || 0;
      summary.mealBreakdown[meal.mealType].protein += nutrition.protein || 0;
      summary.mealBreakdown[meal.mealType].carbs += nutrition.carbs || 0;
      summary.mealBreakdown[meal.mealType].fat += nutrition.fat || 0;
    }
  });

  // Round all values
  Object.keys(summary).forEach((key) => {
    if (typeof summary[key] === "number") {
      summary[key] = Math.round(summary[key] * 10) / 10;
    }
  });

  Object.keys(summary.mealBreakdown).forEach((mealType) => {
    Object.keys(summary.mealBreakdown[mealType]).forEach((nutrient) => {
      summary.mealBreakdown[mealType][nutrient] =
        Math.round(summary.mealBreakdown[mealType][nutrient] * 10) / 10;
    });
  });

  return summary;
};

module.exports = mongoose.model("Meal", mealSchema);
