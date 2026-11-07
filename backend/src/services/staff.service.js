
const pool = require("../config/db");

const createStaff = async (staffData) => {
    const {
        employee_number,
        first_name,
        last_name,
        role_id,
        department_id,
        designation,
        phone,
        email,
        hire_date
    } = staffData;

    // Verify that the role exists and is active
    const role = await pool.query(
        "SELECT role_id FROM public.roles WHERE role_id = $1 AND is_active = TRUE",
        [role_id]
    );

    if (role.rows.length === 0) {
        throw new Error("Role does not exist or is inactive");
    }

    // Verify that the department exists and is active
    const department = await pool.query(
        "SELECT department_id FROM public.departments WHERE department_id = $1 AND is_active = TRUE",
        [department_id]
    );

    if (department.rows.length === 0) {
        throw new Error("Department does not exist or is inactive");
    }

    const result = await pool.query(
        `INSERT INTO public.staff (
            employee_number,
            first_name,
            last_name,
            role_id,
            department_id,
            designation,
            phone,
            email,
            hire_date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
            employee_number,
            first_name,
            last_name,
            role_id,
            department_id,
            designation || null,
            phone,
            email || null,
            hire_date
        ]
    );

    return result.rows[0];
};

const getAllStaff = async (filters = {}) => {
    let query = `
        SELECT
            s.*,
            r.role_name,
            d.department_name
        FROM public.staff s
        JOIN public.roles r ON s.role_id = r.role_id
        JOIN public.departments d ON s.department_id = d.department_id
        WHERE 1=1
    `;

    const values = [];
    let index = 1;

    if (filters.department_id) {
        query += ` AND s.department_id = $${index++}`;
        values.push(filters.department_id);
    }

    if (filters.role_id) {
        query += ` AND s.role_id = $${index++}`;
        values.push(filters.role_id);
    }

    if (filters.employment_status) {
        query += ` AND s.employment_status = $${index++}`;
        values.push(filters.employment_status);
    }

    if (filters.is_active !== undefined) {
        query += ` AND s.is_active = $${index++}`;
        values.push(filters.is_active);
    }

    query += " ORDER BY s.staff_id DESC";

    const result = await pool.query(query, values);
    return result.rows;
};

const getStaffById = async (id) => {
    const result = await pool.query(
        `SELECT
            s.*,
            r.role_name,
            d.department_name
         FROM public.staff s
         JOIN public.roles r ON s.role_id = r.role_id
         JOIN public.departments d ON s.department_id = d.department_id
         WHERE s.staff_id = $1`,
        [id]
    );

    return result.rows[0];
};

const searchStaff = async (searchTerm) => {
    const result = await pool.query(
        `SELECT
            s.*,
            r.role_name,
            d.department_name
         FROM public.staff s
         JOIN public.roles r ON s.role_id = r.role_id
         JOIN public.departments d ON s.department_id = d.department_id
         WHERE
            s.employee_number ILIKE $1 OR
            s.first_name ILIKE $1 OR
            s.last_name ILIKE $1 OR
            (s.first_name || ' ' || s.last_name) ILIKE $1
         ORDER BY s.staff_id DESC`,
        [`%${searchTerm}%`]
    );

    return result.rows;
};

const updateStaff = async (id, staffData) => {
    const allowedFields = [
        "employee_number",
        "first_name",
        "last_name",
        "role_id",
        "department_id",
        "designation",
        "phone",
        "email",
        "hire_date",
        "employment_status"
    ];

    const updates = [];
    const values = [];
    let index = 1;

    for (const field of allowedFields) {
        if (staffData[field] !== undefined) {
            if (field === "role_id") {
                const role = await pool.query(
                    "SELECT role_id FROM public.roles WHERE role_id = $1 AND is_active = TRUE",
                    [staffData[field]]
                );

                if (role.rows.length === 0) {
                    throw new Error("Role does not exist or is inactive");
                }
            }

            if (field === "department_id") {
                const department = await pool.query(
                    "SELECT department_id FROM public.departments WHERE department_id = $1 AND is_active = TRUE",
                    [staffData[field]]
                );

                if (department.rows.length === 0) {
                    throw new Error("Department does not exist or is inactive");
                }
            }

            updates.push(`${field} = $${index++}`);
            values.push(staffData[field]);
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    const result = await pool.query(
        `UPDATE public.staff
         SET ${updates.join(", ")}
         WHERE staff_id = $${index}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

const deactivateStaff = async (id) => {
    const result = await pool.query(
        `UPDATE public.staff
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE staff_id = $1
         RETURNING *`,
        [id]
    );

    return result.rows[0];
};

module.exports = {
    createStaff,
    getAllStaff,
    getStaffById,
    searchStaff,
    updateStaff,
    deactivateStaff
};
