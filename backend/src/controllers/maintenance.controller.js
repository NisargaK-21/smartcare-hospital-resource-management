const pool = require("../config/db");

const MAINTENANCE_DETAILS_QUERY = `
    SELECT
        m.*,
        b.bed_number,
        b.bed_type,
        ir.resource_name,
        ir.resource_type
    FROM public.maintenance m
    LEFT JOIN public.beds b ON b.bed_id = m.bed_id
    LEFT JOIN public.icu_resources ir ON ir.icu_resource_id = m.icu_resource_id
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
        console.error("Maintenance rollback error:", error);
    }
};

const getAllMaintenance = async (req, res) => {
    try {
        const result = await pool.query(
            `${MAINTENANCE_DETAILS_QUERY}
             ORDER BY m.created_at DESC, m.maintenance_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get maintenance records error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch maintenance records"
        });
    }
};

const getMaintenanceById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid maintenance ID"
        });
    }

    try {
        const result = await pool.query(
            `${MAINTENANCE_DETAILS_QUERY}
             WHERE m.maintenance_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Maintenance record not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get maintenance record error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch maintenance record"
        });
    }
};

const createMaintenance = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const { bed_id, icu_resource_id, maintenance_reason, notes } = req.body;
    const hasBedId = bed_id !== undefined && bed_id !== null;
    const hasResourceId = icu_resource_id !== undefined && icu_resource_id !== null;

    if (typeof maintenance_reason !== "string" || maintenance_reason.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "maintenance_reason is required"
        });
    }

    if (hasBedId === hasResourceId) {
        return res.status(400).json({
            success: false,
            message: "Exactly one of bed_id or icu_resource_id must be provided"
        });
    }

    if (hasBedId && !isPositiveId(bed_id)) {
        return res.status(400).json({
            success: false,
            message: "bed_id must be a positive integer"
        });
    }

    if (hasResourceId && !isPositiveId(icu_resource_id)) {
        return res.status(400).json({
            success: false,
            message: "icu_resource_id must be a positive integer"
        });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
        return res.status(400).json({
            success: false,
            message: "notes must be a string"
        });
    }

    const targetColumn = hasBedId ? "bed_id" : "icu_resource_id";
    const targetId = String(hasBedId ? bed_id : icu_resource_id);
    const targetTable = hasBedId ? "beds" : "icu_resources";
    const targetLabel = hasBedId ? "Bed" : "ICU resource";

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const targetResult = await client.query(
            `SELECT ${targetColumn}, ${
                hasBedId ? "is_active, bed_status" : "resource_status"
            }
             FROM public.${targetTable}
             WHERE ${targetColumn} = $1
             FOR UPDATE`,
            [targetId]
        );

        if (targetResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: `${targetLabel} not found`
            });
        }

        const target = targetResult.rows[0];
        const isUsable = hasBedId
            ? target.is_active && target.bed_status !== "MAINTENANCE"
            : !["MAINTENANCE", "OUT_OF_SERVICE"].includes(target.resource_status);

        if (!isUsable) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: `${targetLabel} is not active or usable`
            });
        }

        const duplicateResult = await client.query(
            `SELECT maintenance_id
             FROM public.maintenance
             WHERE ${targetColumn} = $1
               AND maintenance_status IN ('PENDING', 'IN_PROGRESS')
             LIMIT 1`,
            [targetId]
        );

        if (duplicateResult.rows.length > 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: `An active maintenance record already exists for this ${hasBedId ? "bed" : "resource"}`
            });
        }

        const insertedResult = await client.query(
            `INSERT INTO public.maintenance
                (${targetColumn}, maintenance_reason, maintenance_status, notes)
             VALUES ($1, $2, 'PENDING', $3)
             RETURNING maintenance_id`,
            [
                targetId,
                maintenance_reason.trim(),
                notes === undefined ? null : notes
            ]
        );

        if (insertedResult.rowCount !== 1) {
            throw new Error("Maintenance record was not created");
        }

        const maintenanceResult = await client.query(
            `${MAINTENANCE_DETAILS_QUERY}
             WHERE m.maintenance_id = $1`,
            [insertedResult.rows[0].maintenance_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Maintenance record created successfully",
            data: maintenanceResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Create maintenance record error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create maintenance record"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateMaintenanceStatus = async (req, res, nextStatus) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid maintenance ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const maintenanceResult = await client.query(
            `SELECT maintenance_id, bed_id, icu_resource_id, maintenance_status
             FROM public.maintenance
             WHERE maintenance_id = $1
             FOR UPDATE`,
            [id]
        );

        if (maintenanceResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Maintenance record not found"
            });
        }

        const maintenance = maintenanceResult.rows[0];
        const allowedStatuses = {
            IN_PROGRESS: ["PENDING"],
            COMPLETED: ["IN_PROGRESS"],
            CANCELLED: ["PENDING", "IN_PROGRESS"]
        };

        if (!allowedStatuses[nextStatus].includes(maintenance.maintenance_status)) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: nextStatus === "IN_PROGRESS"
                    ? "Only pending maintenance can be started"
                    : nextStatus === "COMPLETED"
                        ? "Only in-progress maintenance can be completed"
                        : "Only pending or in-progress maintenance can be cancelled"
            });
        }

        const hasBedTarget = maintenance.bed_id !== null;
        const targetColumn = hasBedTarget ? "bed_id" : "icu_resource_id";
        const targetId = hasBedTarget
            ? maintenance.bed_id
            : maintenance.icu_resource_id;
        const targetTable = hasBedTarget ? "beds" : "icu_resources";
        const targetStatusColumn = hasBedTarget ? "bed_status" : "resource_status";
        const expectedStatus = nextStatus === "IN_PROGRESS" ? "AVAILABLE" : "MAINTENANCE";

        if (nextStatus !== "CANCELLED" || maintenance.maintenance_status === "IN_PROGRESS") {
            const targetResult = await client.query(
                `SELECT ${targetColumn}, ${targetStatusColumn}${
                    hasBedTarget ? ", is_active" : ""
                }
                 FROM public.${targetTable}
                 WHERE ${targetColumn} = $1
                 FOR UPDATE`,
                [targetId]
            );

            if (targetResult.rows.length === 0) {
                await rollback(client);
                transactionStarted = false;

                return res.status(404).json({
                    success: false,
                    message: `${hasBedTarget ? "Bed" : "ICU resource"} not found`
                });
            }

            const target = targetResult.rows[0];

            if (nextStatus === "IN_PROGRESS") {
                const targetCanStart = target[targetStatusColumn] === "AVAILABLE" &&
                    (!hasBedTarget || target.is_active);

                if (!targetCanStart) {
                    await rollback(client);
                    transactionStarted = false;

                    return res.status(409).json({
                        success: false,
                        message: `${hasBedTarget ? "Bed" : "ICU resource"} must be active and available to start maintenance`
                    });
                }

                const otherMaintenanceResult = await client.query(
                    `SELECT maintenance_id
                     FROM public.maintenance
                     WHERE ${targetColumn} = $1
                       AND maintenance_id <> $2
                       AND maintenance_status = 'IN_PROGRESS'
                     LIMIT 1`,
                    [targetId, id]
                );

                if (otherMaintenanceResult.rows.length > 0) {
                    await rollback(client);
                    transactionStarted = false;

                    return res.status(409).json({
                        success: false,
                        message: "Another maintenance record is already in progress for this target"
                    });
                }

            } else if (target[targetStatusColumn] !== expectedStatus) {
                await rollback(client);
                transactionStarted = false;

                return res.status(409).json({
                    success: false,
                    message: `The target must have ${expectedStatus} status to ${nextStatus.toLowerCase()} maintenance`
                });
            }

            if (nextStatus === "IN_PROGRESS" || nextStatus === "COMPLETED" ||
                (nextStatus === "CANCELLED" && maintenance.maintenance_status === "IN_PROGRESS")) {
                const targetNextStatus = nextStatus === "IN_PROGRESS" ? "MAINTENANCE" : "AVAILABLE";
                const targetUpdateResult = await client.query(
                    `UPDATE public.${targetTable}
                     SET ${targetStatusColumn} = $1,
                         updated_at = NOW()
                     WHERE ${targetColumn} = $2
                     RETURNING ${targetColumn}`,
                    [targetNextStatus, targetId]
                );

                if (targetUpdateResult.rowCount !== 1) {
                    throw new Error(`${hasBedTarget ? "Bed" : "ICU resource"} was not updated`);
                }
            }
        }

        const maintenanceUpdateResult = await client.query(
            `UPDATE public.maintenance
             SET maintenance_status = $1::VARCHAR(20),
                 maintenance_start = CASE
                     WHEN $1::VARCHAR(20) = 'IN_PROGRESS'::VARCHAR(20) THEN NOW()
                     ELSE maintenance_start
                 END,
                 maintenance_completed_at = CASE
                     WHEN $1::VARCHAR(20) = 'COMPLETED'::VARCHAR(20) THEN NOW()
                     ELSE maintenance_completed_at
                 END,
                 updated_at = NOW()
             WHERE maintenance_id = $2
             RETURNING maintenance_id`,
            [nextStatus, id]
        );

        if (maintenanceUpdateResult.rowCount !== 1) {
            throw new Error("Maintenance record was not updated");
        }

        const updatedResult = await client.query(
            `${MAINTENANCE_DETAILS_QUERY}
             WHERE m.maintenance_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: `Maintenance ${nextStatus.toLowerCase()} successfully`,
            data: updatedResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error(`Update maintenance error (${nextStatus}):`, {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            error
        });

        return res.status(500).json({
            success: false,
            message: `Failed to ${nextStatus.toLowerCase()} maintenance`,
            ...(process.env.NODE_ENV !== "production"
                ? {
                    details: error.message,
                    ...(error.code ? { code: error.code } : {}),
                    ...(error.detail ? { database_detail: error.detail } : {}),
                    ...(error.constraint ? { constraint: error.constraint } : {})
                }
                : {})
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const startMaintenance = (req, res) => (
    updateMaintenanceStatus(req, res, "IN_PROGRESS")
);

const completeMaintenance = (req, res) => (
    updateMaintenanceStatus(req, res, "COMPLETED")
);

const cancelMaintenance = (req, res) => (
    updateMaintenanceStatus(req, res, "CANCELLED")
);

module.exports = {
    getAllMaintenance,
    getMaintenanceById,
    createMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance
};
