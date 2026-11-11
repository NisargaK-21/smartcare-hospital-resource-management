const icuResourceService = require("../services/icuResource.service");

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

const isPositiveInteger = (value) => (
    (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
);

const validateResource = (body, isUpdate = false) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "A JSON request body is required";
    }

    if (!isUpdate || body.bed_id !== undefined) {
        if (!isPositiveInteger(body.bed_id)) {
            return "bed_id must be a positive integer";
        }
    }
    if (!isUpdate || body.resource_type !== undefined) {
        if (!RESOURCE_TYPES.includes(body.resource_type)) {
            return `resource_type must be one of: ${RESOURCE_TYPES.join(", ")}`;
        }
    }
    if (!isUpdate || body.resource_name !== undefined) {
        if (
            typeof body.resource_name !== "string" ||
            !body.resource_name.trim() ||
            body.resource_name.length > 100
        ) {
            return "resource_name is required and must be at most 100 characters";
        }
    }
    if (!isUpdate || body.quantity !== undefined) {
        if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity <= 0)) {
            return "quantity must be a positive integer";
        }
    }
    if (body.unit !== undefined && (
        typeof body.unit !== "string" ||
        !body.unit.trim() ||
        body.unit.length > 20
    )) {
        return "unit must be a non-empty string of at most 20 characters";
    }
    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== "string") {
        return "notes must be a string";
    }
    if (body.resource_status !== undefined && !RESOURCE_STATUSES.includes(body.resource_status)) {
        return `resource_status must be one of: ${RESOURCE_STATUSES.join(", ")}`;
    }

    return null;
};

const getAllIcuResources = async (req, res) => {
    try {
        const resources = await icuResourceService.getAllIcuResources();
        return res.status(200).json({
            success: true,
            count: resources.length,
            data: resources
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
    const id = Number(req.params.id);
    if (!isPositiveInteger(id)) {
        return res.status(400).json({ success: false, message: "Invalid ICU resource ID" });
    }

    try {
        const resource = await icuResourceService.getIcuResourceById(id);
        if (!resource) {
            return res.status(404).json({ success: false, message: "ICU resource not found" });
        }
        return res.status(200).json({ success: true, data: resource });
    } catch (error) {
        console.error("Get ICU resource error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch ICU resource"
        });
    }
};

const createIcuResource = async (req, res) => {
    const validationError = validateResource(req.body);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }
    if (req.body.resource_status !== undefined && req.body.resource_status !== "AVAILABLE") {
        return res.status(400).json({
            success: false,
            message: "New ICU resources must start as AVAILABLE"
        });
    }

    try {
        const resource = await icuResourceService.createIcuResource({
            bed_id: Number(req.body.bed_id),
            resource_type: req.body.resource_type,
            resource_name: req.body.resource_name.trim(),
            quantity: req.body.quantity === undefined ? 1 : req.body.quantity,
            unit: req.body.unit === undefined ? "UNIT" : req.body.unit.trim(),
            notes: req.body.notes === undefined ? null : req.body.notes
        });
        return res.status(201).json({
            success: true,
            message: "ICU resource created successfully",
            data: resource
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("Create ICU resource error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create ICU resource"
        });
    }
};

const updateIcuResource = async (req, res) => {
    const id = Number(req.params.id);
    if (!isPositiveInteger(id)) {
        return res.status(400).json({ success: false, message: "Invalid ICU resource ID" });
    }

    const validationError = validateResource(req.body, true);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
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
    if (!allowedFields.some((field) => req.body[field] !== undefined)) {
        return res.status(400).json({
            success: false,
            message: "Provide at least one valid field to update"
        });
    }

    const resourceData = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            resourceData[field] = field === "bed_id"
                ? Number(req.body[field])
                : field === "resource_name" || field === "unit"
                    ? req.body[field].trim()
                    : req.body[field];
        }
    }

    try {
        const resource = await icuResourceService.updateIcuResource(id, resourceData);
        if (!resource) {
            return res.status(404).json({ success: false, message: "ICU resource not found" });
        }
        return res.status(200).json({
            success: true,
            message: "ICU resource updated successfully",
            data: resource
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("Update ICU resource error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update ICU resource"
        });
    }
};

module.exports = {
    getAllIcuResources,
    getIcuResourceById,
    createIcuResource,
    updateIcuResource
};
