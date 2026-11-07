const pool = require("../config/db");

// Register a new patient
const createPatient = async (patientData) => {
    const {
        patient_number,
        first_name,
        last_name,
        date_of_birth,
        gender,
        blood_group,
        phone,
        email,
        address,
        emergency_contact_name,
        emergency_contact_phone
    } = patientData;

    const result = await pool.query(
        `INSERT INTO public.patients (
            patient_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            blood_group,
            phone,
            email,
            address,
            emergency_contact_name,
            emergency_contact_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
            patient_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            blood_group || null,
            phone,
            email || null,
            address || null,
            emergency_contact_name || null,
            emergency_contact_phone || null
        ]
    );

    return result.rows[0];
};

// Get all patients
const getAllPatients = async (filters = {}) => {
    let query = `
        SELECT *
        FROM public.patients
        WHERE 1 = 1
    `;

    const values = [];

    if (filters.is_active !== undefined) {
        values.push(filters.is_active === "true");
        query += ` AND is_active = $${values.length}`;
    }

    if (filters.gender) {
        values.push(filters.gender);
        query += ` AND gender = $${values.length}`;
    }

    if (filters.blood_group) {
        values.push(filters.blood_group);
        query += ` AND blood_group = $${values.length}`;
    }

    query += ` ORDER BY patient_id ASC`;

    const result = await pool.query(query, values);

    return result.rows;
};

// Get patient by ID
const getPatientById = async (patientId) => {
    const result = await pool.query(
        `SELECT *
         FROM public.patients
         WHERE patient_id = $1`,
        [patientId]
    );

    return result.rows[0];
};

// Search patients by name or patient number
const searchPatients = async (searchTerm) => {
    const result = await pool.query(
        `SELECT *
         FROM public.patients
         WHERE
            patient_number ILIKE $1
            OR first_name ILIKE $1
            OR last_name ILIKE $1
            OR CONCAT(first_name, ' ', last_name) ILIKE $1
         ORDER BY patient_id ASC`,
        [`%${searchTerm}%`]
    );

    return result.rows;
};

// Update patient
const updatePatient = async (patientId, patientData) => {
    const allowedFields = [
        "first_name",
        "last_name",
        "date_of_birth",
        "gender",
        "blood_group",
        "phone",
        "email",
        "address",
        "emergency_contact_name",
        "emergency_contact_phone"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
        if (patientData[field] !== undefined) {
            values.push(patientData[field]);
            updates.push(`${field} = $${values.length}`);
        }
    }

    if (updates.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    values.push(patientId);

    const result = await pool.query(
        `UPDATE public.patients
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE patient_id = $${values.length}
         RETURNING *`,
        values
    );

    return result.rows[0];
};

// Soft-delete patient
const deactivatePatient = async (patientId) => {
    const result = await pool.query(
        `UPDATE public.patients
         SET is_active = FALSE,
             updated_at = NOW()
         WHERE patient_id = $1
         RETURNING *`,
        [patientId]
    );

    return result.rows[0];
};

module.exports = {
    createPatient,
    getAllPatients,
    getPatientById,
    searchPatients,
    updatePatient,
    deactivatePatient
};