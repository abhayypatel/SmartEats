const asyncHandler = require("../utils/asyncHandler");

const register = asyncHandler(async (req, res) => {
  res.status(201).json({
    success: true,
    message: "User registered successfully",
  });
});

const login = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User logged in successfully",
  });
});

const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
  });
});

const changePassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password reset email sent",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

const googleAuth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Google auth successful",
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Verification email sent",
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
