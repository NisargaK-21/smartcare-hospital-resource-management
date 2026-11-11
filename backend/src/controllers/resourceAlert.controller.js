const pool = require("../config/db");

const getResourceAlerts = async (req, res) => {
    try {
        const [resourcesResult, maintenanceResult, bedsResult] = await Promise.all([
            pool.query(
                `SELECT
                    ir.icu_resource_id,
                    ir.resource_name,
                    ir.resource_type,
                    ir.resource_status,
                    GREATEST(
                        ir.quantity - COALESCE(active_allocations.allocated_quantity, 0),
                        0
                    ) AS available_quantity
                 FROM public.icu_resources ir
                 LEFT JOIN (
                    SELECT icu_resource_id, SUM(quantity) AS allocated_quantity
                    FROM public.resource_allocations
                    WHERE allocation_status = 'ACTIVE'
                    GROUP BY icu_resource_id
                 ) active_allocations
                   ON active_allocations.icu_resource_id = ir.icu_resource_id
                 ORDER BY ir.icu_resource_id`
            ),
            pool.query(
                `SELECT
                    m.maintenance_id,
                    m.bed_id,
                    m.icu_resource_id,
                    m.maintenance_reason,
                    b.bed_number,
                    b.bed_type,
                    ir.resource_name,
                    ir.resource_type
                 FROM public.maintenance m
                 LEFT JOIN public.beds b ON b.bed_id = m.bed_id
                 LEFT JOIN public.icu_resources ir ON ir.icu_resource_id = m.icu_resource_id
                 WHERE m.maintenance_status = 'IN_PROGRESS'
                 ORDER BY m.maintenance_start DESC, m.maintenance_id DESC`
            ),
            pool.query(
                `SELECT
                    b.bed_id,
                    b.bed_number,
                    b.bed_type,
                    b.bed_status,
                    EXISTS (
                        SELECT 1
                        FROM public.admissions a
                        WHERE a.bed_id = b.bed_id
                          AND a.admission_status = 'ACTIVE'
                    ) AS has_active_admission
                 FROM public.beds b
                 WHERE b.is_active = TRUE
                   AND b.bed_type = 'ICU'
                 ORDER BY b.bed_id`
            )
        ]);

        const alerts = [];
        const resources = resourcesResult.rows;
        const beds = bedsResult.rows;

        resources.forEach((resource) => {
            if (resource.resource_status === "MAINTENANCE") {
                alerts.push({
                    alert_type: "ICU_RESOURCE_MAINTENANCE",
                    severity: "WARNING",
                    message: `${resource.resource_name} is under maintenance`,
                    resource_id: String(resource.icu_resource_id),
                    resource_name: resource.resource_name,
                    resource_type: resource.resource_type
                });
            }

            if (resource.resource_status === "OUT_OF_SERVICE") {
                alerts.push({
                    alert_type: "ICU_RESOURCE_OUT_OF_SERVICE",
                    severity: "CRITICAL",
                    message: `${resource.resource_name} is out of service`,
                    resource_id: String(resource.icu_resource_id),
                    resource_name: resource.resource_name,
                    resource_type: resource.resource_type
                });
            }

            if (
                resource.resource_status === "IN_USE" &&
                Number(resource.available_quantity) === 0
            ) {
                alerts.push({
                    alert_type: "ICU_RESOURCE_UNAVAILABLE",
                    severity: "WARNING",
                    message: `${resource.resource_name} has no remaining available quantity`,
                    resource_id: String(resource.icu_resource_id),
                    resource_name: resource.resource_name,
                    resource_type: resource.resource_type,
                    available_quantity: 0
                });
            }
        });

        maintenanceResult.rows.forEach((maintenance) => {
            const alert = {
                alert_type: "ACTIVE_MAINTENANCE",
                severity: "WARNING",
                message: maintenance.bed_id
                    ? `Bed ${maintenance.bed_number} is undergoing maintenance: ${maintenance.maintenance_reason}`
                    : `${maintenance.resource_name} is undergoing maintenance: ${maintenance.maintenance_reason}`,
                maintenance_id: String(maintenance.maintenance_id),
                maintenance_reason: maintenance.maintenance_reason
            };

            if (maintenance.bed_id) {
                alert.bed_id = String(maintenance.bed_id);
                alert.bed_number = maintenance.bed_number;
                alert.bed_type = maintenance.bed_type;
            } else {
                alert.resource_id = String(maintenance.icu_resource_id);
                alert.resource_name = maintenance.resource_name;
                alert.resource_type = maintenance.resource_type;
            }

            alerts.push(alert);
        });

        beds.forEach((bed) => {
            if (bed.bed_status === "MAINTENANCE" || bed.bed_status === "CLEANING") {
                alerts.push({
                    alert_type: "ICU_BED_UNAVAILABLE",
                    severity: "WARNING",
                    message: `ICU bed ${bed.bed_number} is ${bed.bed_status.toLowerCase()}`,
                    bed_id: String(bed.bed_id),
                    bed_number: bed.bed_number,
                    bed_type: bed.bed_type,
                    bed_status: bed.bed_status
                });
            } else if (bed.bed_status === "OCCUPIED" && !bed.has_active_admission) {
                alerts.push({
                    alert_type: "ICU_BED_OCCUPANCY_INCONSISTENCY",
                    severity: "WARNING",
                    message: `ICU bed ${bed.bed_number} is marked occupied without an active admission`,
                    bed_id: String(bed.bed_id),
                    bed_number: bed.bed_number,
                    bed_type: bed.bed_type,
                    bed_status: bed.bed_status
                });
            }
        });

        const availableBeds = beds.filter((bed) => bed.bed_status === "AVAILABLE");

        if (availableBeds.length === 0) {
            alerts.push({
                alert_type: "NO_AVAILABLE_ICU_BEDS",
                severity: "CRITICAL",
                message: "No ICU beds are currently available"
            });
        }

        const totalAvailableResourceQuantity = resources.reduce((total, resource) => {
            if (!["AVAILABLE", "IN_USE"].includes(resource.resource_status)) {
                return total;
            }

            return total + Number(resource.available_quantity);
        }, 0);

        if (totalAvailableResourceQuantity === 0) {
            alerts.push({
                alert_type: "NO_AVAILABLE_ICU_RESOURCES",
                severity: "CRITICAL",
                message: "No ICU resources are currently available"
            });
        }

        return res.status(200).json({
            success: true,
            count: alerts.length,
            data: alerts
        });
    } catch (error) {
        console.error("Get resource alerts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch resource alerts"
        });
    }
};

module.exports = {
    getResourceAlerts
};
