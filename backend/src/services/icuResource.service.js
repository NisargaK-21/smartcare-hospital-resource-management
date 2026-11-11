const pool = require("../config/db");

const ICU_RESOURCE_DETAILS_QUERY = `
    SELECT
        ir.*,
        b.bed_number,
        b.bed_type AS bed_bed_type,
        b.bed_status,
        r.room_number,
        w.ward_name
    FROM public.icu_resources ir
    JOIN public.beds b ON b.bed_id = ir.bed_id
    JOIN public.rooms r ON r.room_id = b.room_id
    JOIN public.wards w ON w.ward_id = r.ward_id
`;

const getAllIcuResources = async () => {
    const result = await pool.query(
        `${ICU_RESOURCE_DETAILS_QUERY}
         ORDER BY ir.icu_resource_id`
    );
    return result.rows;
};

const getIcuResourceById = async (id) => {
    const result = await pool.query(
        `${ICU_RESOURCE_DETAILS_QUERY}
         WHERE ir.icu_resource_id = $1`,
        [id]
    );
    return result.rows[0];
};

const createIcuResource = async (resource) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        const bedResult = await client.query(
            `SELECT bed_id
             FROM public.beds
             WHERE bed_id = $1
               AND bed_type = 'ICU'
               AND is_active = TRUE
             FOR UPDATE`,
            [resource.bed_id]
        );

        if (bedResult.rows.length === 0) {
            const error = new Error("Select an active ICU bed");
            error.statusCode = 409;
            throw error;
        }

        const insertedResult = await client.query(
            `INSERT INTO public.icu_resources
                (bed_id, resource_type, resource_name, resource_status,
                 quantity, unit, notes)
             VALUES ($1, $2, $3, 'AVAILABLE', $4, $5, $6)
             RETURNING icu_resource_id`,
            [
                resource.bed_id,
                resource.resource_type,
                resource.resource_name,
                resource.quantity,
                resource.unit,
                resource.notes
            ]
        );

        const result = await client.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [insertedResult.rows[0].icu_resource_id]
        );

        await client.query("COMMIT");
        transactionStarted = false;
        return result.rows[0];
    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }
        throw error;
    } finally {
        client.release();
    }
};

const updateIcuResource = async (id, resource) => {
    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        const currentResult = await client.query(
            `SELECT *
             FROM public.icu_resources
             WHERE icu_resource_id = $1
             FOR UPDATE`,
            [id]
        );

        if (currentResult.rows.length === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;
            return undefined;
        }

        const current = currentResult.rows[0];

        if (resource.bed_id !== undefined) {
            const bedResult = await client.query(
                `SELECT bed_id
                 FROM public.beds
                 WHERE bed_id = $1
                   AND bed_type = 'ICU'
                   AND is_active = TRUE
                 FOR UPDATE`,
                [resource.bed_id]
            );

            if (bedResult.rows.length === 0) {
                const error = new Error("Select an active ICU bed");
                error.statusCode = 409;
                throw error;
            }
        }

        if (
            resource.resource_status !== undefined &&
            resource.resource_status !== current.resource_status
        ) {
            if (
                current.resource_status === "MAINTENANCE" ||
                ["IN_USE", "MAINTENANCE"].includes(resource.resource_status)
            ) {
                const error = new Error(
                    "Use the allocation or maintenance workflow to change this resource status"
                );
                error.statusCode = 409;
                throw error;
            }

            const activeAllocations = await client.query(
                `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS allocated_quantity
                 FROM public.resource_allocations
                 WHERE icu_resource_id = $1
                   AND allocation_status = 'ACTIVE'`,
                [id]
            );

            if (activeAllocations.rows[0].allocated_quantity > 0) {
                const error = new Error(
                    "Resource status cannot be changed while it has active allocations"
                );
                error.statusCode = 409;
                throw error;
            }
        }

        const allowedFields = [
            "bed_id",
            "resource_type",
            "resource_name",
            "resource_status",
            "quantity",
            "unit",
            "notes"
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (resource[field] !== undefined) {
                values.push(resource[field]);
                updates.push(`${field} = $${values.length}`);
            }
        }

        if (updates.length === 0) {
            const error = new Error("No valid fields provided for update");
            error.statusCode = 400;
            throw error;
        }

        values.push(id);
        const updated = await client.query(
            `UPDATE public.icu_resources
             SET ${updates.join(", ")},
                 updated_at = NOW()
             WHERE icu_resource_id = $${values.length}`,
            values
        );

        if (updated.rowCount !== 1) {
            throw new Error("ICU resource was not updated");
        }

        const result = await client.query(
            `${ICU_RESOURCE_DETAILS_QUERY}
             WHERE ir.icu_resource_id = $1`,
            [id]
        );

        await client.query("COMMIT");
        transactionStarted = false;
        return result.rows[0];
    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK");
        }
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getAllIcuResources,
    getIcuResourceById,
    createIcuResource,
    updateIcuResource
};
