const express = require("express");

const {
  getAllUsersForAdmin,
  getUserDetailsForAdmin,
  approveUser,
  updateUserRoleAndPosition,
  changeUserStatus,
  removeUser,
} = require("../controllers/adminUserControlController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

router.use(protect);
router.use(adminOnly);

router.get("/", getAllUsersForAdmin);
router.get("/:id", getUserDetailsForAdmin);

router.patch("/:id/approve", approveUser);
router.patch("/:id/update-role-position", updateUserRoleAndPosition);
router.patch("/:id/status", changeUserStatus);
router.delete("/:id", removeUser);

module.exports = router;