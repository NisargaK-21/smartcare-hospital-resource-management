const pool = require("../config/db");

const DISCHARGE_DETAILS_QUERY = `
    SELECT
        d.discharge_id,
        d.admission_id,
        d.patient_id,
        CONCAT_WS(' ', p.first_name, p.last_name) AS patient_name,
        p.patient_number,
        d.bed_id,
        d.discharge_date,
        d.discharge_reason,
        d.discharge_status,
        d.discharged_by,
        d.notes,
        d.created_at,
        d.updated_at
    FROM public.discharges d
    LEFT JOIN public.patients p ON p.patient_id = d.patient_id
`;

const MAX_BIGINT = 9223372036854775807n;

const isPositiveId = (value) => {
    if (typeof value !== "string" && typeof value !== "number") {
        return false;
    }

    if (typeof value === "number" && !Number.isSafeInteger(value)) {
        return false;
    }

    const stringValue = String(value);

    if (!/^\d+$/.test(stringValue)) {
        return false;
    }

    const integerValue = BigInt(stringValue);
    return integerValue > 0n && integerValue <= MAX_BIGINT;
};

const rollback = async (client) => {
    try {
        await client.query("ROLLBACK");
    } catch (error) {
        console.error("Discharge rollback error:", error);
    }
};

const getAllDischarges = async (req, res) => {
    try {
        const result = await pool.query(
            `${DISCHARGE_DETAILS_QUERY}
             ORDER BY COALESCE(d.discharge_date, d.created_at) DESC,
                      d.discharge_id DESC`
        );

        return res.status(200).json({
            success: true,
            message: "Discharges retrieved successfully",
            data: result.rows
        });
    } catch (error) {
        console.error("Get discharges error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch discharges"
        });
    }
};

const getDischargeById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid discharge ID"
        });
    }

    try {
        const result = await pool.query(
            `${DISCHARGE_DETAILS_QUERY}
             WHERE d.discharge_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Discharge not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Discharge retrieved successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get discharge error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch discharge"
        });
    }
};

const createDischarge = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const {
        admission_id,
        discharge_reason,
        discharged_by,
        notes
    } = req.body;

    if (!isPositiveId(admission_id)) {
        return res.status(400).json({
            success: false,
            message: "admission_id must be a positive integer"
        });
    }

    if (typeof discharge_reason !== "string" || !discharge_reason.trim()) {
        return res.status(400).json({
            success: false,
            message: "discharge_reason is required"
        });
    }

    if (discharged_by !== undefined && discharged_by !== null &&
        !isPositiveId(discharged_by)) {
        return res.status(400).json({
            success: false,
            message: "discharged_by must be a positive integer when supplied"
        });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
        return res.status(400).json({
            success: false,
            message: "notes must be a string when supplied"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const admissionResult = await client.query(
            `SELECT admission_id, patient_id, bed_id, admission_status
             FROM public.admissions
             WHERE admission_id = $1
             FOR UPDATE`,
            [admission_id]
        );

        if (admissionResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission not found"
            });
        }

        const admission = admissionResult.rows[0];

        if (admission.admission_status !== "ACTIVE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only active admissions can be discharged"
            });
        }

        if (admission.bed_id === null) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Admission does not have an occupied bed"
            });
        }

        const bedResult = await client.query(
            `SELECT bed_id, bed_status
             FROM public.beds
             WHERE bed_id = $1
             FOR UPDATE`,
            [admission.bed_id]
        );

        if (bedResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission bed not found"
            });
        }

        if (bedResult.rows[0].bed_status !== "OCCUPIED") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Admission bed is not occupied"
            });
        }

        const patientResult = await client.query(
            "SELECT patient_id FROM public.patients WHERE patient_id = $1",
            [admission.patient_id]
        );

        if (patientResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission patient not found"
            });
        }

        if (discharged_by !== undefined && discharged_by !== null) {
            const staffResult = await client.query(
                "SELECT staff_id FROM public.staff WHERE staff_id = $1",
                [discharged_by]
            );

            if (staffResult.rows.length === 0) {
                await rollback(client);
                transactionStarted = false;

                return res.status(404).json({
                    success: false,
                    message: "Discharging staff member not found"
                });
            }
        }

        const pendingDischargeResult = await client.query(
            `SELECT discharge_id
             FROM public.discharges
             WHERE admission_id = $1
               AND discharge_status = 'PENDING'
             LIMIT 1`,
            [admission_id]
        );

        if (pendingDischargeResult.rows.length > 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "A pending discharge already exists for this admission"
            });
        }

        const insertResult = await client.query(
            `INSERT INTO public.discharges
                (admission_id, patient_id, bed_id, discharge_reason,
                 discharge_status, discharged_by, notes)
             VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
             RETURNING discharge_id`,
            [
                admission.admission_id,
                admission.patient_id,
                admission.bed_id,
                discharge_reason.trim(),
                discharged_by ?? null,
                notes ?? null
            ]
        );

        if (insertResult.rowCount !== 1) {
            throw new Error("Discharge record was not created");
        }

        const dischargeResult = await client.query(
            `${DISCHARGE_DETAILS_QUERY}
             WHERE d.discharge_id = $1`,
            [insertResult.rows[0].discharge_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Discharge created and is pending completion",
            data: dischargeResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
            transactionStarted = false;
        }

        console.error("Create discharge error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create discharge"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const completeDischarge = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid discharge ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const dischargeResult = await client.query(
            `SELECT discharge_id, admission_id, discharge_status
             FROM public.discharges
             WHERE discharge_id = $1
             FOR UPDATE`,
            [id]
        );

        if (dischargeResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Discharge not found"
            });
        }

        const discharge = dischargeResult.rows[0];

        if (discharge.discharge_status !== "PENDING") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only pending discharges can be completed"
            });
        }

        const admissionResult = await client.query(
            `SELECT admission_id, bed_id, admission_status
             FROM public.admissions
             WHERE admission_id = $1
             FOR UPDATE`,
            [discharge.admission_id]
        );

        if (admissionResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission not found"
            });
        }

        const admission = admissionResult.rows[0];

        if (admission.admission_status !== "ACTIVE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only active admissions can be discharged"
            });
        }

        if (admission.bed_id === null) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Admission does not have a bed"
            });
        }

        const bedResult = await client.query(
            `SELECT bed_id, bed_status
             FROM public.beds
             WHERE bed_id = $1
             FOR UPDATE`,
            [admission.bed_id]
        );

        if (bedResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Admission bed not found"
            });
        }

        if (bedResult.rows[0].bed_status !== "OCCUPIED") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Admission bed is not occupied"
            });
        }

        const admissionUpdate = await client.query(
            `UPDATE public.admissions
             SET admission_status = 'DISCHARGED',
                 updated_at = NOW()
             WHERE admission_id = $1
               AND admission_status = 'ACTIVE'
             RETURNING admission_id`,
            [admission.admission_id]
        );

        if (admissionUpdate.rowCount !== 1) {
            throw new Error("Admission was not updated");
        }

        let bedUpdate;

        try {
            bedUpdate = await client.query(
                `UPDATE public.beds
                 SET bed_status = 'CLEANING',
                     updated_at = NOW()
                 WHERE bed_id = $1
                   AND bed_status = 'OCCUPIED'
                 RETURNING bed_id`,
                [admission.bed_id]
            );
        } catch (error) {
            if (error.code === "23514") {
                error.dischargeBedCleaningUnsupported = true;
            }

            throw error;
        }

        if (bedUpdate.rowCount !== 1) {
            throw new Error("Occupied bed was not updated");
        }

        const completedDischargeUpdate = await client.query(
            `UPDATE public.discharges
             SET bed_id = $2,
                 discharge_status = 'COMPLETED',
                 discharge_date = NOW(),
                 updated_at = NOW()
             WHERE discharge_id = $1
               AND discharge_status = 'PENDING'
             RETURNING discharge_id`,
            [discharge.discharge_id, admission.bed_id]
        );

        if (completedDischargeUpdate.rowCount !== 1) {
            throw new Error("Discharge was not completed");
        }

        const completedResult = await client.query(
            `${DISCHARGE_DETAILS_QUERY}
             WHERE d.discharge_id = $1`,
            [discharge.discharge_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Discharge completed; bed moved to cleaning",
            data: completedResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
            transactionStarted = false;
        }

        if (error.dischargeBedCleaningUnsupported) {
            return res.status(409).json({
                success: false,
                message: "Bed schema does not support CLEANING; discharge was rolled back"
            });
        }

        console.error("Complete discharge error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to complete discharge"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const cancelDischarge = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid discharge ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const dischargeResult = await client.query(
            `SELECT discharge_id, discharge_status
             FROM public.discharges
             WHERE discharge_id = $1
             FOR UPDATE`,
            [id]
        );

        if (dischargeResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Discharge not found"
            });
        }

        if (dischargeResult.rows[0].discharge_status !== "PENDING") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only pending discharges can be cancelled"
            });
        }

        const cancellationResult = await client.query(
            `UPDATE public.discharges
             SET discharge_status = 'CANCELLED',
                 updated_at = NOW()
             WHERE discharge_id = $1
               AND discharge_status = 'PENDING'
             RETURNING discharge_id`,
            [id]
        );

        if (cancellationResult.rowCount !== 1) {
            throw new Error("Discharge was not cancelled");
        }

        const cancelledResult = await client.query(
            `${DISCHARGE_DETAILS_QUERY}
             WHERE d.discharge_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Discharge cancelled",
            data: cancelledResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
            transactionStarted = false;
        }

        console.error("Cancel discharge error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel discharge"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    getAllDischarges,
    getDischargeById,
    createDischarge,
    completeDischarge,
    cancelDischarge
};
