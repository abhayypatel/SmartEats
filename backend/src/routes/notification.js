const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Notification routes" });
});

module.exports = router;
