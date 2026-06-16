const User = require("../models/User");

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const { role, accountStatus, search } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get users",
      error: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user",
      error: error.message,
    });
  }
};

// @desc    Create user by admin
// @route   POST /api/admin/users
// @access  Admin
const createUserByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      department,
      position,
      accountStatus,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    const allowedRoles = ["admin", "manager", "employee"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      department,
      position,
      accountStatus: accountStatus || "active",
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        accountStatus: user.accountStatus,
        presenceStatus: user.presenceStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Admin
const updateUserByAdmin = async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      position,
      role,
      accountStatus,
    } = req.body;

    const user = await User.findById(req.params.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (role) {
      const allowedRoles = ["admin", "manager", "employee"];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      user.role = role;
    }

    if (accountStatus) {
      const allowedStatuses = ["active", "suspended", "resigned"];

      if (!allowedStatuses.includes(accountStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account status",
        });
      }

      user.accountStatus = accountStatus;
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        accountStatus: user.accountStatus,
        presenceStatus: user.presenceStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// @desc    Update account status
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;

    const allowedStatuses = ["active", "suspended", "resigned"];

    if (!allowedStatuses.includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.accountStatus = accountStatus;

    if (accountStatus !== "active") {
      user.presenceStatus = "offline";
      user.lastSeenAt = new Date();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        presenceStatus: user.presenceStatus,
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUserByAdmin,
  updateUserByAdmin,
  updateUserStatus,
};