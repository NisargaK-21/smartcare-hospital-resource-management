const express = require("express");
const router = express.Router();

const transferController = require("../controllers/transfer.controller");

router.get("/", transferController.getAllTransfers);
router.get("/:id", transferController.getTransferById);
router.post("/", transferController.createTransfer);
router.put("/:id/complete", transferController.completeTransfer);
router.put("/:id/cancel", transferController.cancelTransfer);

module.exports = router;
