const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendPasswordResetEmail } = require("../services/emailService");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getUserResponse = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  department: user.department,
  position: user.position,
  accountStatus: user.accountStatus,
  presenceStatus: user.presenceStatus,
  authProvider: user.authProvider,
  avatar: user.avatar,
  emailVerified: user.emailVerified,
  lastLoginAt: user.lastLoginAt,
  approvedAt: user.approvedAt,
  createdAt: user.createdAt,
});

const getInactiveAccountMessage = (accountStatus) => {
  if (accountStatus === "pending") {
    return "Your account is waiting for admin approval.";
  }

  if (accountStatus === "suspended") {
    return "Your account has been suspended. Please contact admin.";
  }

  if (accountStatus === "resigned") {
    return "Your account has been marked as resigned. Please contact admin.";
  }

  return "Your account is not active. Please contact admin.";
};

const sendAuthResponse = (res, user, message) => {
  const token = generateToken(user._id);

  return res.status(200).json({
    success: true,
    message,
    token,
    user: getUserResponse(user),
  });
};

const sendPendingApprovalResponse = (res, user, message, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    pendingApproval: true,
    accountStatus: "pending",
    message,
    user: getUserResponse(user),
  });
};

// @desc    Register employee
// @route   POST /api/auth/register
// @access  Public
const registerEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, department, position } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.accountStatus !== "deleted") {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone || "",
      department: department || "",
      position: position || "",
      role: "employee",
      authProvider: "local",
      emailVerified: false,
      accountStatus: "pending",
    });

    return sendPendingApprovalResponse(
      res,
      user,
      "Registration successful. Your account is waiting for admin approval.",
      201
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user || user.accountStatus === "deleted") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: getInactiveAccountMessage(user.accountStatus),
      });
    }

    const isPasswordMatched = await user.matchPassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, user, "Login successful");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// @desc    Google login/register
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "Google client ID is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({
        success: false,
        message: "Google account email not found",
      });
    }

    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Google email is not verified",
      });
    }

    const email = payload.email.trim().toLowerCase();

    let user = await User.findOne({ email }).select("+googleId");

    if (user && user.accountStatus === "deleted") {
      return res.status(403).json({
        success: false,
        accountStatus: "deleted",
        message: "This account was removed. Please contact admin.",
      });
    }

    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        role: "employee",
        authProvider: "google",
        googleId: payload.sub,
        avatar: payload.picture || "",
        emailVerified: true,
        accountStatus: "pending",
      });

      return sendPendingApprovalResponse(
        res,
        user,
        "Google registration successful. Your account is waiting for admin approval.",
        201
      );
    }

    user.googleId = user.googleId || payload.sub;
    user.avatar = payload.picture || user.avatar || "";
    user.emailVerified = true;

    if (user.authProvider === "local") {
      user.authProvider = "both";
    }

    await user.save();

    if (user.accountStatus === "pending") {
      return sendPendingApprovalResponse(
        res,
        user,
        "Your account is waiting for admin approval."
      );
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: getInactiveAccountMessage(user.accountStatus),
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, user, "Google login successful");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Google login failed",
      error: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
      accountStatus: { $ne: "deleted" },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email exists, a password reset link has been sent.",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        accountStatus: user.accountStatus,
        message: getInactiveAccountMessage(user.accountStatus),
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    return res.status(200).json({
      success: true,
      message: "If this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send password reset email",
      error: error.message,
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      accountStatus: "active",
    }).select("+resetPasswordToken +resetPasswordExpires +password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    user.password = password;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = null;

    if (user.authProvider === "google") {
      user.authProvider = "both";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

// @desc    Get logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: getUserResponse(req.user),
  });
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

module.exports = {
  registerEmployee,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
  logoutUser,
};