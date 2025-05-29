const express = require("express");
const multer = require("multer");
const { body, query } = require("express-validator");
const {
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
} = require("../controllers/foodController");
const { protect, optionalAuth } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const searchValidation = [
  query("q")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search query is required"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Skip must be a non-negative integer"),
];

const createFoodValidation = [
  body("name").trim().isLength({ min: 1 }).withMessage("Food name is required"),
  body("category")
    .isIn([
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
    ])
    .withMessage("Please select a valid category"),
  body("nutrition.calories")
    .isNumeric()
    .withMessage("Calories must be a number"),
  body("nutrition.protein").isNumeric().withMessage("Protein must be a number"),
  body("nutrition.carbs").isNumeric().withMessage("Carbs must be a number"),
  body("nutrition.fat").isNumeric().withMessage("Fat must be a number"),
  body("servingSize.amount")
    .isNumeric()
    .withMessage("Serving size amount must be a number"),
  body("servingSize.unit")
    .isIn(["g", "ml", "cup", "tbsp", "tsp", "piece", "slice", "oz", "lb"])
    .withMessage("Please select a valid serving unit"),
];

router.get("/search", optionalAuth, searchValidation, searchFoods);
router.get("/categories", getFoodCategories);
router.get("/popular", optionalAuth, getPopularFoods);
router.get("/suggestions", optionalAuth, getFoodSuggestions);
router.get("/:id", optionalAuth, getFoodById);

router.use(protect); // All routes below require authentication

router.post("/analyze-image", upload.array("images", 5), analyzeImage);

router.post("/barcode", scanBarcode);

router.post("/", createFoodValidation, createFood);
router.put("/:id", createFoodValidation, updateFood);
router.delete("/:id", deleteFood);

module.exports = router;
