const express = require("express");

const {
  getAllUsers,
  getUserById,
  createUserByAdmin,
  updateUserByAdmin,
  updateUserStatus,
} = require("../controllers/adminUserController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.route("/users")
  .get(getAllUsers)
  .post(createUserByAdmin);

router.route("/users/:id")
  .get(getUserById)
  .put(updateUserByAdmin);

router.patch("/users/:id/status", updateUserStatus);

module.exports = router;