const express = require("express");

const {
  getAssignableUsers,
  createTask,
  getAdminTasks,
  getMyTasks,
  getTaskById,
  startTask,
  completeTask,
  cancelTask,
  addTaskNote,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

router.use(protect);

router.get(
  "/assignable-users",
  requireRoles("admin", "manager"),
  getAssignableUsers
);

router.post("/", requireRoles("admin", "manager"), createTask);

router.get("/admin", requireRoles("admin", "manager"), getAdminTasks);

router.get("/my", requireRoles("admin", "manager", "employee"), getMyTasks);

router.get("/:id", requireRoles("admin", "manager", "employee"), getTaskById);

router.patch("/:id", requireRoles("admin"), updateTask);

router.delete("/:id", requireRoles("admin"), deleteTask);

router.patch(
  "/:id/start",
  requireRoles("admin", "manager", "employee"),
  startTask
);

router.patch(
  "/:id/complete",
  requireRoles("admin", "manager", "employee"),
  completeTask
);

router.patch("/:id/cancel", requireRoles("admin", "manager"), cancelTask);

router.post(
  "/:id/notes",
  requireRoles("admin", "manager", "employee"),
  addTaskNote
);

module.exports = router;