const express = require("express");
const router = express.Router();

const resourceAlertController = require("../controllers/resourceAlert.controller");

router.get("/", resourceAlertController.getResourceAlerts);

module.exports = router;
