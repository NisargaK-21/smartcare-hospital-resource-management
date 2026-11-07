const express = require("express");
const router = express.Router();

const patientController = require("../controllers/patient.controller");

router.post("/", patientController.createPatient);
router.get("/", patientController.getAllPatients);

// Keep search route before /:id
router.get("/search", patientController.searchPatients);

router.get("/:id", patientController.getPatientById);
router.put("/:id", patientController.updatePatient);
router.delete("/:id", patientController.deactivatePatient);

module.exports = router;