const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Meal routes" });
});

module.exports = router;
