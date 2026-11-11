const express = require("express");
const router = express.Router();

const dischargeController = require("../controllers/discharge.controller");

router.get("/", dischargeController.getAllDischarges);
router.get("/:id", dischargeController.getDischargeById);
router.post("/", dischargeController.createDischarge);
router.put("/:id/complete", dischargeController.completeDischarge);
router.put("/:id/cancel", dischargeController.cancelDischarge);

module.exports = router;
