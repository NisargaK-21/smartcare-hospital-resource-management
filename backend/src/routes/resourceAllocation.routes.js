const express = require("express");
const router = express.Router();

const resourceAllocationController = require("../controllers/resourceAllocation.controller");

router.get("/", resourceAllocationController.getAllResourceAllocations);
router.get("/:id", resourceAllocationController.getResourceAllocationById);
router.post("/", resourceAllocationController.createResourceAllocation);
router.put("/:id/release", resourceAllocationController.releaseResourceAllocation);
router.put("/:id/cancel", resourceAllocationController.cancelResourceAllocation);

module.exports = router;
