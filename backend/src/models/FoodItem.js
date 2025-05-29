const mongoose = require("mongoose");

const nutritionSchema = new mongoose.Schema(
  {
    // Macronutrients (per 100g)
    calories: {
      type: Number,
      required: [true, "Calories are required"],
      min: [0, "Calories cannot be negative"],
    },
    protein: {
      type: Number,
      required: [true, "Protein is required"],
      min: [0, "Protein cannot be negative"],
    },
    carbs: {
      type: Number,
      required: [true, "Carbohydrates are required"],
      min: [0, "Carbohydrates cannot be negative"],
    },
    fat: {
      type: Number,
      required: [true, "Fat is required"],
      min: [0, "Fat cannot be negative"],
    },
    fiber: {
      type: Number,
      default: 0,
      min: [0, "Fiber cannot be negative"],
    },
    sugar: {
      type: Number,
      default: 0,
      min: [0, "Sugar cannot be negative"],
    },
    sodium: {
      type: Number,
      default: 0,
      min: [0, "Sodium cannot be negative"],
    },

    // Micronutrients (per 100g)
    vitamins: {
      vitaminA: { type: Number, default: 0 }, // mcg
      vitaminC: { type: Number, default: 0 }, // mg
      vitaminD: { type: Number, default: 0 }, // mcg
      vitaminE: { type: Number, default: 0 }, // mg
      vitaminK: { type: Number, default: 0 }, // mcg
      thiamine: { type: Number, default: 0 }, // mg
      riboflavin: { type: Number, default: 0 }, // mg
      niacin: { type: Number, default: 0 }, // mg
      vitaminB6: { type: Number, default: 0 }, // mg
      folate: { type: Number, default: 0 }, // mcg
      vitaminB12: { type: Number, default: 0 }, // mcg
    },

    minerals: {
      calcium: { type: Number, default: 0 }, // mg
      iron: { type: Number, default: 0 }, // mg
      magnesium: { type: Number, default: 0 }, // mg
      phosphorus: { type: Number, default: 0 }, // mg
      potassium: { type: Number, default: 0 }, // mg
      zinc: { type: Number, default: 0 }, // mg
      copper: { type: Number, default: 0 }, // mg
      manganese: { type: Number, default: 0 }, // mg
      selenium: { type: Number, default: 0 }, // mcg
    },
  },
  { _id: false },
);

const foodItemSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
      maxlength: [200, "Food name cannot exceed 200 characters"],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, "Brand name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Identifiers
    barcode: {
      type: String,
      sparse: true, // Allows multiple null values
      index: true,
    },
    usdaFdcId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Categories
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "fruits",
        "vegetables",
        "grains",
        "protein",
        "dairy",
        "fats-oils",
        "beverages",
        "snacks",
        "sweets",
        "condiments",
        "herbs-spices",
        "prepared-foods",
        "fast-food",
        "other",
      ],
    },
    subcategory: {
      type: String,
      trim: true,
    },

    // Serving Information
    servingSize: {
      amount: {
        type: Number,
        required: [true, "Serving size amount is required"],
        min: [0.1, "Serving size must be at least 0.1"],
      },
      unit: {
        type: String,
        required: [true, "Serving size unit is required"],
        enum: ["g", "ml", "cup", "tbsp", "tsp", "piece", "slice", "oz", "lb"],
      },
      description: {
        type: String,
        trim: true, // e.g., "1 medium apple", "1 slice"
      },
    },

    // Alternative serving sizes
    alternativeServings: [
      {
        amount: Number,
        unit: String,
        description: String,
        gramsEquivalent: Number, // How many grams this serving equals
      },
    ],

    // Nutritional Information (per 100g)
    nutrition: {
      type: nutritionSchema,
      required: [true, "Nutrition information is required"],
    },

    // Additional Information
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    allergens: [
      {
        type: String,
        enum: [
          "milk",
          "eggs",
          "fish",
          "shellfish",
          "tree-nuts",
          "peanuts",
          "wheat",
          "soybeans",
          "sesame",
        ],
      },
    ],

    // Images
    images: [
      {
        url: String,
        alt: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Data Source
    dataSource: {
      type: String,
      required: [true, "Data source is required"],
      enum: [
        "usda",
        "user-generated",
        "barcode-api",
        "manual-entry",
        "ai-analysis",
      ],
    },
    sourceId: String, // Original ID from the data source

    // Verification and Quality
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,

    // Usage Statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,

    // User who added this item (for user-generated content)
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Search optimization
    searchTerms: [
      {
        type: String,
        lowercase: true,
      },
    ],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

foodItemSchema.virtual("primaryImage").get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0] || null;
});

foodItemSchema.virtual("caloriesPerServing").get(function () {
  if (!this.nutrition?.calories || !this.servingSize?.amount) return 0;

  // Convert serving size to grams if needed
  let servingInGrams = this.servingSize.amount;
  if (this.servingSize.unit !== "g") {
    // This would need a conversion table in a real app
    // For now, assume 1:1 ratio for simplicity
    servingInGrams = this.servingSize.amount;
  }

  return Math.round((this.nutrition.calories * servingInGrams) / 100);
});

foodItemSchema.index({ name: "text", brand: "text", description: "text" });
foodItemSchema.index({ category: 1 });
foodItemSchema.index({ barcode: 1 });
foodItemSchema.index({ usdaFdcId: 1 });
foodItemSchema.index({ usageCount: -1 });
foodItemSchema.index({ createdAt: -1 });
foodItemSchema.index({ isActive: 1 });

foodItemSchema.pre("save", function (next) {
  const searchTerms = [];

  if (this.name) {
    searchTerms.push(...this.name.toLowerCase().split(" "));
  }

  if (this.brand) {
    searchTerms.push(...this.brand.toLowerCase().split(" "));
  }

  if (this.description) {
    searchTerms.push(...this.description.toLowerCase().split(" "));
  }

  // Remove duplicates and empty strings
  this.searchTerms = [
    ...new Set(searchTerms.filter((term) => term.length > 2)),
  ];

  next();
});

foodItemSchema.statics.searchFoods = function (query, options = {}) {
  const { category, limit = 20, skip = 0, sortBy = "usageCount" } = options;

  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: "i" } },
      { brand: { $regex: query, $options: "i" } },
      { searchTerms: { $in: [query.toLowerCase()] } },
    ],
  };

  if (category) {
    searchQuery.category = category;
  }

  return this.find(searchQuery)
    .sort({ [sortBy]: -1 })
    .limit(limit)
    .skip(skip)
    .select(
      "name brand category nutrition.calories servingSize images usageCount",
    );
};

foodItemSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model("FoodItem", foodItemSchema);
