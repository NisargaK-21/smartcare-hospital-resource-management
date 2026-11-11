const pool = require("../config/db");

const RESOURCE_ALLOCATION_DETAILS_QUERY = `
    SELECT
        ra.*,
        ir.resource_type,
        ir.resource_name,
        ir.resource_status,
        ir.unit,
        a.admission_status
    FROM public.resource_allocations ra
    JOIN public.icu_resources ir ON ir.icu_resource_id = ra.icu_resource_id
    JOIN public.admissions a ON a.admission_id = ra.admission_id
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
        console.error("Resource allocation rollback error:", error);
    }
};

const getAllResourceAllocations = async (req, res) => {
    try {
        const result = await pool.query(
            `${RESOURCE_ALLOCATION_DETAILS_QUERY}
             ORDER BY ra.allocated_at DESC, ra.allocation_id DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Get resource allocations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch resource allocations"
        });
    }
};

const getResourceAllocationById = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource allocation ID"
        });
    }

    try {
        const result = await pool.query(
            `${RESOURCE_ALLOCATION_DETAILS_QUERY}
             WHERE ra.allocation_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resource allocation not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get resource allocation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch resource allocation"
        });
    }
};

const createResourceAllocation = async (req, res) => {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({
            success: false,
            message: "A JSON request body is required"
        });
    }

    const { icu_resource_id, admission_id, quantity, notes } = req.body;

    if (!isPositiveId(icu_resource_id)) {
        return res.status(400).json({
            success: false,
            message: "icu_resource_id must be a positive integer"
        });
    }

    if (!isPositiveId(admission_id)) {
        return res.status(400).json({
            success: false,
            message: "admission_id must be a positive integer"
        });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: "quantity must be a positive integer"
        });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
        return res.status(400).json({
            success: false,
            message: "notes must be a string"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const admissionResult = await client.query(
            `SELECT admission_id, admission_status
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

        if (admissionResult.rows[0].admission_status !== "ACTIVE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Resource allocations require an active admission"
            });
        }

        const resourceResult = await client.query(
            `SELECT icu_resource_id, quantity, resource_status
             FROM public.icu_resources
             WHERE icu_resource_id = $1
             FOR UPDATE`,
            [String(icu_resource_id)]
        );

        if (resourceResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        const resource = resourceResult.rows[0];

        if (["MAINTENANCE", "OUT_OF_SERVICE"].includes(resource.resource_status)) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: `Cannot allocate a resource with status ${resource.resource_status}`
            });
        }

        const activeQuantityResult = await client.query(
            `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS allocated_quantity
             FROM public.resource_allocations
             WHERE icu_resource_id = $1
               AND allocation_status = 'ACTIVE'`,
            [resource.icu_resource_id]
        );

        const availableQuantity = (
            resource.quantity - activeQuantityResult.rows[0].allocated_quantity
        );

        if (quantity > availableQuantity) {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Requested quantity exceeds the available resource quantity",
                available_quantity: Math.max(availableQuantity, 0)
            });
        }

        const insertedResult = await client.query(
            `INSERT INTO public.resource_allocations
                (icu_resource_id, admission_id, quantity, allocation_status, notes)
             VALUES ($1, $2, $3, 'ACTIVE', $4)
             RETURNING allocation_id`,
            [
                resource.icu_resource_id,
                String(admission_id),
                quantity,
                notes === undefined ? null : notes
            ]
        );

        await client.query(
            `UPDATE public.icu_resources
             SET resource_status = 'IN_USE',
                 updated_at = NOW()
             WHERE icu_resource_id = $1`,
            [resource.icu_resource_id]
        );

        const allocationResult = await client.query(
            `${RESOURCE_ALLOCATION_DETAILS_QUERY}
             WHERE ra.allocation_id = $1`,
            [insertedResult.rows[0].allocation_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Resource allocation created successfully",
            data: allocationResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error("Create resource allocation error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create resource allocation"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const updateActiveResourceAllocation = async (req, res, nextStatus) => {
    const { id } = req.params;

    if (!isPositiveId(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid resource allocation ID"
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const allocationResult = await client.query(
            `SELECT allocation_id, icu_resource_id, allocation_status
             FROM public.resource_allocations
             WHERE allocation_id = $1
             FOR UPDATE`,
            [id]
        );

        if (allocationResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Resource allocation not found"
            });
        }

        const allocation = allocationResult.rows[0];

        if (allocation.allocation_status !== "ACTIVE") {
            await rollback(client);
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message: "Only active resource allocations can be updated"
            });
        }

        const resourceResult = await client.query(
            `SELECT icu_resource_id, resource_status
             FROM public.icu_resources
             WHERE icu_resource_id = $1
             FOR UPDATE`,
            [allocation.icu_resource_id]
        );

        if (resourceResult.rows.length === 0) {
            await rollback(client);
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "ICU resource not found"
            });
        }

        if (nextStatus === "RELEASED") {
            await client.query(
                `UPDATE public.resource_allocations
                 SET allocation_status = 'RELEASED',
                     released_at = NOW(),
                     updated_at = NOW()
                 WHERE allocation_id = $1`,
                [id]
            );
        } else {
            await client.query(
                `UPDATE public.resource_allocations
                 SET allocation_status = 'CANCELLED',
                     updated_at = NOW()
                 WHERE allocation_id = $1`,
                [id]
            );
        }

        const activeQuantityResult = await client.query(
            `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS allocated_quantity
             FROM public.resource_allocations
             WHERE icu_resource_id = $1
               AND allocation_status = 'ACTIVE'`,
            [allocation.icu_resource_id]
        );

        const hasActiveAllocations = activeQuantityResult.rows[0].allocated_quantity > 0;
        const currentResourceStatus = resourceResult.rows[0].resource_status;

        if (!["MAINTENANCE", "OUT_OF_SERVICE"].includes(currentResourceStatus)) {
            await client.query(
                `UPDATE public.icu_resources
                 SET resource_status = $1,
                     updated_at = NOW()
                 WHERE icu_resource_id = $2`,
                [
                    hasActiveAllocations ? "IN_USE" : "AVAILABLE",
                    allocation.icu_resource_id
                ]
            );
        }

        const updatedResult = await client.query(
            `${RESOURCE_ALLOCATION_DETAILS_QUERY}
             WHERE ra.allocation_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            message: `Resource allocation ${nextStatus.toLowerCase()} successfully`,
            data: updatedResult.rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await rollback(client);
        }

        console.error(`Update resource allocation error (${nextStatus}):`, error);

        return res.status(500).json({
            success: false,
            message: `Failed to ${nextStatus.toLowerCase()} resource allocation`
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const releaseResourceAllocation = (req, res) => (
    updateActiveResourceAllocation(req, res, "RELEASED")
);

const cancelResourceAllocation = (req, res) => (
    updateActiveResourceAllocation(req, res, "CANCELLED")
);

module.exports = {
    getAllResourceAllocations,
    getResourceAllocationById,
    createResourceAllocation,
    releaseResourceAllocation,
    cancelResourceAllocation
};
