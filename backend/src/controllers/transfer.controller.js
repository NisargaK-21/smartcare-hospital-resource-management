const pool = require("../config/db");

const TRANSFER_DETAILS_QUERY = `
    SELECT
        t.transfer_id,
        t.admission_id,
        t.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.patient_number,
        t.from_bed_id,
        from_bed.bed_number AS from_bed_number,
        from_bed.bed_type AS from_bed_type,
        t.to_bed_id,
        to_bed.bed_number AS to_bed_number,
        to_bed.bed_type AS to_bed_type,
        t.transfer_date,
        t.transfer_reason,
        t.transfer_status,
        t.transferred_by,
        t.created_at,
        t.updated_at
    FROM public.transfers t
    JOIN public.patients p ON p.patient_id = t.patient_id
    LEFT JOIN public.beds from_bed ON from_bed.bed_id = t.from_bed_id
    JOIN public.beds to_bed ON to_bed.bed_id = t.to_bed_id
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

const rollback = async (client) => {
    try {
        await client.query("ROLLBACK");
    } catch (error) {
        console.error("Transfer rollback error:", error);
    }
};

const getAllTransfers = async (req, res) => {
    try {
        const result = await pool.query(
            `${TRANSFER_DETAILS_QUERY}
             ORDER BY t.transfer_date DESC, t.transfer_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get transfers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch transfers"
        });
    }
};

const getTransferById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid transfer ID"
        });
    }

    try {
        const result = await pool.query(
            `${TRANSFER_DETAILS_QUERY} WHERE t.transfer_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Transfer not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch transfer"
        });
    }
};

const createTransfer = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const {
        admission_id,
        to_bed_id,
        transfer_reason,
        transferred_by
    } = req.body;

    if (!isPositiveId(admission_id)) {
        return res.status(400).json({
            success: false,
            message: "admission_id must be a positive integer"
        });
    }

    if (!isPositiveId(to_bed_id)) {
        return res.status(400).json({
            success: false,
            message: "to_bed_id must be a positive integer"
        });
    }

    if (typeof transfer_reason !== "string" || !transfer_reason.trim()) {
        return res.status(400).json({
            success: false,
            message: "transfer_reason is required"
        });
    }

    if (transferred_by !== undefined && transferred_by !== null && !isPositiveId(transferred_by)) {
        return res.status(400).json({
            success: false,
            message: "transferred_by must be a positive integer"
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
            [String(admission_id)]
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
                message: "Only active admissions can be transferred"
            });
        }

        if (admission.bed_id === null) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Admission has no current bed to transfer from"
            });
        }

        if (String(admission.bed_id) === String(to_bed_id)) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Destination bed must differ from the current bed"
            });
        }

        const bedResult = await client.query(
            `SELECT bed_id, bed_status, is_active
             FROM public.beds
             WHERE bed_id = ANY($1::bigint[])
             ORDER BY bed_id
             FOR UPDATE`,
            [[String(admission.bed_id), String(to_bed_id)]]
        );

        const bedsById = new Map(
            bedResult.rows.map((bed) => [String(bed.bed_id), bed])
        );
        const currentBed = bedsById.get(String(admission.bed_id));
        const destinationBed = bedsById.get(String(to_bed_id));

        if (!currentBed) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Current bed not found"
            });
        }

        if (!destinationBed) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Destination bed not found"
            });
        }

        if (!destinationBed.is_active || destinationBed.bed_status !== "AVAILABLE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Destination bed is inactive or unavailable"
            });
        }

        if (transferred_by !== undefined && transferred_by !== null) {
            const staffResult = await client.query(
                "SELECT staff_id FROM public.staff WHERE staff_id = $1",
                [String(transferred_by)]
            );

            if (staffResult.rows.length === 0) {
                await rollback(client);
                transactionStarted = false;

                return res.status(404).json({
                    success: false,
                    message: "Staff member not found"
                });
            }
        }

        const insertedResult = await client.query(
            `INSERT INTO public.transfers
                (admission_id, patient_id, from_bed_id, to_bed_id, transfer_reason, transfer_status, transferred_by)
             VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
             RETURNING transfer_id`,
            [
                String(admission.admission_id),
                String(admission.patient_id),
                String(admission.bed_id),
                String(to_bed_id),
                transfer_reason.trim(),
                transferred_by === undefined || transferred_by === null
                    ? null
                    : String(transferred_by)
            ]
        );

        const transferResult = await client.query(
            `${TRANSFER_DETAILS_QUERY} WHERE t.transfer_id = $1`,
            [insertedResult.rows[0].transfer_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Transfer created successfully",
            data: transferResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Create transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create transfer"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const completeTransfer = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid transfer ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const transferResult = await client.query(
            `SELECT transfer_id, admission_id, from_bed_id, to_bed_id, transfer_status
             FROM public.transfers
             WHERE transfer_id = $1
             FOR UPDATE`,
            [id]
        );

        if (transferResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Transfer not found"
            });
        }

        const transfer = transferResult.rows[0];

        if (transfer.transfer_status !== "PENDING") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only pending transfers can be completed"
            });
        }

        const admissionResult = await client.query(
            `SELECT admission_id, bed_id, admission_status
             FROM public.admissions
             WHERE admission_id = $1
             FOR UPDATE`,
            [transfer.admission_id]
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
                message: "Only active admissions can be transferred"
            });
        }

        if (
            transfer.from_bed_id === null ||
            String(admission.bed_id) !== String(transfer.from_bed_id)
        ) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Transfer no longer matches the admission's current bed"
            });
        }

        const bedResult = await client.query(
            `SELECT bed_id, bed_status, is_active
             FROM public.beds
             WHERE bed_id = ANY($1::bigint[])
             ORDER BY bed_id
             FOR UPDATE`,
            [[String(transfer.from_bed_id), String(transfer.to_bed_id)]]
        );

        const bedsById = new Map(
            bedResult.rows.map((bed) => [String(bed.bed_id), bed])
        );
        const currentBed = bedsById.get(String(transfer.from_bed_id));
        const destinationBed = bedsById.get(String(transfer.to_bed_id));

        if (!currentBed) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Current bed not found"
            });
        }

        if (!destinationBed) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Destination bed not found"
            });
        }

        if (!destinationBed.is_active || destinationBed.bed_status !== "AVAILABLE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Destination bed is inactive or unavailable"
            });
        }

        if (currentBed.bed_status !== "OCCUPIED") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Current bed is not occupied"
            });
        }

        const currentBedUpdate = await client.query(
            `UPDATE public.beds
             SET bed_status = 'AVAILABLE',
                 updated_at = NOW()
             WHERE bed_id = $1
             RETURNING bed_id`,
            [transfer.from_bed_id]
        );

        if (currentBedUpdate.rowCount !== 1) {
            throw new Error("Current bed was not updated");
        }

        const destinationBedUpdate = await client.query(
            `UPDATE public.beds
             SET bed_status = 'OCCUPIED',
                 updated_at = NOW()
             WHERE bed_id = $1
             RETURNING bed_id`,
            [transfer.to_bed_id]
        );

        if (destinationBedUpdate.rowCount !== 1) {
            throw new Error("Destination bed was not updated");
        }

        const admissionUpdate = await client.query(
            `UPDATE public.admissions
             SET bed_id = $1,
                 updated_at = NOW()
             WHERE admission_id = $2
             RETURNING admission_id`,
            [transfer.to_bed_id, transfer.admission_id]
        );

        if (admissionUpdate.rowCount !== 1) {
            throw new Error("Admission was not updated");
        }

        const completedTransferUpdate = await client.query(
            `UPDATE public.transfers
             SET transfer_status = 'COMPLETED',
                 transfer_date = NOW(),
                 updated_at = NOW()
             WHERE transfer_id = $1
             RETURNING transfer_id`,
            [id]
        );

        if (completedTransferUpdate.rowCount !== 1) {
            throw new Error("Transfer was not updated");
        }

        const completedTransfer = await client.query(
            `${TRANSFER_DETAILS_QUERY} WHERE t.transfer_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Transfer completed successfully",
            data: completedTransfer.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Complete transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to complete transfer"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const cancelTransfer = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid transfer ID"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE public.transfers
             SET transfer_status = 'CANCELLED',
                 updated_at = NOW()
             WHERE transfer_id = $1
               AND transfer_status = 'PENDING'
             RETURNING transfer_id`,
            [id]
        );

        if (result.rows.length === 0) {
            const transferResult = await pool.query(
                "SELECT transfer_id FROM public.transfers WHERE transfer_id = $1",
                [id]
            );

            if (transferResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Transfer not found"
                });
            }

            return res.status(409).json({
                success: false,
                message: "Only pending transfers can be cancelled"
            });
        }

        const updatedTransfer = await pool.query(
            `${TRANSFER_DETAILS_QUERY} WHERE t.transfer_id = $1`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Transfer cancelled successfully",
            data: updatedTransfer.rows[0]
        });
    } catch (error) {
        console.error("Cancel transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel transfer"
        });
    }
};

module.exports = {
    getAllTransfers,
    getTransferById,
    createTransfer,
    completeTransfer,
    cancelTransfer
};
