const express = require("express");
const router = express.Router();

const bedReservationController = require("../controllers/bedReservation.controller");

router.get("/", bedReservationController.getAllReservations);
router.get("/:id", bedReservationController.getReservationById);
router.post("/", bedReservationController.createReservation);
router.put("/:id/confirm", bedReservationController.confirmReservation);
router.put("/:id/cancel", bedReservationController.cancelReservation);
router.put("/:id/complete", bedReservationController.completeReservation);
router.put("/:id/expire", bedReservationController.expireReservation);

module.exports = router;
