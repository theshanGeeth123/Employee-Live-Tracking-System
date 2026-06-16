const express = require("express");

const {
  getSettings,
  updateSettings,
  resetSettingsToDefault,
} = require("../controllers/settingsController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", authorizeRoles("admin", "manager"), getSettings);

router.put("/", authorizeRoles("admin"), updateSettings);

router.post("/reset", authorizeRoles("admin"), resetSettingsToDefault);

module.exports = router;