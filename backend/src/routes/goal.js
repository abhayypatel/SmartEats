const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Goal routes" });
});

module.exports = router;
