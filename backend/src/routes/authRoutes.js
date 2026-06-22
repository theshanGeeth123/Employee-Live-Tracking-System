const express = require("express");

const {
  registerEmployee,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
  logoutUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerEmployee);
router.post("/login", loginUser);
router.post("/google", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);

module.exports = router;