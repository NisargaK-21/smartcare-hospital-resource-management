const express = require("express");
const router = express.Router();

const bedController = require("../controllers/bed.controller");

router.post("/", bedController.createBed);
router.get("/", bedController.getAllBeds);
router.put("/:id/activate", bedController.activateBed);
router.get("/:id", bedController.getBedById);
router.put("/:id", bedController.updateBed);
router.delete("/:id", bedController.deactivateBed);

module.exports = router;