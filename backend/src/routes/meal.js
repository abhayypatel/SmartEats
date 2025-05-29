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

router.route("/").get(getMeals).post(createMeal);
router.route("/:id").get(getMealById).put(updateMeal).delete(deleteMeal);
router.get("/summary/daily/:date?", getDailySummary);
router.get("/summary/weekly", getWeeklySummary);
router.get("/streak", getStreak);

module.exports = router;
