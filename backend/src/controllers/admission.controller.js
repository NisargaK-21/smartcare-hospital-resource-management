const pool = require("../config/db");

const VALID_BED_TYPES = ["GENERAL", "ICU", "EMERGENCY", "PRIVATE"];
const VALID_ADMISSION_TYPES = ["PLANNED", "EMERGENCY", "TRANSFER"];

const ADMISSION_DETAILS_QUERY = `
    SELECT
        a.*,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.patient_number AS medical_record_number,
        b.bed_number,
        b.bed_type,
        b.bed_status
    FROM public.admissions a
    JOIN public.patients p ON p.patient_id = a.patient_id
    LEFT JOIN public.beds b ON b.bed_id = a.bed_id
`;

const isPositiveId = (value) => {
    if (typeof value !== "string" && typeof value !== "number") {
        return false;
    }

    if (typeof value === "number" && !Number.isSafeInteger(value)) {
        return false;
    }

    const stringValue = String(value);

    return /^\d+$/.test(stringValue) && BigInt(stringValue) > 0n;
};

const getAllAdmissions = async (req, res) => {
    try {
        const result = await pool.query(
            `${ADMISSION_DETAILS_QUERY} ORDER BY a.admission_date DESC, a.admission_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get admissions error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch admissions"
        });
    }
};

const getAdmissionById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid admission ID"
        });
    }

    try {
        const result = await pool.query(
            `${ADMISSION_DETAILS_QUERY} WHERE a.admission_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admission not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get admission error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch admission"
        });
    }
};

const createAdmission = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const {
        patient_id,
        required_bed_type,
        admission_type,
        reason,
        admitted_by
    } = req.body;

    const missingFields = [];

    if (!isPositiveId(patient_id)) {
        missingFields.push("patient_id");
    }
    if (!required_bed_type) {
        missingFields.push("required_bed_type");
    }
    if (!admission_type) {
        missingFields.push("admission_type");
    }

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Required fields missing or invalid: ${missingFields.join(", ")}`
        });
    }

    if (!VALID_BED_TYPES.includes(required_bed_type)) {
        return res.status(400).json({
            success: false,
            message: `required_bed_type must be one of: ${VALID_BED_TYPES.join(", ")}`
        });
    }

    if (!VALID_ADMISSION_TYPES.includes(admission_type)) {
        return res.status(400).json({
            success: false,
            message: `admission_type must be one of: ${VALID_ADMISSION_TYPES.join(", ")}`
        });
    }

    if (admitted_by !== undefined && admitted_by !== null && !isPositiveId(admitted_by)) {
        return res.status(400).json({
            success: false,
            message: "Invalid admitted_by"
        });
    }

    if (reason !== undefined && reason !== null && typeof reason !== "string") {
        return res.status(400).json({
            success: false,
            message: "reason must be a string"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const patientResult = await client.query(
            "SELECT patient_id FROM public.patients WHERE patient_id = $1 FOR UPDATE",
            [String(patient_id)]
        );

        if (patientResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const conflictingAdmission = await client.query(
            `SELECT admission_id
             FROM public.admissions
             WHERE patient_id = $1
               AND admission_status IN ('PENDING', 'ACTIVE')
             LIMIT 1`,
            [String(patient_id)]
        );

        if (conflictingAdmission.rows.length > 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Patient already has a pending or active admission"
            });
        }

        const insertedAdmission = await client.query(
            `INSERT INTO public.admissions
                (patient_id, required_bed_type, admission_type, admission_status, reason, admitted_by)
             VALUES ($1, $2, $3, 'PENDING', $4, $5)
             RETURNING admission_id`,
            [
                String(patient_id),
                required_bed_type,
                admission_type,
                reason === undefined ? null : reason,
                admitted_by === undefined ? null : admitted_by
            ]
        );

        const admissionResult = await client.query(
            `${ADMISSION_DETAILS_QUERY} WHERE a.admission_id = $1`,
            [insertedAdmission.rows[0].admission_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Admission created successfully",
            data: admissionResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Create admission rollback error:", rollbackError);
            }
        }

        if (error.code === "23503" && admitted_by !== undefined && admitted_by !== null) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        console.error("Create admission error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create admission"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const allocateBed = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid admission ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const admissionResult = await client.query(
            `SELECT admission_id, required_bed_type, admission_status
             FROM public.admissions
             WHERE admission_id = $1
             FOR UPDATE`,
            [id]
        );

        if (admissionResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission not found"
            });
        }

        const admission = admissionResult.rows[0];

        if (admission.admission_status !== "PENDING") {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only pending admissions can be allocated a bed"
            });
        }

        const bedResult = await client.query(
            `SELECT b.*
             FROM public.beds b
             WHERE b.bed_type = $1
               AND b.bed_status = 'AVAILABLE'
               AND b.is_active = TRUE
               AND NOT EXISTS (
                   SELECT 1
                   FROM public.admissions active_admission
                   WHERE active_admission.bed_id = b.bed_id
                     AND active_admission.admission_status = 'ACTIVE'
               )
             ORDER BY b.bed_id
             LIMIT 1
             FOR UPDATE OF b SKIP LOCKED`,
            [admission.required_bed_type]
        );

        if (bedResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: `No available active bed found for type ${admission.required_bed_type}`
            });
        }

        const bed = bedResult.rows[0];
        const updatedAdmissionResult = await client.query(
            `UPDATE public.admissions
             SET bed_id = $1,
                 admission_status = 'ACTIVE',
                 updated_at = NOW()
             WHERE admission_id = $2
             RETURNING *`,
            [bed.bed_id, id]
        );

        if (updatedAdmissionResult.rowCount !== 1) {
            throw new Error("Admission was not updated during bed allocation");
        }

        const updatedBedResult = await client.query(
            `UPDATE public.beds
             SET bed_status = 'OCCUPIED',
                 updated_at = NOW()
             WHERE bed_id = $1
             RETURNING *`,
            [bed.bed_id]
        );

        if (updatedBedResult.rowCount !== 1) {
            throw new Error("Bed was not updated during bed allocation");
        }

        const updatedAdmissionDetails = await client.query(
            `${ADMISSION_DETAILS_QUERY} WHERE a.admission_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Bed allocated successfully",
            data: {
                admission: updatedAdmissionDetails.rows[0] || updatedAdmissionResult.rows[0],
                bed: updatedBedResult.rows[0]
            }
        });
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Allocate bed rollback error:", rollbackError);
            }
        }

        console.error("Allocate bed error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to allocate bed"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const cancelAdmission = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid admission ID"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE public.admissions
             SET admission_status = 'CANCELLED',
                 updated_at = NOW()
             WHERE admission_id = $1
               AND admission_status = 'PENDING'
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            const admissionResult = await pool.query(
                "SELECT admission_status FROM public.admissions WHERE admission_id = $1",
                [id]
            );

            if (admissionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Admission not found"
                });
            }

            return res.status(409).json({
                success: false,
                message: "Only pending admissions can be cancelled"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Admission cancelled successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Cancel admission error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel admission"
        });
    }
};

module.exports = {
    getAllAdmissions,
    getAdmissionById,
    createAdmission,
    allocateBed,
    cancelAdmission
};
