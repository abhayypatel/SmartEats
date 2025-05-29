const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  refreshToken,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const { protect, sensitiveOperationLimit } = require("../middleware/auth");

const router = express.Router();

const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("First name is required"),
  body("lastName")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Last name is required"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),
  body("gender")
    .isIn(["male", "female", "other", "prefer-not-to-say"])
    .withMessage("Please select a valid gender"),
  body("height.value").isNumeric().withMessage("Height must be a number"),
  body("weight.value").isNumeric().withMessage("Weight must be a number"),
  body("goals.dailyCalories")
    .isNumeric()
    .withMessage("Daily calories must be a number"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").exists().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword").exists().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

router.post("/register", registerValidation, register);
router.post("/login", sensitiveOperationLimit(), loginValidation, login);
router.post("/google", googleAuth);
router.post(
  "/forgot-password",
  sensitiveOperationLimit(15 * 60 * 1000, 3),
  forgotPassword,
);
router.post("/reset-password/:token", sensitiveOperationLimit(), resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post(
  "/resend-verification",
  sensitiveOperationLimit(),
  resendVerification,
);

router.use(protect); // All routes below require authentication

router.get("/me", getMe);
router.put("/profile", updateProfile);
router.post("/logout", logout);
router.post(
  "/change-password",
  sensitiveOperationLimit(),
  changePasswordValidation,
  changePassword,
);
router.post("/refresh-token", refreshToken);

module.exports = router;
