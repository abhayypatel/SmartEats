const express = require("express");
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/progressController");

const router = express.Router();

router.use(protect);

router.route("/weight").get(getWeightEntries).post(addWeightEntry);
router.get("/weight/progress", getWeightProgress);
router.route("/achievements").get(getAchievements).put(updateAchievements);
router.get("/overall", getOverallProgress);
router.get("/nutrition/daily/:date?", getDailyNutrition);
router.get("/calories/trend", getCalorieTrend);
router.put("/goals", updateUserGoals);
router.get("/dashboard", getDashboardData);

module.exports = router;
