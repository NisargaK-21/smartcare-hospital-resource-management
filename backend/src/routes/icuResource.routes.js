const express = require("express");
const router = express.Router();

const icuResourceController = require("../controllers/icuResource.controller");

router.get("/", icuResourceController.getAllIcuResources);
router.get("/:id", icuResourceController.getIcuResourceById);
router.post("/", icuResourceController.createIcuResource);
router.put("/:id", icuResourceController.updateIcuResource);

module.exports = router;
