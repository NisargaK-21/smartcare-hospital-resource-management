const pool = require("../config/db");

const ICU_RESOURCE_DETAILS_QUERY = `
    SELECT
        ir.*,
        b.bed_number,
        b.bed_type,
        b.bed_status,
        b.is_active
    FROM public.icu_resources ir
    JOIN public.beds b ON b.bed_id = ir.bed_id
`;

const RESOURCE_TYPES = [
    "VENTILATOR",
    "CARDIAC_MONITOR",
    "INFUSION_PUMP",
    "PATIENT_MONITOR",
    "OXYGEN_SUPPLY",
    "OTHER"
];

const RESOURCE_STATUSES = [
    "AVAILABLE",
    "IN_USE",
    "MAINTENANCE",
    "OUT_OF_SERVICE"
];

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
        console.error("ICU resource rollback error:", error);
    }
};

const getAllIcuResources = async (req, res) => {
    try {
        const result = await pool.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             ORDER BY ir.created_at DESC, ir.icu_resource_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get ICU resources error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch ICU resources"
        });
    }
};

const getIcuResourceById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ICU resource ID"
        });
    }

    try {
        const result = await pool.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get ICU resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch ICU resource"
        });
    }
};

const isValidResourceName = (value) => (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 100
);

const validateOptionalResourceFields = (body) => {
    if (
        body.resource_type !== undefined &&
        !RESOURCE_TYPES.includes(body.resource_type)
    ) {
        return "resource_type must be one of the allowed ICU resource types";
    }

    if (
        body.resource_name !== undefined &&
        !isValidResourceName(body.resource_name)
    ) {
        return "resource_name must be a non-empty string of at most 100 characters";
    }

    if (
        body.resource_status !== undefined &&
        !RESOURCE_STATUSES.includes(body.resource_status)
    ) {
        return "resource_status must be one of the allowed ICU resource statuses";
    }

    if (
        body.quantity !== undefined &&
        (!Number.isInteger(body.quantity) || body.quantity <= 0)
    ) {
        return "quantity must be a positive integer";
    }

    if (
        body.unit !== undefined &&
        (typeof body.unit !== "string" ||
            body.unit.trim().length === 0 ||
            body.unit.trim().length > 20)
    ) {
        return "unit must be a non-empty string of at most 20 characters";
    }

    if (
        body.last_checked_at !== undefined &&
        body.last_checked_at !== null &&
        (typeof body.last_checked_at !== "string" ||
            Number.isNaN(Date.parse(body.last_checked_at)))
    ) {
        return "last_checked_at must be a valid date or null";
    }

    if (
        body.notes !== undefined &&
        body.notes !== null &&
        typeof body.notes !== "string"
    ) {
        return "notes must be a string or null";
    }

    return null;
};

const validateBedId = (bedId) => (
    isPositiveId(bedId) ? null : "bed_id must be a positive integer"
);

const getActiveBed = async (client, bedId) => (
    client.query(
        `SELECT bed_id, is_active
         FROM public.beds
         WHERE bed_id = $1
         FOR SHARE`,
        [String(bedId)]
    )
);

const createIcuResource = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const {
        bed_id,
        resource_type,
        resource_name,
        resource_status,
        quantity,
        unit,
        last_checked_at,
        notes
    } = req.body;

    if (bed_id === undefined || bed_id === null) {
        return res.status(400).json({
            success: false,
            message: "bed_id is required"
        });
    }

    const bedIdError = validateBedId(bed_id);

    if (bedIdError) {
        return res.status(400).json({
            success: false,
            message: bedIdError
        });
    }

    if (resource_type === undefined || resource_type === null || resource_type === "") {
        return res.status(400).json({
            success: false,
            message: "resource_type is required"
        });
    }

    if (resource_name === undefined || resource_name === null || resource_name === "") {
        return res.status(400).json({
            success: false,
            message: "resource_name is required"
        });
    }

    const validationError = validateOptionalResourceFields(req.body);

    if (validationError) {
        return res.status(400).json({
            success: false,
            message: validationError
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const bedResult = await getActiveBed(client, bed_id);

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
                message: "ICU resources can only be assigned to an active bed"
            });
        }

        const insertResult = await client.query(
            `INSERT INTO public.icu_resources
                (bed_id, resource_type, resource_name, resource_status,
                 quantity, unit, last_checked_at, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING icu_resource_id`,
            [
                String(bed_id),
                resource_type,
                resource_name.trim(),
                resource_status === undefined ? "AVAILABLE" : resource_status,
                quantity === undefined ? 1 : quantity,
                unit === undefined ? "UNIT" : unit.trim(),
                last_checked_at === undefined ? null : last_checked_at,
                notes === undefined ? null : notes
            ]
        );

        const resourceResult = await client.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [insertResult.rows[0].icu_resource_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "ICU resource created successfully",
            data: resourceResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Create ICU resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create ICU resource"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateIcuResource = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ICU resource ID"
        });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const allowedFields = [
        "bed_id",
        "resource_type",
        "resource_name",
        "resource_status",
        "quantity",
        "unit",
        "last_checked_at",
        "notes"
    ];
    const suppliedFields = allowedFields.filter(
        (field) => Object.prototype.hasOwnProperty.call(req.body, field)
    );

    if (suppliedFields.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one supported field must be provided"
        });
    }

    const unsupportedFields = Object.keys(req.body).filter(
        (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Unsupported field: ${unsupportedFields[0]}`
        });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "bed_id")) {
        const bedIdError = validateBedId(req.body.bed_id);

        if (bedIdError) {
            return res.status(400).json({
                success: false,
                message: bedIdError
            });
        }
    }

    const validationError = validateOptionalResourceFields(req.body);

    if (validationError) {
        return res.status(400).json({
            success: false,
            message: validationError
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const existingResult = await client.query(
            `SELECT icu_resource_id, bed_id
             FROM public.icu_resources
             WHERE icu_resource_id = $1
             FOR UPDATE`,
            [id]
        );

        if (existingResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "bed_id")) {
            const bedResult = await getActiveBed(client, req.body.bed_id);

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
                    message: "ICU resources can only be assigned to an active bed"
                });
            }
        }

        const values = [];
        const assignments = suppliedFields.map((field) => {
            const value = req.body[field];
            values.push(
                field === "bed_id"
                    ? String(value)
                    : field === "resource_name" || field === "unit"
                        ? value.trim()
                        : value
            );
            return `${field} = $${values.length}`;
        });

        values.push(id);

        const updateResult = await client.query(
            `UPDATE public.icu_resources
             SET ${assignments.join(", ")},
                 updated_at = NOW()
             WHERE icu_resource_id = $${values.length}
             RETURNING icu_resource_id`,
            values
        );

        const resourceResult = await client.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [updateResult.rows[0].icu_resource_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "ICU resource updated successfully",
            data: resourceResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Update ICU resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update ICU resource"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateIcuResourceStatus = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ICU resource ID"
        });
    }

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        !RESOURCE_STATUSES.includes(req.body.resource_status)
    ) {
        return res.status(400).json({
            success: false,
            message: "resource_status must be one of the allowed ICU resource statuses"
        });
    }

    try {
        const updateResult = await pool.query(
            `UPDATE public.icu_resources
             SET resource_status = $1,
                 updated_at = NOW()
             WHERE icu_resource_id = $2
             RETURNING icu_resource_id`,
            [req.body.resource_status, id]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        const resourceResult = await pool.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [updateResult.rows[0].icu_resource_id]
        );

        return res.status(200).json({
            success: true,
            message: "ICU resource status updated successfully",
            data: resourceResult.rows[0]
        });
    } catch (error) {
        console.error("Update ICU resource status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update ICU resource status"
        });
    }
};

const deleteIcuResource = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ICU resource ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const resourceResult = await client.query(
            `SELECT icu_resource_id
             FROM public.icu_resources
             WHERE icu_resource_id = $1
             FOR UPDATE`,
            [id]
        );

        if (resourceResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        const dependencyResult = await client.query(
            `SELECT
                EXISTS (
                    SELECT 1
                    FROM public.resource_allocations
                    WHERE icu_resource_id = $1
                      AND allocation_status = 'ACTIVE'
                ) AS has_active_allocations,
                EXISTS (
                    SELECT 1
                    FROM public.maintenance
                    WHERE icu_resource_id = $1
                      AND maintenance_status IN ('PENDING', 'IN_PROGRESS')
                ) AS has_active_maintenance`,
            [id]
        );
        const dependencies = dependencyResult.rows[0];

        if (dependencies.has_active_allocations || dependencies.has_active_maintenance) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Cannot set this ICU resource out of service while it has active allocations or pending/in-progress maintenance"
            });
        }

        const updateResult = await client.query(
            `UPDATE public.icu_resources
             SET resource_status = 'OUT_OF_SERVICE',
                 updated_at = NOW()
             WHERE icu_resource_id = $1
             RETURNING icu_resource_id`,
            [id]
        );

        const updatedResourceResult = await client.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [updateResult.rows[0].icu_resource_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: "ICU resource marked out of service successfully",
            data: updatedResourceResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Delete ICU resource error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to set ICU resource out of service"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    getAllIcuResources,
    getIcuResourceById,
    createIcuResource,
    updateIcuResource,
    updateIcuResourceStatus,
    deleteIcuResource
};
