const pool = require("../config/db");

const RESERVATION_DETAILS_QUERY = `
    SELECT
        br.reservation_id,
        br.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.patient_number,
        br.bed_id,
        b.bed_number,
        b.bed_type,
        br.reservation_start,
        br.reservation_end,
        br.reservation_status,
        br.reserved_by,
        br.reason,
        br.created_at,
        br.updated_at
    FROM public.bed_reservations br
    JOIN public.patients p ON p.patient_id = br.patient_id
    JOIN public.beds b ON b.bed_id = br.bed_id
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

const isValidDate = (value) => (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
);

const rollback = async (client) => {
    try {
        await client.query("ROLLBACK");
    } catch (error) {
        console.error("Bed reservation rollback error:", error);
    }
};

const getAllReservations = async (req, res) => {
    try {
        const result = await pool.query(
            `${RESERVATION_DETAILS_QUERY}
             ORDER BY br.reservation_start DESC, br.reservation_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get bed reservations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bed reservations"
        });
    }
};

const getReservationById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservation ID"
        });
    }

    try {
        const result = await pool.query(
            `${RESERVATION_DETAILS_QUERY} WHERE br.reservation_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bed reservation not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get bed reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bed reservation"
        });
    }
};

const createReservation = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const {
        patient_id,
        bed_id,
        reservation_start,
        reservation_end,
        reserved_by,
        reason
    } = req.body;

    if (!isPositiveId(patient_id)) {
        return res.status(400).json({
            success: false,
            message: "patient_id must be a positive integer"
        });
    }

    if (!isPositiveId(bed_id)) {
        return res.status(400).json({
            success: false,
            message: "bed_id must be a positive integer"
        });
    }

    if (!isValidDate(reservation_start)) {
        return res.status(400).json({
            success: false,
            message: "reservation_start is required and must be a valid date"
        });
    }

    if (reservation_end !== undefined && reservation_end !== null) {
        if (!isValidDate(reservation_end)) {
            return res.status(400).json({
                success: false,
                message: "reservation_end must be a valid date"
            });
        }

        if (Date.parse(reservation_end) <= Date.parse(reservation_start)) {
            return res.status(400).json({
                success: false,
                message: "reservation_end must be later than reservation_start"
            });
        }
    }

    if (reserved_by !== undefined && reserved_by !== null && !isPositiveId(reserved_by)) {
        return res.status(400).json({
            success: false,
            message: "reserved_by must be a positive integer"
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
            "SELECT patient_id FROM public.patients WHERE patient_id = $1",
            [String(patient_id)]
        );

        if (patientResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const bedResult = await client.query(
            `SELECT bed_id, is_active
             FROM public.beds
             WHERE bed_id = $1
             FOR UPDATE`,
            [String(bed_id)]
        );

        if (bedResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Bed not found"
            });
        }

        if (!bedResult.rows[0].is_active) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Cannot create a reservation for an inactive bed"
            });
        }

        if (reserved_by !== undefined && reserved_by !== null) {
            const staffResult = await client.query(
                "SELECT staff_id FROM public.staff WHERE staff_id = $1",
                [String(reserved_by)]
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

        const overlapResult = await client.query(
            `SELECT reservation_id
             FROM public.bed_reservations
             WHERE bed_id = $1
               AND reservation_status IN ('PENDING', 'CONFIRMED')
               AND reservation_start < COALESCE($3::timestamptz, 'infinity'::timestamptz)
               AND COALESCE(reservation_end, 'infinity'::timestamptz) > $2::timestamptz
             LIMIT 1`,
            [
                String(bed_id),
                reservation_start,
                reservation_end === undefined ? null : reservation_end
            ]
        );

        if (overlapResult.rows.length > 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Bed is already reserved for the selected time period"
            });
        }

        const insertedResult = await client.query(
            `INSERT INTO public.bed_reservations
                (patient_id, bed_id, reservation_start, reservation_end, reservation_status, reserved_by, reason)
             VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
             RETURNING reservation_id`,
            [
                String(patient_id),
                String(bed_id),
                reservation_start,
                reservation_end === undefined ? null : reservation_end,
                reserved_by === undefined ? null : String(reserved_by),
                reason === undefined ? null : reason
            ]
        );

        const reservationResult = await client.query(
            `${RESERVATION_DETAILS_QUERY} WHERE br.reservation_id = $1`,
            [insertedResult.rows[0].reservation_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Bed reservation created successfully",
            data: reservationResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Create bed reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create bed reservation"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const confirmReservation = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservation ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const reservationResult = await client.query(
            `SELECT reservation_id, bed_id, reservation_start, reservation_end, reservation_status
             FROM public.bed_reservations
             WHERE reservation_id = $1
             FOR UPDATE`,
            [id]
        );

        if (reservationResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Bed reservation not found"
            });
        }

        const reservation = reservationResult.rows[0];

        if (reservation.reservation_status !== "PENDING") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only pending reservations can be confirmed"
            });
        }

        const bedResult = await client.query(
            "SELECT bed_id FROM public.beds WHERE bed_id = $1 FOR UPDATE",
            [reservation.bed_id]
        );

        if (bedResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Bed not found"
            });
        }

        const overlapResult = await client.query(
            `SELECT reservation_id
             FROM public.bed_reservations
             WHERE bed_id = $1
               AND reservation_id <> $2
               AND reservation_status IN ('PENDING', 'CONFIRMED')
               AND reservation_start < COALESCE($4::timestamptz, 'infinity'::timestamptz)
               AND COALESCE(reservation_end, 'infinity'::timestamptz) > $3::timestamptz
             LIMIT 1`,
            [
                reservation.bed_id,
                id,
                reservation.reservation_start,
                reservation.reservation_end
            ]
        );

        if (overlapResult.rows.length > 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Bed is already reserved for the selected time period"
            });
        }

        await client.query(
            `UPDATE public.bed_reservations
             SET reservation_status = 'CONFIRMED',
                 updated_at = NOW()
             WHERE reservation_id = $1`,
            [id]
        );

        const updatedResult = await client.query(
            `${RESERVATION_DETAILS_QUERY} WHERE br.reservation_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "Bed reservation confirmed successfully",
            data: updatedResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Confirm bed reservation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to confirm bed reservation"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateReservationStatus = async (req, res, allowedStatuses, nextStatus, message) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservation ID"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE public.bed_reservations
             SET reservation_status = $1,
                 updated_at = NOW()
             WHERE reservation_id = $2
               AND reservation_status = ANY($3::varchar[])
             RETURNING reservation_id`,
            [nextStatus, id, allowedStatuses]
        );

        if (result.rows.length === 0) {
            const reservationResult = await pool.query(
                "SELECT reservation_id FROM public.bed_reservations WHERE reservation_id = $1",
                [id]
            );

            if (reservationResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Bed reservation not found"
                });
            }

            return res.status(409).json({
                success: false,
                message: `Reservation cannot be ${nextStatus.toLowerCase()} from its current status`
            });
        }

        const updatedResult = await pool.query(
            `${RESERVATION_DETAILS_QUERY} WHERE br.reservation_id = $1`,
            [id]
        );

        return res.status(200).json({
            success: true,
            message,
            data: updatedResult.rows[0]
        });
    } catch (error) {
        console.error(`${nextStatus} bed reservation error:`, error);

        return res.status(500).json({
            success: false,
            message: `Failed to ${nextStatus.toLowerCase()} bed reservation`
        });
    }
};

const cancelReservation = async (req, res) => updateReservationStatus(
    req,
    res,
    ["PENDING", "CONFIRMED"],
    "CANCELLED",
    "Bed reservation cancelled successfully"
);

const completeReservation = async (req, res) => updateReservationStatus(
    req,
    res,
    ["CONFIRMED"],
    "COMPLETED",
    "Bed reservation completed successfully"
);

const expireReservation = async (req, res) => updateReservationStatus(
    req,
    res,
    ["PENDING", "CONFIRMED"],
    "EXPIRED",
    "Bed reservation expired successfully"
);

module.exports = {
    getAllReservations,
    getReservationById,
    createReservation,
    confirmReservation,
    cancelReservation,
    completeReservation,
    expireReservation
};
