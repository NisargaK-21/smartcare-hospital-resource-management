const pool = require("../config/db");

// Create a bed
const createBed = async (bedData) => {
    const {
        room_id,
        bed_number,
        bed_type,
        bed_status,
        description
    } = bedData;

    // Check whether the room exists and is active
    const roomResult = await pool.query(
        `SELECT room_id
         FROM public.rooms
         WHERE room_id = $1 AND is_active = TRUE`,
        [room_id]
    );

    if (roomResult.rows.length === 0) {
        throw new Error("Room does not exist or is inactive");
    }

    const result = await pool.query(
        `INSERT INTO public.beds
         (room_id, bed_number, bed_type, bed_status, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            room_id,
            bed_number,
            bed_type || "STANDARD",
            bed_status || "AVAILABLE",
            description || null
        ]
    );

    return result.rows[0];
};

// Get all beds with room, ward and department details
const getAllBeds = async (filters = {}) => {
    let query = `
        SELECT
            b.*,
            r.room_number,
            r.room_type,
            w.ward_name,
            w.ward_id,
            d.department_name
        FROM public.beds b
        JOIN public.rooms r ON b.room_id = r.room_id
        JOIN public.wards w ON r.ward_id = w.ward_id
        JOIN public.departments d ON w.department_id = d.department_id
        WHERE 1 = 1
    `;

    const values = [];

    if (filters.room_id) {
        values.push(filters.room_id);
        query += ` AND b.room_id = $${values.length}`;
    }

    if (filters.ward_id) {
        values.push(filters.ward_id);
        query += ` AND w.ward_id = $${values.length}`;
    }

    if (filters.bed_type) {
        values.push(filters.bed_type);
        query += ` AND b.bed_type = $${values.length}`;
    }

    if (filters.bed_status) {
        values.push(filters.bed_status);
        query += ` AND b.bed_status = $${values.length}`;
    }

    if (filters.is_active !== undefined) {
        values.push(filters.is_active === "true");
        query += ` AND b.is_active = $${values.length}`;
    }

    query += ` ORDER BY b.bed_id ASC`;

    const result = await pool.query(query, values);

    return result.rows;
};

// Get bed by ID
const getBedById = async (bedId) => {
    const result = await pool.query(
        `SELECT
            b.*,
            r.room_number,
            r.room_type,
            w.ward_name,
            w.ward_id,
            d.department_name
         FROM public.beds b
         JOIN public.rooms r ON b.room_id = r.room_id
         JOIN public.wards w ON r.ward_id = w.ward_id
         JOIN public.departments d ON w.department_id = d.department_id
         WHERE b.bed_id = $1`,
        [bedId]
    );

    return result.rows[0];
};

// Update bed
const updateBed = async (bedId, bedData) => {
    const allowedFields = [
        "room_id",
        "bed_number",
        "bed_type",
        "bed_status",
        "description"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
        if (bedData[field] !== undefined) {
            values.push(bedData[field]);
            updates.push(`${field} = $${values.length}`);
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    if (bedData.room_id !== undefined) {
        const roomResult = await pool.query(
            `SELECT room_id
             FROM public.rooms
             WHERE room_id = $1 AND is_active = TRUE`,
            [bedData.room_id]
        );

        if (roomResult.rows.length === 0) {
            throw new Error("Room does not exist or is inactive");
        }
    }

    values.push(bedId);

    const result = await pool.query(
        `UPDATE public.beds
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE bed_id = $${values.length}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// Soft-delete bed
const deactivateBed = async (bedId) => {
    const result = await pool.query(
        `UPDATE public.beds
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE bed_id = $1
         RETURNING *`,
        [bedId]
    );

    return result.rows[0];
};

const activateBed = async (bedId) => {
    const result = await pool.query(
        `UPDATE public.beds
         SET is_active = TRUE,
             updated_at = NOW()
         WHERE bed_id = $1
         RETURNING *`,
        [bedId]
    );

    return result.rows[0];
};

module.exports = {
    createBed,
    getAllBeds,
    getBedById,
    updateBed,
    deactivateBed,
    activateBed
};
