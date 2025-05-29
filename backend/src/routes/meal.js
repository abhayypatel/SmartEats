const express = require("express");
const { protect } = require("../middleware/auth");
const {
  getMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  getDailySummary,
  getWeeklySummary,
  getStreak,
} = require("../controllers/mealController");

const router = express.Router();

router.use(protect);

// Specific routes MUST come before parameterized routes
router.get("/streak", getStreak);
router.get("/summary/daily/:date?", getDailySummary);
router.get("/summary/weekly", getWeeklySummary);

// General CRUD routes (parameterized routes come last)
router.route("/").get(getMeals).post(createMeal);
router.route("/:id").get(getMealById).put(updateMeal).delete(deleteMeal);

module.exports = router;
