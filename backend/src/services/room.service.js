const pool = require("../config/db");

// Create a room
const createRoom = async (roomData) => {
    const {
        ward_id,
        room_number,
        room_type,
        capacity,
        description
    } = roomData;

    // Check whether the ward exists and is active
    const wardResult = await pool.query(
        `SELECT ward_id
         FROM public.wards
         WHERE ward_id = $1 AND is_active = TRUE`,
        [ward_id]
    );

    if (wardResult.rows.length === 0) {
        throw new Error("Ward does not exist or is inactive");
    }

    const result = await pool.query(
        `INSERT INTO public.rooms
         (ward_id, room_number, room_type, capacity, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ward_id, room_number, room_type, capacity, description || null]
    );

    return result.rows[0];
};

// Get all rooms with ward and department details
const getAllRooms = async (filters = {}) => {
    let query = `
        SELECT
            r.*,
            w.ward_name,
            w.ward_code,
            w.ward_type,
            d.department_name
        FROM public.rooms r
        JOIN public.wards w ON r.ward_id = w.ward_id
        JOIN public.departments d ON w.department_id = d.department_id
        WHERE 1 = 1
    `;

    const values = [];

    if (filters.ward_id) {
        values.push(filters.ward_id);
        query += ` AND r.ward_id = $${values.length}`;
    }

    if (filters.room_type) {
        values.push(filters.room_type);
        query += ` AND r.room_type = $${values.length}`;
    }

    if (filters.is_active !== undefined) {
        values.push(filters.is_active === "true");
        query += ` AND r.is_active = $${values.length}`;
    }

    query += ` ORDER BY r.room_id ASC`;

    const result = await pool.query(query, values);

    return result.rows;
};

// Get room by ID
const getRoomById = async (roomId) => {
    const result = await pool.query(
        `SELECT
            r.*,
            w.ward_name,
            w.ward_code,
            d.department_name
         FROM public.rooms r
         JOIN public.wards w ON r.ward_id = w.ward_id
         JOIN public.departments d ON w.department_id = d.department_id
         WHERE r.room_id = $1`,
        [roomId]
    );

    return result.rows[0];
};

// Update room
const updateRoom = async (roomId, roomData) => {
    const allowedFields = [
        "ward_id",
        "room_number",
        "room_type",
        "capacity",
        "description"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
        if (roomData[field] !== undefined) {
            values.push(roomData[field]);
            updates.push(`${field} = $${values.length}`);
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    if (roomData.ward_id !== undefined) {
        const wardResult = await pool.query(
            `SELECT ward_id
             FROM public.wards
             WHERE ward_id = $1 AND is_active = TRUE`,
            [roomData.ward_id]
        );

        if (wardResult.rows.length === 0) {
            throw new Error("Ward does not exist or is inactive");
        }
    }

    values.push(roomId);

    const result = await pool.query(
        `UPDATE public.rooms
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE room_id = $${values.length}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// Soft delete room
const deactivateRoom = async (roomId) => {
    const result = await pool.query(
        `UPDATE public.rooms
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE room_id = $1
         RETURNING *`,
        [roomId]
    );

    return result.rows[0];
};

module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoom,
    deactivateRoom
};