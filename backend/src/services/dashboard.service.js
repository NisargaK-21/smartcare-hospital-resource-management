const pool = require("../config/db");

// 1. Overall hospital statistics
const getOverallStats = async () => {
    const query = `
        SELECT
            COUNT(b.bed_id)                                                        AS total_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'AVAILABLE')             AS available_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')              AS occupied_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'RESERVED')              AS reserved_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'MAINTENANCE')           AS maintenance_beds,
            (SELECT COUNT(*) FROM patients  WHERE is_active = TRUE)               AS total_patients,
            (SELECT COUNT(*) FROM staff     WHERE is_active = TRUE
                                              AND employment_status = 'ACTIVE')   AS total_staff,
            (SELECT COUNT(*) FROM departments WHERE is_active = TRUE)             AS total_departments,
            (SELECT COUNT(*) FROM wards       WHERE is_active = TRUE)             AS total_wards,
            ROUND(
                (COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')::NUMERIC
                    / NULLIF(COUNT(b.bed_id), 0)) * 100,
            2)                                                                     AS occupancy_rate
        FROM beds b
        WHERE b.is_active = TRUE
    `;

    const result = await pool.query(query);
    return result.rows[0];
};

// 2. Ward-level occupancy
const getWardOccupancy = async () => {
    const query = `
        SELECT
            w.ward_id,
            w.ward_name,
            w.ward_type,
            d.department_name,
            COUNT(b.bed_id)                                               AS total_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'AVAILABLE')    AS available_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')     AS occupied_beds,
            ROUND(
                (COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')::NUMERIC
                    / NULLIF(COUNT(b.bed_id), 0)) * 100,
            2)                                                             AS occupancy_rate
        FROM wards w
        JOIN departments d ON d.department_id = w.department_id
        LEFT JOIN rooms r  ON r.ward_id  = w.ward_id  AND r.is_active = TRUE
        LEFT JOIN beds  b  ON b.room_id  = r.room_id  AND b.is_active = TRUE
        WHERE w.is_active = TRUE
        GROUP BY w.ward_id, w.ward_name, w.ward_type, d.department_name
        ORDER BY d.department_name, w.ward_name
    `;

    const result = await pool.query(query);
    return result.rows;
};

// 3. Department-level statistics
const getDepartmentStats = async () => {
    const query = `
        SELECT
            d.department_id,
            d.department_name,
            d.department_code,
            COUNT(DISTINCT w.ward_id)                                             AS total_wards,
            COUNT(b.bed_id)                                                        AS total_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'AVAILABLE')            AS available_beds,
            COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')             AS occupied_beds,
            (
                SELECT COUNT(*)
                FROM staff s
                WHERE s.department_id    = d.department_id
                  AND s.is_active        = TRUE
                  AND s.employment_status = 'ACTIVE'
            )                                                                      AS active_staff,
            ROUND(
                (COUNT(b.bed_id) FILTER (WHERE b.bed_status = 'OCCUPIED')::NUMERIC
                    / NULLIF(COUNT(b.bed_id), 0)) * 100,
            2)                                                                     AS occupancy_rate
        FROM departments d
        LEFT JOIN wards w  ON w.department_id = d.department_id AND w.is_active = TRUE
        LEFT JOIN rooms r  ON r.ward_id        = w.ward_id       AND r.is_active = TRUE
        LEFT JOIN beds  b  ON b.room_id        = r.room_id       AND b.is_active = TRUE
        WHERE d.is_active = TRUE
        GROUP BY d.department_id, d.department_name, d.department_code
        ORDER BY d.department_name
    `;

    const result = await pool.query(query);
    return result.rows;
};

// 4. Bed status breakdown
const getBedStatusBreakdown = async () => {
    const query = `
        SELECT
            bed_status,
            COUNT(*) AS count
        FROM beds
        WHERE is_active = TRUE
        GROUP BY bed_status
        ORDER BY count DESC
    `;

    const result = await pool.query(query);
    return result.rows;
};

// 5. Recent patients
const getRecentPatients = async (limit = 10) => {
    const query = `
        SELECT
            patient_id,
            patient_number,
            first_name,
            last_name,
            gender,
            blood_group,
            created_at
        FROM patients
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
};

// 6. Staff summary by employment status
const getStaffSummary = async () => {
    const query = `
        SELECT
            COUNT(*) FILTER (WHERE employment_status = 'ACTIVE')     AS total_active,
            COUNT(*) FILTER (WHERE employment_status = 'ON_LEAVE')   AS total_on_leave,
            COUNT(*) FILTER (WHERE employment_status = 'INACTIVE')   AS total_inactive,
            COUNT(*) FILTER (WHERE employment_status = 'TERMINATED') AS total_terminated,
            COUNT(*)                                                   AS total_all
        FROM staff
        WHERE is_active = TRUE
    `;

    const result = await pool.query(query);
    return result.rows[0];
};

module.exports = {
    getOverallStats,
    getWardOccupancy,
    getDepartmentStats,
    getBedStatusBreakdown,
    getRecentPatients,
    getStaffSummary,
};
