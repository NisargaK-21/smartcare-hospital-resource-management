const roomService = require("../services/room.service");

const VALID_ROOM_TYPES = [
    "GENERAL",
    "PRIVATE",
    "SEMI_PRIVATE",
    "ISOLATION"
];

// Create room
const createRoom = async (req, res) => {
    try {
        const { ward_id, room_number, room_type, capacity, description } = req.body;

        if (!ward_id || !room_number || !room_type || capacity === undefined) {
            return res.status(400).json({
                success: false,
                message: "ward_id, room_number, room_type and capacity are required"
            });
        }

        if (!Number.isInteger(Number(ward_id)) || Number(ward_id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid ward_id"
            });
        }

        if (!room_number.trim()) {
            return res.status(400).json({
                success: false,
                message: "Room number cannot be empty"
            });
        }

        if (!VALID_ROOM_TYPES.includes(room_type)) {
            return res.status(400).json({
                success: false,
                message: `Room type must be one of: ${VALID_ROOM_TYPES.join(", ")}`
            });
        }

        if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be a positive integer"
            });
        }

        const room = await roomService.createRoom({
            ward_id: Number(ward_id),
            room_number: room_number.trim(),
            room_type,
            capacity: Number(capacity),
            description
        });

        return res.status(201).json({
            success: true,
            message: "Room created successfully",
            data: room
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "This room number already exists in the selected ward"
            });
        }

        if (error.message.includes("Ward")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create room error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create room"
        });
    }
};

// Get all rooms
const getAllRooms = async (req, res) => {
    try {
        const rooms = await roomService.getAllRooms(req.query);

        return res.status(200).json({
            success: true,
            count: rooms.length,
            data: rooms
        });

    } catch (error) {
        console.error("Get rooms error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch rooms"
        });
    }
};

// Get room by ID
const getRoomById = async (req, res) => {
    try {
        const roomId = Number(req.params.id);

        if (!Number.isInteger(roomId) || roomId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            });
        }

        const room = await roomService.getRoomById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: room
        });

    } catch (error) {
        console.error("Get room error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch room"
        });
    }
};

// Update room
const updateRoom = async (req, res) => {
    try {
        const roomId = Number(req.params.id);

        if (!Number.isInteger(roomId) || roomId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            });
        }

        const { ward_id, room_number, room_type, capacity, description } = req.body;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        if (ward_id !== undefined &&
            (!Number.isInteger(Number(ward_id)) || Number(ward_id) <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ward_id"
            });
        }

        if (room_number !== undefined &&
            (typeof room_number !== "string" || !room_number.trim())) {
            return res.status(400).json({
                success: false,
                message: "Room number cannot be empty"
            });
        }

        if (room_type !== undefined && !VALID_ROOM_TYPES.includes(room_type)) {
            return res.status(400).json({
                success: false,
                message: `Room type must be one of: ${VALID_ROOM_TYPES.join(", ")}`
            });
        }

        if (capacity !== undefined &&
            (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be a positive integer"
            });
        }

        const updatedRoom = await roomService.updateRoom(roomId, {
            ward_id: ward_id === undefined ? undefined : Number(ward_id),
            room_number: room_number === undefined ? undefined : room_number.trim(),
            room_type,
            capacity: capacity === undefined ? undefined : Number(capacity),
            description
        });

        if (!updatedRoom) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Room updated successfully",
            data: updatedRoom
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Room number already exists in the selected ward"
            });
        }

        if (error.message.includes("Ward")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update room error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update room"
        });
    }
};

// Soft delete room
const deactivateRoom = async (req, res) => {
    try {
        const roomId = Number(req.params.id);

        if (!Number.isInteger(roomId) || roomId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            });
        }

        const room = await roomService.deactivateRoom(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Room deactivated successfully",
            data: room
        });

    } catch (error) {
        console.error("Deactivate room error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate room"
        });
    }
};

module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoom,
    deactivateRoom
};