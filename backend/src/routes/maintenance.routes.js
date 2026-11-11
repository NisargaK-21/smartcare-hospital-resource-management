const express = require("express");
const router = express.Router();

const maintenanceController = require("../controllers/maintenance.controller");

router.get("/", maintenanceController.getAllMaintenance);
router.get("/:id", maintenanceController.getMaintenanceById);
router.post("/", maintenanceController.createMaintenance);
router.put("/:id/start", maintenanceController.startMaintenance);
router.put("/:id/complete", maintenanceController.completeMaintenance);
router.put("/:id/cancel", maintenanceController.cancelMaintenance);

module.exports = router;
