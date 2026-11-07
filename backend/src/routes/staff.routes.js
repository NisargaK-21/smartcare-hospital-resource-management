
const express = require("express");
const router = express.Router();

const staffController = require("../controllers/staff.controller");

// Search must come before /:id
router.get("/search", staffController.searchStaff);

router.post("/", staffController.createStaff);
router.get("/", staffController.getAllStaff);
router.get("/:id", staffController.getStaffById);
router.put("/:id", staffController.updateStaff);
router.delete("/:id", staffController.deactivateStaff);

module.exports = router;
