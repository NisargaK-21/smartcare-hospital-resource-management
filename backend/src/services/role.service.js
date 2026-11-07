const pool = require("../config/db");

// Create a role
const createRole = async (roleData) => {
    const { role_name, description } = roleData;

    const result = await pool.query(
        `INSERT INTO public.roles (role_name, description)
         VALUES ($1, $2)
         RETURNING *`,
        [role_name, description || null]
    );

    return result.rows[0];
};

// Get all roles
const getAllRoles = async (filters = {}) => {
    let query = `
        SELECT *
        FROM public.roles
        WHERE 1 = 1
    `;

    const values = [];

    if (filters.is_active !== undefined) {
        values.push(filters.is_active === "true");
        query += ` AND is_active = $${values.length}`;
    }

    query += ` ORDER BY role_id ASC`;

    const result = await pool.query(query, values);

    return result.rows;
};

// Get role by ID
const getRoleById = async (roleId) => {
    const result = await pool.query(
        `SELECT *
         FROM public.roles
         WHERE role_id = $1`,
        [roleId]
    );

    return result.rows[0];
};

// Update role
const updateRole = async (roleId, roleData) => {
    const allowedFields = ["role_name", "description"];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
        if (roleData[field] !== undefined) {
            values.push(roleData[field]);
            updates.push(`${field} = $${values.length}`);
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    values.push(roleId);

    const result = await pool.query(
        `UPDATE public.roles
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE role_id = $${values.length}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// Soft-delete role
const deactivateRole = async (roleId) => {
    const result = await pool.query(
        `UPDATE public.roles
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE role_id = $1
         RETURNING *`,
        [roleId]
    );

    return result.rows[0];
};

module.exports = {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deactivateRole
};