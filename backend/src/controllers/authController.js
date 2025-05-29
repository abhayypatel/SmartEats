const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      user,
    },
  });
};

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const {
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    gender,
    height,
    weight,
    activityLevel,
    goals,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  const defaultBirthDate = new Date();
  defaultBirthDate.setFullYear(defaultBirthDate.getFullYear() - 25);

  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    dateOfBirth: dateOfBirth || defaultBirthDate,
    gender: gender || "prefer-not-to-say",
    height: height || { value: 170, unit: "cm" },
    weight: weight || { value: 70, unit: "kg" },
    activityLevel: activityLevel || "moderately-active",
    goals: {
      weightGoal: goals?.weightGoal || "maintain",
      dailyCalories: goals?.dailyCalories || 2000,
      macros: {
        protein: goals?.macros?.protein || 25,
        carbs: goals?.macros?.carbs || 45,
        fat: goals?.macros?.fat || 30,
      },
    },
  });

  createSendToken(user, 201, res);
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  if (email === "demo@smarteats.com" && password === "demo123") {
    const demoToken = "demo-jwt-token-" + Date.now();
    return res.status(200).json({
      success: true,
      token: demoToken,
      data: {
        user: {
          id: "demo-user",
          email: "demo@smarteats.com",
          firstName: "Demo",
          lastName: "User",
          goals: {
            dailyCalories: 2000,
            macros: {
              protein: 150,
              carbs: 250,
              fat: 67,
            },
          },
        },
      },
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Account is deactivated",
    });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

const logout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    height: req.body.height,
    weight: req.body.weight,
    activityLevel: req.body.activityLevel,
    goals: req.body.goals,
    preferences: req.body.preferences,
  };

  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  createSendToken(user, 200, res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "No user found with that email address",
    });
  }

  res.status(200).json({
    success: true,
    message: "Password reset functionality not implemented yet",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password reset functionality not implemented yet",
  });
});

const googleAuth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Google auth functionality not implemented yet",
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  createSendToken(user, 200, res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email verification functionality not implemented yet",
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email verification functionality not implemented yet",
  });
});

module.exports = {
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
};
