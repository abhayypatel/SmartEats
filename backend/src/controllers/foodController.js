const { validationResult } = require("express-validator");
const FoodItem = require("../models/FoodItem");
const openaiService = require("../services/openaiService");
const cloudinaryService = require("../services/cloudinaryService");
const asyncHandler = require("../utils/asyncHandler");

const analyzeImage = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please upload at least one image",
    });
  }

  try {
    const results = [];

    for (const file of req.files) {
      const uploadResult = await cloudinaryService.uploadImage(file.buffer, {
        folder: "food-analysis",
        resource_type: "image",
        transformation: [
          { width: 1000, height: 1000, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });

      const analysisOptions = {
        includePortionSizes: req.body.includePortionSizes === "true",
        includeMicronutrients: req.body.includeMicronutrients === "true",
        userPreferences: {
          dietaryRestrictions: req.body.dietaryRestrictions
            ? JSON.parse(req.body.dietaryRestrictions)
            : [],
        },
      };

      const analysis = await openaiService.analyzeFoodImage(
        uploadResult.secure_url,
        analysisOptions,
      );

      results.push({
        imageUrl: uploadResult.secure_url,
        imageId: uploadResult.public_id,
        analysis: analysis.data,
        confidence: analysis.data.confidence || 0.8,
      });
    }

    // If multiple images, combine results
    let combinedResult;
    if (results.length === 1) {
      combinedResult = results[0];
    } else {
      // Combine multiple image analyses
      combinedResult = {
        images: results.map((r) => ({ url: r.imageUrl, id: r.imageId })),
        analysis: {
          foods: results.flatMap((r) => r.analysis.foods || []),
          totalNutrition: results.reduce((total, r) => {
            const nutrition = r.analysis.totalNutrition || {};
            return {
              calories: (total.calories || 0) + (nutrition.calories || 0),
              protein: (total.protein || 0) + (nutrition.protein || 0),
              carbs: (total.carbs || 0) + (nutrition.carbs || 0),
              fat: (total.fat || 0) + (nutrition.fat || 0),
              fiber: (total.fiber || 0) + (nutrition.fiber || 0),
              sugar: (total.sugar || 0) + (nutrition.sugar || 0),
              sodium: (total.sodium || 0) + (nutrition.sodium || 0),
            };
          }, {}),
          mealType: results[0].analysis.mealType || "unknown",
          notes: results
            .map((r) => r.analysis.notes)
            .filter(Boolean)
            .join("; "),
        },
        confidence:
          results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      };
    }

    res.status(200).json({
      success: true,
      data: combinedResult,
    });
  } catch (error) {
    console.error("Image analysis error:", error);

    // Provide more specific error messages
    if (error.message.includes("Cloudinary")) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    if (
      error.message.includes("OpenAI") ||
      error.message.includes("AI service")
    ) {
      return res.status(500).json({
        success: false,
        message: "Failed to analyze image with AI. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze image",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

const searchFoods = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }

  const {
    q: query,
    category,
    limit = 20,
    skip = 0,
    sortBy = "usageCount",
  } = req.query;

  try {
    const foods = await FoodItem.searchFoods(query, {
      category,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
    });

    // If user is authenticated, update search history
    if (req.user) {
      // Could implement search history tracking here
    }

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    console.error("Food search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search foods",
    });
  }
});

const getFoodById = asyncHandler(async (req, res) => {
  try {
    const food = await FoodItem.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    // Increment usage count if user is authenticated
    if (req.user) {
      await food.incrementUsage();
    }

    res.status(200).json({
      success: true,
      data: food,
    });
  } catch (error) {
    console.error("Get food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get food",
    });
  }
});

const createFood = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }

  try {
    const foodData = {
      ...req.body,
      addedBy: req.user._id,
      dataSource: "user-generated",
    };

    const food = await FoodItem.create(foodData);

    res.status(201).json({
      success: true,
      data: food,
    });
  } catch (error) {
    console.error("Create food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create food",
    });
  }
});

const updateFood = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: errors.array(),
    });
  }

  try {
    const food = await FoodItem.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    // Check if user owns this food item or is admin
    if (food.addedBy && food.addedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this food",
      });
    }

    const updatedFood = await FoodItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedFood,
    });
  } catch (error) {
    console.error("Update food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update food",
    });
  }
});

const deleteFood = asyncHandler(async (req, res) => {
  try {
    const food = await FoodItem.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    // Check if user owns this food item or is admin
    if (food.addedBy && food.addedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this food",
      });
    }

    await food.deleteOne();

    res.status(200).json({
      success: true,
      message: "Food deleted successfully",
    });
  } catch (error) {
    console.error("Delete food error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete food",
    });
  }
});

const scanBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({
      success: false,
      message: "Barcode is required",
    });
  }

  try {
    // First check our database
    let food = await FoodItem.findOne({ barcode, isActive: true });

    if (food) {
      await food.incrementUsage();
      return res.status(200).json({
        success: true,
        data: food,
        source: "database",
      });
    }

    // If not found, try external barcode API (implement based on chosen service)
    // For now, return not found
    res.status(404).json({
      success: false,
      message: "Product not found. You can add it manually.",
    });
  } catch (error) {
    console.error("Barcode scan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to scan barcode",
    });
  }
});

const getFoodSuggestions = asyncHandler(async (req, res) => {
  try {
    let suggestions;

    if (req.user) {
      // Personalized suggestions based on user's recent foods and goals
      suggestions = await FoodItem.find({
        isActive: true,
        // Add logic for personalized recommendations
      })
        .sort({ usageCount: -1 })
        .limit(10)
        .select("name brand category nutrition.calories servingSize images");
    } else {
      // General popular foods
      suggestions = await FoodItem.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(10)
        .select("name brand category nutrition.calories servingSize images");
    }

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get suggestions",
    });
  }
});

const getPopularFoods = asyncHandler(async (req, res) => {
  try {
    const { limit = 20, category } = req.query;

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const foods = await FoodItem.find(query)
      .sort({ usageCount: -1 })
      .limit(parseInt(limit))
      .select(
        "name brand category nutrition.calories servingSize images usageCount",
      );

    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    console.error("Get popular foods error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get popular foods",
    });
  }
});

const getFoodCategories = asyncHandler(async (req, res) => {
  const categories = [
    { id: "fruits", name: "Fruits", icon: "🍎" },
    { id: "vegetables", name: "Vegetables", icon: "🥕" },
    { id: "grains", name: "Grains", icon: "🌾" },
    { id: "protein", name: "Protein", icon: "🍗" },
    { id: "dairy", name: "Dairy", icon: "🥛" },
    { id: "fats-oils", name: "Fats & Oils", icon: "🫒" },
    { id: "beverages", name: "Beverages", icon: "🥤" },
    { id: "snacks", name: "Snacks", icon: "🍿" },
    { id: "sweets", name: "Sweets", icon: "🍰" },
    { id: "condiments", name: "Condiments", icon: "🧂" },
    { id: "herbs-spices", name: "Herbs & Spices", icon: "🌿" },
    { id: "prepared-foods", name: "Prepared Foods", icon: "🍽️" },
    { id: "fast-food", name: "Fast Food", icon: "🍔" },
    { id: "other", name: "Other", icon: "🍴" },
  ];

  res.status(200).json({
    success: true,
    data: categories,
  });
});

module.exports = {
  analyzeImage,
  searchFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood,
  scanBarcode,
  getFoodSuggestions,
  getPopularFoods,
  getFoodCategories,
};
