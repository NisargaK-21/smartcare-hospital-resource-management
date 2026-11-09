const express = require("express");
const router = express.Router();

const admissionController = require("../controllers/admission.controller");

router.get("/", admissionController.getAllAdmissions);
router.get("/:id", admissionController.getAdmissionById);
router.post("/", admissionController.createAdmission);
router.put("/:id/allocate-bed", admissionController.allocateBed);
router.put("/:id/cancel", admissionController.cancelAdmission);

module.exports = router;
