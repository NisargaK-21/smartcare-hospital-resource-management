const express = require("express");
const router = express.Router();

const icuResourceController = require("../controllers/icuResource.controller");

router.get("/", icuResourceController.getAllIcuResources);
router.get("/:id", icuResourceController.getIcuResourceById);
router.post("/", icuResourceController.createIcuResource);
router.put("/:id", icuResourceController.updateIcuResource);
router.put("/:id/status", icuResourceController.updateIcuResourceStatus);
router.delete("/:id", icuResourceController.deleteIcuResource);

module.exports = router;
