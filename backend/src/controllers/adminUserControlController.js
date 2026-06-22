const User = require("../models/User");

const getSafeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  department: user.department,
  position: user.position,
  accountStatus: user.accountStatus,
  authProvider: user.authProvider,
  emailVerified: user.emailVerified,
  avatar: user.avatar,
  presenceStatus: user.presenceStatus,
  lastSeenAt: user.lastSeenAt,
  lastLoginAt: user.lastLoginAt,
  approvedAt: user.approvedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getAllUsersForAdmin = async (req, res) => {
  try {
    const { status = "all", role = "all", search = "" } = req.query;

    const filter = {
      accountStatus: { $ne: "deleted" },
    };

    if (status !== "all") {
      filter.accountStatus = status;
    }

    if (role !== "all") {
      filter.role = role;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { department: regex },
        { position: regex },
      ];
    }

    const users = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpires -googleId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(getSafeUser),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load users",
      error: error.message,
    });
  }
};

const getUserDetailsForAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -resetPasswordToken -resetPasswordExpires -googleId"
    );

    if (!user || user.accountStatus === "deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load user details",
      error: error.message,
    });
  }
};

const approveUser = async (req, res) => {
  try {
    const { role, department, position } = req.body;

    const allowedRoles = ["admin", "manager", "employee"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.accountStatus === "deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.accountStatus = "active";
    user.role = role || user.role || "employee";
    user.department = department ?? user.department;
    user.position = position ?? user.position;
    user.approvedAt = new Date();
    user.approvedBy = req.user._id;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User approved successfully",
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to approve user",
      error: error.message,
    });
  }
};

const updateUserRoleAndPosition = async (req, res) => {
  try {
    const { role, department, position, phone } = req.body;

    const allowedRoles = ["admin", "manager", "employee"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.accountStatus === "deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

const changeUserStatus = async (req, res) => {
  try {
    const { accountStatus } = req.body;

    const allowedStatuses = ["pending", "active", "suspended", "resigned"];

    if (!allowedStatuses.includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.accountStatus === "deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.accountStatus = accountStatus;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

const removeUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user.accountStatus === "deleted") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own account",
      });
    }

    user.accountStatus = "deleted";
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    user.presenceStatus = "offline";

    await user.save();

    res.status(200).json({
      success: true,
      message: "User removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove user",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsersForAdmin,
  getUserDetailsForAdmin,
  approveUser,
  updateUserRoleAndPosition,
  changeUserStatus,
  removeUser,
};