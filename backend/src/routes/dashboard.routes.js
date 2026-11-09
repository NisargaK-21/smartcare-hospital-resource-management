const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");

router.get("/stats",             dashboardController.getOverallStats);
router.get("/ward-occupancy",    dashboardController.getWardOccupancy);
router.get("/department-stats",  dashboardController.getDepartmentStats);
router.get("/bed-status",        dashboardController.getBedStatusBreakdown);
router.get("/recent-patients",   dashboardController.getRecentPatients);
router.get("/staff-summary",     dashboardController.getStaffSummary);

module.exports = router;
