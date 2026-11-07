const bedService = require("../services/bed.service");

const VALID_BED_TYPES = [
    "STANDARD",
    "ELECTRIC",
    "ICU",
    "PEDIATRIC",
    "BARIATRIC"
];

const VALID_BED_STATUSES = [
    "AVAILABLE",
    "OCCUPIED",
    "RESERVED",
    "MAINTENANCE"
];

// Create bed
const createBed = async (req, res) => {
    try {
        const {
            room_id,
            bed_number,
            bed_type,
            bed_status,
            description
        } = req.body;

        if (!room_id || !bed_number) {
            return res.status(400).json({
                success: false,
                message: "room_id and bed_number are required"
            });
        }

        if (!Number.isInteger(Number(room_id)) || Number(room_id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid room_id"
            });
        }

        if (typeof bed_number !== "string" || !bed_number.trim()) {
            return res.status(400).json({
                success: false,
                message: "Bed number cannot be empty"
            });
        }

        const selectedType = bed_type || "STANDARD";
        const selectedStatus = bed_status || "AVAILABLE";

        if (!VALID_BED_TYPES.includes(selectedType)) {
            return res.status(400).json({
                success: false,
                message: `Bed type must be one of: ${VALID_BED_TYPES.join(", ")}`
            });
        }

        if (!VALID_BED_STATUSES.includes(selectedStatus)) {
            return res.status(400).json({
                success: false,
                message: `Bed status must be one of: ${VALID_BED_STATUSES.join(", ")}`
            });
        }

        const bed = await bedService.createBed({
            room_id: Number(room_id),
            bed_number: bed_number.trim(),
            bed_type: selectedType,
            bed_status: selectedStatus,
            description
        });

        return res.status(201).json({
            success: true,
            message: "Bed created successfully",
            data: bed
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "This bed number already exists in the selected room"
            });
        }

        if (error.message.includes("Room")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create bed error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create bed"
        });
    }
};

// Get all beds
const getAllBeds = async (req, res) => {
    try {
        const beds = await bedService.getAllBeds(req.query);

        return res.status(200).json({
            success: true,
            count: beds.length,
            data: beds
        });

    } catch (error) {
        console.error("Get beds error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch beds"
        });
    }
};

// Get bed by ID
const getBedById = async (req, res) => {
    try {
        const bedId = Number(req.params.id);

        if (!Number.isInteger(bedId) || bedId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid bed ID"
            });
        }

        const bed = await bedService.getBedById(bedId);

        if (!bed) {
            return res.status(404).json({
                success: false,
                message: "Bed not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: bed
        });

    } catch (error) {
        console.error("Get bed error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bed"
        });
    }
};

// Update bed
const updateBed = async (req, res) => {
    try {
        const bedId = Number(req.params.id);

        if (!Number.isInteger(bedId) || bedId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid bed ID"
            });
        }

        const {
            room_id,
            bed_number,
            bed_type,
            bed_status,
            description
        } = req.body;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        if (room_id !== undefined &&
            (!Number.isInteger(Number(room_id)) || Number(room_id) <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room_id"
            });
        }

        if (bed_number !== undefined &&
            (typeof bed_number !== "string" || !bed_number.trim())) {
            return res.status(400).json({
                success: false,
                message: "Bed number cannot be empty"
            });
        }

        if (bed_type !== undefined && !VALID_BED_TYPES.includes(bed_type)) {
            return res.status(400).json({
                success: false,
                message: `Bed type must be one of: ${VALID_BED_TYPES.join(", ")}`
            });
        }

        if (bed_status !== undefined &&
            !VALID_BED_STATUSES.includes(bed_status)) {
            return res.status(400).json({
                success: false,
                message: `Bed status must be one of: ${VALID_BED_STATUSES.join(", ")}`
            });
        }

        const updatedBed = await bedService.updateBed(bedId, {
            room_id: room_id === undefined ? undefined : Number(room_id),
            bed_number: bed_number === undefined ? undefined : bed_number.trim(),
            bed_type,
            bed_status,
            description
        });

        if (!updatedBed) {
            return res.status(404).json({
                success: false,
                message: "Bed not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bed updated successfully",
            data: updatedBed
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Bed number already exists in the selected room"
            });
        }

        if (error.message.includes("Room")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update bed error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update bed"
        });
    }
};

// Soft delete bed
const deactivateBed = async (req, res) => {
    try {
        const bedId = Number(req.params.id);

        if (!Number.isInteger(bedId) || bedId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid bed ID"
            });
        }

        const bed = await bedService.deactivateBed(bedId);

        if (!bed) {
            return res.status(404).json({
                success: false,
                message: "Bed not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bed deactivated successfully",
            data: bed
        });

    } catch (error) {
        console.error("Deactivate bed error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate bed"
        });
    }
};

module.exports = {
    createBed,
    getAllBeds,
    getBedById,
    updateBed,
    deactivateBed
};